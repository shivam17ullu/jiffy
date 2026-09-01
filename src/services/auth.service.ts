// src/services/auth.service.ts
import bcrypt from "bcryptjs";
import { addMinutes, isBefore } from "date-fns";
import jwt from "jsonwebtoken";
import { Op, Transaction } from "sequelize";
import { jiffy } from "../config/sequelize.js";
import {
	BankDetail,
	Document,
	OtpLogin,
	RefreshToken,
	Role,
	SellerProfile,
	Store,
	User,
	UserRole,
	UserDevice,
} from "../model/relations.js";
import VerifiedSellers from "../model/seller/verified_sellers.js";
import { SellerFirstStepBody, SellerOnboardingBody } from "../types/auth.js";
import { ApiError } from "../utils/ApiError.js";
import { sendOtpFast2SMS } from "../utils/fast2sms.js";
import { generateOtp } from "../utils/generateOtp.js";
import { uploadBase64ToS3 } from "../utils/s3Upload.js";
import { sendSellerOnboardEmail, sendSellerWelcomeEmail, sendEmailVerificationOTP } from "../utils/mailer.js";
import EmailOtp from "../model/auth/emailOtp.js";
import {
	assertSellerCanAccess,
	assertSellerCanAccessByPhone,
	userHasSellerRole,
} from "./sellerAccess.service.js";

const ACCESS_TOKEN_EXP = "1d";
const REFRESH_TOKEN_EXP_MIN = 60 * 24 * 7; // 7 days

export default class AuthService {

	static async generateEmailOtp(email: string) {
		const user = await User.findOne({ where: { email } });
		if (user) {
			throw ApiError.conflict("Email is already in use", "email");
		}
		const otp = await generateOtp();
		const expires_at = addMinutes(new Date(), 5);

		await EmailOtp.create({ email, otp, expires_at });
		await sendEmailVerificationOTP(email, otp);
		return otp;
	}

	static async verifyEmailOtp(email: string, otp: string) {
		const otpRecord = await EmailOtp.findOne({
			where: { email, otp, is_used: false },
			order: [["created_at", "DESC"]],
		});

		if (!otpRecord) throw new Error("Invalid OTP");
		if (isBefore(otpRecord.expires_at, new Date())) throw new Error("OTP expired");

		otpRecord.is_used = true;
		await otpRecord.save();

		const user = await User.findOne({ where: { email } });
		if (user) {
			user.is_email_verified = true;
			await user.save();
		}

		return { success: true, message: "Email verified successfully" };
	}

	static async generateOtp(phone_number: string, role?: string) {
		if (role === 'seller') {
			const user = await User.findOne({ where: { phone_number } });
			if (!user) {
				throw ApiError.notFound(
					"Mobile number is not registered. Please sign up first.",
					"phone_number"
				);
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

	static async verifyOtp(
		phone_number: string,
		otp: string,
		deviceInfo?: string,
		ip?: string,
		role?: string
	) {
		const otpRecord = await OtpLogin.findOne({
			where: { phone_number, otp, is_used: false },
			order: [["created_at", "DESC"]],
		});

		if (!otpRecord) throw new Error("Invalid OTP");
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
				throw ApiError.notFound(
					"Mobile number is not registered. Please sign up first.",
					"phone_number"
				);
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
		if (userHasSellerRole(user as { Roles?: { name: string }[] })) {
			const hasProfile = !!(user as any).SellerProfile;
			if (hasProfile) {
				await assertSellerCanAccess(user.id);
			} else {
				onboardingCompleted = false;
				// If a seller does not have a profile, they have not completed onboarding.
				// We do not activate them here. Activation is handled via verifySellerOtp.
			}
		}

		const accessToken = this.generateAccessToken(user.id);
		const refreshToken = await this.generateRefreshToken(
			user.id,
			deviceInfo,
			ip
		);

		return { user, accessToken, refreshToken, onboardingCompleted };
	}

	static generateAccessToken(userId: number, expiresIn: string = ACCESS_TOKEN_EXP) {
		return jwt.sign({ userId }, process.env.TOKEN as string, {
			expiresIn: expiresIn as any,
		});
	}

	static async generateRefreshToken(
		userId: number,
		deviceInfo?: string,
		ip?: string
	) {
		const token = jwt.sign({ userId }, process.env.TOKEN as string, {
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

	static async refreshToken(oldToken: string) {
		const stored = await RefreshToken.findOne({
			where: { token: oldToken, is_revoked: false },
		});

		if (!stored) throw new Error("Invalid refresh token");

		if (isBefore((stored as RefreshToken).expires_at, new Date()))
			throw new Error("Refresh token expired");

		const payload = jwt.verify(oldToken, process.env.TOKEN as string) as {
			userId: number;
		};

		const user = await User.findByPk(payload.userId, { include: [Role] });
		if (user && userHasSellerRole(user as { Roles?: { name: string }[] })) {
			await assertSellerCanAccess(payload.userId);
		}

		const accessToken = this.generateAccessToken(payload.userId);
		const refreshToken = await this.generateRefreshToken(
			payload.userId
		);

		return { accessToken, refreshToken };
	}

	static async refreshSellerToken(
		oldToken: string,
		deviceInfo?: string,
		ip?: string
	) {
		const stored = await RefreshToken.findOne({
			where: { token: oldToken, is_revoked: false },
		});

		if (!stored) throw new Error("Invalid refresh token");

		if (isBefore((stored as RefreshToken).expires_at, new Date()))
			throw new Error("Refresh token expired");

		let payload: { userId: number };
		try {
			payload = jwt.verify(oldToken, process.env.TOKEN as string) as {
				userId: number;
			};
		} catch {
			throw new Error("Invalid refresh token");
		}

		const user = await User.findByPk(payload.userId, {
			include: [
				Role,
				{
					model: SellerProfile,
					include: [Store, Document, BankDetail, VerifiedSellers],
				},
			],
		});

		if (!user) {
			throw ApiError.notFound("User account not found");
		}

		if (!userHasSellerRole(user as { Roles?: { name: string }[] })) {
			throw ApiError.forbidden("Access denied. Seller role required.");
		}

		await assertSellerCanAccess(payload.userId);

		// Revoke old refresh token for security/rotation
		(stored as RefreshToken).is_revoked = true;
		await stored.save();

		const accessToken = this.generateAccessToken(payload.userId);
		const refreshToken = await this.generateRefreshToken(
			payload.userId,
			deviceInfo,
			ip
		);

		return { accessToken, refreshToken, user };
	}

	static async revokeRefreshToken(token: string) {
		const stored = await RefreshToken.findOne({ where: { token } });

		if (stored) {
			(stored as RefreshToken).is_revoked = true;
			await stored.save();
		}

		return true;
	}

	static async registerSeller(payload: SellerFirstStepBody) {
		const { phone_number } = payload;

		const existingAccounts = await User.findAll({
			where: {
				phone_number
			},
			include: [SellerProfile],
		});

		let userToUse: any = null;

		if (existingAccounts.length > 0) {
			for (const account of existingAccounts) {
				const hasProfile = !!(account as any).SellerProfile;
				if (hasProfile) {
					if (account.phone_number === phone_number) {
						throw ApiError.conflict(
							"Phone number is already registered as a seller",
							"phone_number"
						);
					}
				}
			}

			if (existingAccounts.length === 1) {
				userToUse = existingAccounts[0];
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
				userToUse = await User.create(
					{
						phone_number,
						is_active: false,
					},
					{ transaction }
				);
			} else {
				if (userToUse.phone_number !== phone_number) {
					userToUse.phone_number = phone_number;
					await userToUse.save({ transaction });
				}
			}

			const existingOtp = await OtpLogin.findOne({
				where: { phone_number },
				transaction,
			});

			if (existingOtp) {
				await existingOtp.update(
					{ otp, expires_at, is_used: false },
					{ transaction }
				);
			} else {
				await OtpLogin.create(
					{ phone_number, otp, expires_at },
					{ transaction }
				);
			}

			await UserRole.findOrCreate({
				where: { user_id: userToUse.id, role_id: sellerRole.id },
				defaults: { user_id: userToUse.id, role_id: sellerRole.id },
				transaction,
			});

			await sendOtpFast2SMS(phone_number, otp);

			await transaction.commit();
			return { user: userToUse, otp };
		} catch (error: unknown) {
			await transaction.rollback();
			throw error;
		}
	}

	static async verifySellerOtp(
		phone_number: string,
		otp: string,
		deviceInfo?: string,
		ip?: string
	) {
		// Find latest valid OTP
		const otpRecord = await OtpLogin.findOne({
			where: { phone_number, otp, is_used: false },
			order: [["created_at", "DESC"]],
		});

		if (!otpRecord) throw new Error("Invalid OTP");
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


	static async onboardSeller(payload: SellerOnboardingBody) {
		const transaction: Transaction = await jiffy.transaction();
		try {
			const storePayload = payload.store as any;
			const bankPayload = payload.bankDetails as any;
			const docsPayload = payload.documents as any;

			const seller = await SellerProfile.create(
				{
					userId: Number(payload.userId),
					businessName: storePayload.storeName || storePayload.store_name,
					phone: storePayload.phone,
					zipCode: storePayload.pincode,
					address: storePayload.storeAddress || storePayload.store_address,
					city: storePayload.city,
					state: storePayload.state,
				},
				{ transaction }
			);

			const verified = await VerifiedSellers.create({
				sellerId: seller.id!,
				is_active: false,
				status: "pending",
			}, { transaction });

			const store = await Store.create(
				{
					sellerId: seller.id,
					storeName: storePayload.storeName || storePayload.store_name,
					storeAddress: storePayload.storeAddress || storePayload.store_address,
					pincode: storePayload.pincode,
					storeCategory: storePayload.storeCategory || storePayload.store_category,
					latitude: storePayload.latitude,
					longitude: storePayload.longitude,
					openingDays: storePayload.openingDays || storePayload.opening_days || storePayload.storeOpeningDays || storePayload.store_opening_days || (payload as any).openingDays || (payload as any).opening_days || (payload as any).storeOpeningDays || (payload as any).store_opening_days || [],
					openingTime: storePayload.openingTime || storePayload.opening_time || storePayload.storeOpeningTime || storePayload.store_opening_time || (payload as any).openingTime || (payload as any).opening_time || (payload as any).storeOpeningTime || (payload as any).store_opening_time || null,
					closingTime: storePayload.closingTime || storePayload.closing_time || storePayload.storeClosingTime || storePayload.store_closing_time || (payload as any).closingTime || (payload as any).closing_time || (payload as any).storeClosingTime || (payload as any).store_closing_time || null,
				},
				{ transaction }
			);

			const bankDetails = await BankDetail.create(
				{
					sellerId: seller.id,
					accountHolderName: bankPayload.accountHolderName || bankPayload.account_holder_name,
					accountNumber: bankPayload.accountNumber || bankPayload.account_number,
					ifscCode: bankPayload.ifscCode || bankPayload.ifsc_code,
					termsAccepted: bankPayload.termsAccepted ?? bankPayload.terms_accepted ?? false,
				},
				{ transaction }
			);

			let aadhaarFinal = docsPayload.aadhaarUrl || docsPayload.aadhaar_url;
			if (aadhaarFinal?.startsWith('data:')) aadhaarFinal = await uploadBase64ToS3(aadhaarFinal, 'documents');

			let panFinal = docsPayload.panUrl || docsPayload.pan_url;
			if (panFinal?.startsWith('data:')) panFinal = await uploadBase64ToS3(panFinal, 'documents');

			let gstFinal = docsPayload.gstUrl || docsPayload.gst_url;
			if (gstFinal?.startsWith('data:')) gstFinal = await uploadBase64ToS3(gstFinal, 'documents');

			let storeDocFinal = docsPayload.storeDocUrl || docsPayload.store_doc || docsPayload.store_doc_url;
			if (storeDocFinal?.startsWith('data:')) storeDocFinal = await uploadBase64ToS3(storeDocFinal, 'documents');

			let storeImageFinal = docsPayload.storeImage || docsPayload.storeImageUrl || docsPayload.store_image || docsPayload.store_image_url || storePayload.storeImage || storePayload.storeImageUrl || storePayload.store_image || storePayload.store_image_url;
			if (storeImageFinal?.startsWith('data:')) storeImageFinal = await uploadBase64ToS3(storeImageFinal, 'documents');

			const documents = await Document.create(
				{
					sellerId: seller.id,
					aadhaarUrl: aadhaarFinal,
					panUrl: panFinal,
					gstUrl: gstFinal,
					storeDocUrl: storeDocFinal,
					storeImageUrl: storeImageFinal,
				},
				{ transaction }
			);

			console.log(verified);

			const user = await User.findByPk(Number(payload.userId));
			if (user && payload.email) {
				(user as any).email = payload.email;
				(user as any).is_email_verified = true;
				await user.save({ transaction });
			}

			await transaction.commit();

			// Fetch user to get email and fallback phone number
			const userPhone = user?.phone_number || seller.phone || "";
			const userEmail = payload.email || (user as any)?.email || "";
			const sellerName = bankPayload.accountHolderName || bankPayload.account_holder_name || "N/A";

			// Send email notification to admins
			sendSellerOnboardEmail({
				sellerName,
				storeName: seller.businessName || "N/A",
				email: userEmail,
				phone: userPhone,
				address: seller.address || "N/A"
			}).catch(err => console.error("Email notification failed:", err));

			// Send welcome email to the newly onboarded seller
			if (userEmail) {
				sendSellerWelcomeEmail(userEmail, sellerName)
					.catch(err => console.error("Seller welcome email failed:", err));
			}


			return {
				message: "Seller onboarding completed successfully",
				data: {
					seller,
					store,
					bankDetails,
					documents,
				},
			};
		} catch (error: unknown) {
			await transaction.rollback();
			const message =
				error instanceof Error
					? error.message
					: "Seller onboarding failed. Please check your details and try again";
			throw new Error(message);
		}
	}
	static async adminLogin(
		email: string,
		password: string,
		deviceInfo?: string,
		ip?: string
	) {
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
		const hasAdminRole = (user as any).Roles && (user as any).Roles.some((r: any) => r.name === "admin");
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
		const refreshToken = await this.generateRefreshToken(
			user.id,
			deviceInfo,
			ip
		);
		console.timeEnd("3. Generate Refresh Token");

		return { adminId: user.id, accessToken, refreshToken };
	}

	static async saveDeviceToken(data: {
		userId: number;
		deviceId: string;
		platform: string;
		fcmToken: string;
		appVersion?: string;
		role: string;
	}) {
		const { userId, deviceId, platform, fcmToken, appVersion, role } = data;

		// 1. Verify that the user exists
		const user = await User.findByPk(userId);
		if (!user) {
			throw ApiError.notFound("User not found", "userId");
		}

		// 2. Clean up any existing devices for different users that are using this deviceId
		// for the SAME role, to prevent sending push notifications of user A to user B when
		// logging in on the same device. We do not want to delete the other app's (role) token.
		await UserDevice.destroy({
			where: {
				deviceId,
				role,
				userId: { [Op.ne]: userId }
			}
		});

		// 3. Find or create the device mapping for this user, device, and role
		const [device, created] = await UserDevice.findOrCreate({
			where: { userId, deviceId, role },
			defaults: {
				userId,
				deviceId,
				role,
				platform,
				fcmToken,
				appVersion,
			},
		});

		// 4. If not created, update the tokens & details
		if (!created) {
			device.platform = platform;
			device.fcmToken = fcmToken;
			device.appVersion = appVersion;
			await device.save();
		}

		return device;
	}
}
