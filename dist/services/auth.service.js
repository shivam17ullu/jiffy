// src/services/auth.service.ts
import { OtpLogin, User, RefreshToken, Role, Store, BankDetail, SellerProfile, Document, UserRole, } from "../model/relations.js";
import jwt from "jsonwebtoken";
import { addMinutes, isBefore } from "date-fns";
import { sendOtpFast2SMS } from "../utils/fast2sms.js";
import { generateOtp } from "../utils/generateOtp.js";
import bcrypt from "bcrypt";
import { jiffy } from "../config/sequelize.js";
import VerifiedSellers from "../model/seller/verified_sellers.js";
const ACCESS_TOKEN_EXP = "15m";
const REFRESH_TOKEN_EXP_MIN = 60 * 24 * 7; // 7 days
export default class AuthService {
    static async generateOtp(phone_number) {
        const otp = await generateOtp();
        const expires_at = addMinutes(new Date(), 5);
        await OtpLogin.create({ phone_number, otp, expires_at });
        // Send via Fast2SMS
        await sendOtpFast2SMS(phone_number, otp);
        return otp;
    }
    static async verifyOtp(phone_number, otp, deviceInfo, ip) {
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
        // find or create user
        let user = await User.findOne({ where: { phone_number } });
        if (!user) {
            user = await User.create({ phone_number });
            // Assign default "buyer" role
            const buyerRole = await Role.findOne({ where: { name: "buyer" } });
            if (buyerRole)
                await user.addRole(buyerRole);
        }
        // issue tokens
        const accessToken = this.generateAccessToken(user.id);
        const refreshToken = await this.generateRefreshToken(user.id, deviceInfo, ip);
        return { user, accessToken, refreshToken };
    }
    static generateAccessToken(userId) {
        return jwt.sign({ userId }, process.env.TOKEN, {
            expiresIn: ACCESS_TOKEN_EXP,
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
        const accessToken = this.generateAccessToken(payload.userId);
        return { accessToken };
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
        const { phone_number, email, password } = payload;
        const existingUser = await OtpLogin.findOne({
            where: { phone_number: phone_number },
        });
        const otp = await generateOtp();
        const expires_at = addMinutes(new Date(), 5);
        if (existingUser) {
            await OtpLogin.update({ otp }, // values to update
            { where: { phone_number } } // condition
            );
        }
        else {
            await OtpLogin.create({ phone_number, otp, expires_at });
        }
        const user = await User.create({
            phone_number: phone_number,
            email: email,
            password: await bcrypt.hash(password, 12),
            is_active: false,
        });
        // Send via Fast2SMS
        await sendOtpFast2SMS(phone_number, otp);
        const sellerRole = await Role.findOne({ where: { name: "seller" } });
        if (sellerRole) {
            await UserRole.create({ user_id: user.id, role_id: sellerRole.id });
        }
        else {
            throw new Error("Error Occurred.");
        }
        return { user, otp };
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
        // Assign seller role
        const sellerRole = await Role.findOne({ where: { name: "seller" } });
        if (sellerRole) {
            await UserRole.create({
                user_id: Number(user.id),
                role_id: Number(sellerRole.id),
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
            const seller = await SellerProfile.create({
                userId: Number(payload.userId),
                businessName: payload.store.storeName,
                phone: payload.store.phone,
                zipCode: payload.store.pincode,
                address: payload.store.storeAddress,
            }, { transaction });
            console.log(seller);
            const verified = await VerifiedSellers.create({
                sellerId: seller.id,
                is_active: false,
            });
            const store = await Store.create({
                sellerId: seller.id,
                storeName: payload.store.storeName,
                storeAddress: payload.store.storeAddress,
                pincode: payload.store.pincode,
            }, { transaction });
            console.log(store);
            const bankDetails = await BankDetail.create({
                sellerId: seller.id,
                accountHolderName: payload.bankDetails.accountHolderName,
                accountNumber: payload.bankDetails.accountNumber,
                ifscCode: payload.bankDetails.ifscCode,
                termsAccepted: payload.bankDetails.termsAccepted ?? false,
            }, { transaction });
            console.log(bankDetails);
            const documents = await Document.create({
                sellerId: seller.id,
                aadhaarUrl: payload.documents.aadhaarUrl,
                panUrl: payload.documents.panUrl,
                gstUrl: payload.documents.gstUrl,
            }, { transaction });
            console.log(documents);
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
            throw new Error(error);
        }
    }
}
