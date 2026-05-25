// src/services/auth.service.ts
import bcrypt from "bcryptjs";
import { addMinutes, isBefore } from "date-fns";
import jwt from "jsonwebtoken";
import { Op } from "sequelize";
import { jiffy } from "../config/sequelize.js";
import { BankDetail, Document, OtpLogin, RefreshToken, Role, SellerProfile, Store, User, UserRole, } from "../model/relations.js";
import VerifiedSellers from "../model/seller/verified_sellers.js";
import { ApiError } from "../utils/ApiError.js";
import { sendOtpFast2SMS } from "../utils/fast2sms.js";
import { generateOtp } from "../utils/generateOtp.js";
import { uploadBase64ToS3 } from "../utils/s3Upload.js";
import { assertSellerCanAccess, assertSellerCanAccessByPhone, userHasSellerRole, } from "./sellerAccess.service.js";
const ACCESS_TOKEN_EXP = "1d";
const REFRESH_TOKEN_EXP_MIN = 60 * 24 * 7; // 7 days
export default class AuthService {
    static async generateOtp(phone_number, role) {
        if (role === 'seller') {
            const user = await User.findOne({ where: { phone_number } });
            if (!user) {
                throw ApiError.notFound("Mobile number is not registered. Please sign up first.", "phone_number");
            }
        }
        await assertSellerCanAccessByPhone(phone_number);
        const otp = await generateOtp();
        const expires_at = addMinutes(new Date(), 5);
        await OtpLogin.create({ phone_number, otp, expires_at });
        // Send via Fast2SMS
        // await sendOtpFast2SMS(phone_number, otp);
        return otp;
    }
    static async verifyOtp(phone_number, otp, deviceInfo, ip, role) {
        const otpRecord = await OtpLogin.findOne({
            where: { phone_number, otp, is_used: false },
            order: [["created_at", "DESC"]],
        });
        if (!otpRecord)
            throw new Error("Invalid OTP");
        if (isBefore(otpRecord.expires_at, new Date()))
            throw new Error("OTP expired");
        // mark OTP as used
        otpRecord.is_used = true;
        await otpRecord.save();
        let user = await User.findOne({
            where: { phone_number },
            include: [Role, SellerProfile],
        });
        if (!user) {
            if (role === 'seller') {
                throw ApiError.notFound("Mobile number is not registered. Please sign up first.", "phone_number");
            }
            // Auto-register buyer if they don't exist
            user = await User.create({ phone_number, is_active: true });
            const [buyerRole] = await Role.findOrCreate({
                where: { name: "buyer" },
                defaults: { name: "buyer" },
            });
            await UserRole.findOrCreate({
                where: { user_id: Number(user.id), role_id: Number(buyerRole.id) },
                defaults: { user_id: Number(user.id), role_id: Number(buyerRole.id) },
            });
            // Refetch user with associations to match the expected format
            user = await User.findOne({
                where: { phone_number },
                include: [Role, SellerProfile],
            });
        }
        if (!user) {
            throw new Error("Failed to retrieve or create user");
        }
        let onboardingCompleted = true;
        if (userHasSellerRole(user)) {
            const hasProfile = !!user.SellerProfile;
            if (hasProfile) {
                await assertSellerCanAccess(user.id);
            }
            else {
                onboardingCompleted = false;
                // If a seller does not have a profile, they have not completed onboarding.
                // We do not activate them here. Activation is handled via verifySellerOtp.
            }
        }
        const accessToken = this.generateAccessToken(user.id);
        const refreshToken = await this.generateRefreshToken(user.id, deviceInfo, ip);
        return { user, accessToken, refreshToken, onboardingCompleted };
    }
    static generateAccessToken(userId, expiresIn = ACCESS_TOKEN_EXP) {
        return jwt.sign({ userId }, process.env.TOKEN, {
            expiresIn: expiresIn,
        });
    }
    static async generateRefreshToken(userId, deviceInfo, ip) {
        const token = jwt.sign({ userId }, process.env.TOKEN, {
            expiresIn: `${REFRESH_TOKEN_EXP_MIN}m`,
        });
        const expires_at = addMinutes(new Date(), REFRESH_TOKEN_EXP_MIN);
        await RefreshToken.create({
            user_id: userId,
            token,
            device_info: deviceInfo,
            ip_address: ip,
            expires_at,
        });
        return token;
    }
    static async refreshToken(oldToken) {
        const stored = await RefreshToken.findOne({
            where: { token: oldToken, is_revoked: false },
        });
        if (!stored)
            throw new Error("Invalid refresh token");
        if (isBefore(stored.expires_at, new Date()))
            throw new Error("Refresh token expired");
        const payload = jwt.verify(oldToken, process.env.TOKEN);
        const user = await User.findByPk(payload.userId, { include: [Role] });
        if (user && userHasSellerRole(user)) {
            await assertSellerCanAccess(payload.userId);
        }
        const accessToken = this.generateAccessToken(payload.userId);
        const refreshToken = await this.generateRefreshToken(payload.userId);
        return { accessToken, refreshToken };
    }
    static async revokeRefreshToken(token) {
        const stored = await RefreshToken.findOne({ where: { token } });
        if (stored) {
            stored.is_revoked = true;
            await stored.save();
        }
        return true;
    }
    static async registerSeller(payload) {
        const { phone_number, email } = payload;
        const existingAccounts = await User.findAll({
            where: {
                [Op.or]: [{ phone_number }, { email }],
            },
            include: [SellerProfile],
        });
        let userToUse = null;
        if (existingAccounts.length > 0) {
            for (const account of existingAccounts) {
                const hasProfile = !!account.SellerProfile;
                if (hasProfile) {
                    if (account.phone_number === phone_number) {
                        throw ApiError.conflict("Phone number is already registered as a seller", "phone_number");
                    }
                    throw ApiError.conflict("Email is already registered as a seller", "email");
                }
            }
            if (existingAccounts.length === 1) {
                userToUse = existingAccounts[0];
            }
            else {
                throw ApiError.conflict("Phone number and Email belong to different accounts", "email");
            }
        }
        const [sellerRole] = await Role.findOrCreate({
            where: { name: "seller" },
            defaults: { name: "seller" },
        });
        const otp = await generateOtp();
        const expires_at = addMinutes(new Date(), 5);
        const transaction = await jiffy.transaction();
        try {
            if (!userToUse) {
                userToUse = await User.create({
                    phone_number,
                    email,
                    is_active: false,
                }, { transaction });
            }
            else {
                if (userToUse.email !== email || userToUse.phone_number !== phone_number) {
                    userToUse.email = email;
                    userToUse.phone_number = phone_number;
                    await userToUse.save({ transaction });
                }
            }
            const existingOtp = await OtpLogin.findOne({
                where: { phone_number },
                transaction,
            });
            if (existingOtp) {
                await existingOtp.update({ otp, expires_at, is_used: false }, { transaction });
            }
            else {
                await OtpLogin.create({ phone_number, otp, expires_at }, { transaction });
            }
            await UserRole.findOrCreate({
                where: { user_id: userToUse.id, role_id: sellerRole.id },
                defaults: { user_id: userToUse.id, role_id: sellerRole.id },
                transaction,
            });
            await sendOtpFast2SMS(phone_number, otp);
            await transaction.commit();
            return { user: userToUse, otp };
        }
        catch (error) {
            await transaction.rollback();
            throw error;
        }
    }
    static async verifySellerOtp(phone_number, otp, deviceInfo, ip) {
        // Find latest valid OTP
        const otpRecord = await OtpLogin.findOne({
            where: { phone_number, otp, is_used: false },
            order: [["created_at", "DESC"]],
        });
        if (!otpRecord)
            throw new Error("Invalid OTP");
        if (isBefore(otpRecord.expires_at, new Date())) {
            throw new Error("OTP expired");
        }
        // Mark OTP as used
        otpRecord.is_used = true;
        await otpRecord.save();
        // Fetch the user
        const user = await User.findOne({
            where: { phone_number },
        });
        if (!user) {
            throw new Error("User not found for this phone number");
        }
        // Activate user
        await user.update({ is_active: true });
        const sellerRole = await Role.findOne({ where: { name: "seller" } });
        if (sellerRole) {
            await UserRole.findOrCreate({
                where: {
                    user_id: Number(user.id),
                    role_id: Number(sellerRole.id),
                },
                defaults: {
                    user_id: Number(user.id),
                    role_id: Number(sellerRole.id),
                },
            });
        }
        return {
            success: true,
            message: "Seller verified successfully",
            user,
        };
    }
    static async onboardSeller(payload) {
        const transaction = await jiffy.transaction();
        try {
            const storePayload = payload.store;
            const bankPayload = payload.bankDetails;
            const docsPayload = payload.documents;
            const seller = await SellerProfile.create({
                userId: Number(payload.userId),
                businessName: storePayload.storeName || storePayload.store_name,
                phone: storePayload.phone,
                zipCode: storePayload.pincode,
                address: storePayload.storeAddress || storePayload.store_address,
            }, { transaction });
            const verified = await VerifiedSellers.create({
                sellerId: seller.id,
                is_active: false,
            }, { transaction });
            const store = await Store.create({
                sellerId: seller.id,
                storeName: storePayload.storeName || storePayload.store_name,
                storeAddress: storePayload.storeAddress || storePayload.store_address,
                pincode: storePayload.pincode,
            }, { transaction });
            const bankDetails = await BankDetail.create({
                sellerId: seller.id,
                accountHolderName: bankPayload.accountHolderName || bankPayload.account_holder_name,
                accountNumber: bankPayload.accountNumber || bankPayload.account_number,
                ifscCode: bankPayload.ifscCode || bankPayload.ifsc_code,
                termsAccepted: bankPayload.termsAccepted ?? bankPayload.terms_accepted ?? false,
            }, { transaction });
            let aadhaarFinal = docsPayload.aadhaarUrl || docsPayload.aadhaar_url;
            if (aadhaarFinal?.startsWith('data:'))
                aadhaarFinal = await uploadBase64ToS3(aadhaarFinal, 'documents');
            let panFinal = docsPayload.panUrl || docsPayload.pan_url;
            if (panFinal?.startsWith('data:'))
                panFinal = await uploadBase64ToS3(panFinal, 'documents');
            let gstFinal = docsPayload.gstUrl || docsPayload.gst_url;
            if (gstFinal?.startsWith('data:'))
                gstFinal = await uploadBase64ToS3(gstFinal, 'documents');
            let storeDocFinal = docsPayload.storeDocUrl || docsPayload.store_doc || docsPayload.store_doc_url;
            if (storeDocFinal?.startsWith('data:'))
                storeDocFinal = await uploadBase64ToS3(storeDocFinal, 'documents');
            let storeImageFinal = docsPayload.storeImage || docsPayload.storeImageUrl || docsPayload.store_image || docsPayload.store_image_url || storePayload.storeImage || storePayload.storeImageUrl || storePayload.store_image || storePayload.store_image_url;
            if (storeImageFinal?.startsWith('data:'))
                storeImageFinal = await uploadBase64ToS3(storeImageFinal, 'documents');
            const documents = await Document.create({
                sellerId: seller.id,
                aadhaarUrl: aadhaarFinal,
                panUrl: panFinal,
                gstUrl: gstFinal,
                storeDocUrl: storeDocFinal,
                storeImageUrl: storeImageFinal,
            }, { transaction });
            console.log(verified);
            await transaction.commit();
            return {
                message: "Seller onboarding completed successfully",
                data: {
                    seller,
                    store,
                    bankDetails,
                    documents,
                },
            };
        }
        catch (error) {
            await transaction.rollback();
            const message = error instanceof Error
                ? error.message
                : "Seller onboarding failed. Please check your details and try again";
            throw new Error(message);
        }
    }
    static async adminLogin(email, password, deviceInfo, ip) {
        console.time("1. DB Query: User.findOne");
        const user = await User.findOne({
            where: { email },
            include: [Role],
        });
        console.timeEnd("1. DB Query: User.findOne");
        if (!user) {
            throw ApiError.unauthorized("Invalid credentials");
        }
        if (!user.is_active) {
            throw ApiError.forbidden("Account is disabled");
        }
        // Verify role
        const hasAdminRole = user.Roles && user.Roles.some((r) => r.name === "admin");
        if (!hasAdminRole) {
            throw ApiError.forbidden("Access denied. Admin role required.");
        }
        // Check password
        if (!user.password) {
            throw ApiError.unauthorized("Invalid credentials");
        }
        console.time("2. Bcrypt Compare");
        const isPasswordValid = await bcrypt.compare(password, user.password);
        console.timeEnd("2. Bcrypt Compare");
        if (!isPasswordValid) {
            throw ApiError.unauthorized("Invalid credentials");
        }
        const accessToken = this.generateAccessToken(user.id, "30m");
        console.time("3. Generate Refresh Token");
        const refreshToken = await this.generateRefreshToken(user.id, deviceInfo, ip);
        console.timeEnd("3. Generate Refresh Token");
        return { adminId: user.id, accessToken, refreshToken };
    }
}
