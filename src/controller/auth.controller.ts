// src/controllers/auth.controller.ts
import { Request, Response } from "express";
import {
	createResponse,
	handleControllerError,
	sendValidationError,
} from "../middleware/responseHandler.js";
import AuthService from "../services/auth.service.js";

export default class AuthController {
	/**
	 * @swagger
	 * /api/auth/send-otp:
	 *   post:
	 *     summary: Send OTP for login
	 *     description: Sends OTP for login. Phone number must already be registered in the database.
	 *     tags: [Authentication]
	 *     requestBody:
	 *       required: true
	 *       content:
	 *         application/json:
	 *           schema:
	 *             type: object
	 *             required:
	 *               - phone_number
	 *             properties:
	 *               phone_number:
	 *                 type: string
	 *                 example: "9876543210"
	 *     responses:
	 *       200:
	 *         description: OTP sent successfully
	 *       400:
	 *         description: Bad request
	 *       500:
	 *         description: Server error
	 */

	/**
	 * @swagger
	 * /api/auth/email/send-otp:
	 *   post:
	 *     summary: Send OTP for email verification
	 *     description: Sends a 6-digit OTP to the registered email address.
	 *     tags: [Authentication]
	 *     requestBody:
	 *       required: true
	 *       content:
	 *         application/json:
	 *           schema:
	 *             type: object
	 *             required:
	 *               - email
	 *             properties:
	 *               email:
	 *                 type: string
	 *                 format: email
	 *     responses:
	 *       200:
	 *         description: Email OTP sent successfully
	 *       400:
	 *         description: Bad request
	 */
	static async sendEmailOtp(req: Request, res: Response) {
		try {
			const { email } = req.body;
			if (!email) {
				return sendValidationError(res, "Email is required", "email");
			}

			const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
			if (!emailRegex.test(email)) {
				return sendValidationError(res, "Invalid email format", "email");
			}

			await AuthService.generateEmailOtp(email);

			return createResponse(res, {
				status: 200,
				message: "Email OTP sent successfully",
				response: null,
			});
		} catch (error: unknown) {
			return handleControllerError(res, error, 500);
		}
	}

	/**
	 * @swagger
	 * /api/auth/email/verify-otp:
	 *   post:
	 *     summary: Verify Email OTP
	 *     description: Verifies the 6-digit email OTP and updates the email verification status.
	 *     tags: [Authentication]
	 *     requestBody:
	 *       required: true
	 *       content:
	 *         application/json:
	 *           schema:
	 *             type: object
	 *             required:
	 *               - email
	 *               - otp
	 *             properties:
	 *               email:
	 *                 type: string
	 *                 format: email
	 *               otp:
	 *                 type: string
	 *     responses:
	 *       200:
	 *         description: Email verified successfully
	 *       400:
	 *         description: Invalid OTP or expired
	 */
	static async verifyEmailOtp(req: Request, res: Response) {
		try {
			const { email, otp } = req.body;
			if (!email) {
				return sendValidationError(res, "Email is required", "email");
			}
			if (!otp) {
				return sendValidationError(res, "OTP is required", "otp");
			}

			const result = await AuthService.verifyEmailOtp(email, otp);

			return createResponse(res, {
				status: 200,
				message: result.message,
				response: null,
			});
		} catch (error: unknown) {
			return handleControllerError(res, error);
		}
	}

	static async sendOtp(req: Request, res: Response) {
		try {
			const { phone_number, role } = req.body;
			if (!phone_number) {
				return sendValidationError(
					res,
					"Phone number is required",
					"phone_number"
				);
			}

			await AuthService.generateOtp(phone_number, role);

			return createResponse(res, {
				status: 200,
				message: "OTP sent successfully",
				response: null,
			});
		} catch (error: unknown) {
			return handleControllerError(res, error, 500);
		}
	}

	/**
	 * @swagger
	 * /api/auth/verify-otp:
	 *   post:
	 *     summary: Verify OTP and login
	 *     description: Verifies OTP and logs in the user (creates user if new). Returns access and refresh tokens.
	 *     tags: [Authentication]
	 *     requestBody:
	 *       required: true
	 *       content:
	 *         application/json:
	 *           schema:
	 *             type: object
	 *             required:
	 *               - phone_number
	 *               - otp
	 *             properties:
	 *               phone_number:
	 *                 type: string
	 *                 example: "9876543210"
	 *               otp:
	 *                 type: string
	 *                 example: "123456"
	 *     responses:
	 *       200:
	 *         description: Login successful
	 *         content:
	 *           application/json:
	 *             schema:
	 *               type: object
	 *               properties:
	 *                 status:
	 *                   type: integer
	 *                 message:
	 *                   type: string
	 *                 response:
	 *                   type: object
	 *                   properties:
	 *                     user:
	 *                       type: object
	 *                     accessToken:
	 *                       type: string
	 *                     refreshToken:
	 *                       type: string
	 *       400:
	 *         description: Invalid OTP or expired
	 */
	static async verifyOtp(req: Request, res: Response) {
		try {
			const { phone_number, otp, role } = req.body;
			if (!phone_number) {
				return sendValidationError(
					res,
					"Phone number is required",
					"phone_number"
				);
			}
			if (!otp) {
				return sendValidationError(res, "OTP is required", "otp");
			}

			const deviceInfo = req.headers["user-agent"] || "unknown";
			const ip = req.ip;

			const { user, accessToken, refreshToken, onboardingCompleted } = await AuthService.verifyOtp(
				phone_number,
				otp,
				deviceInfo,
				ip,
				role
			);

			return createResponse(res, {
				status: 200,
				message: "Login successful",
				response: { user, accessToken, refreshToken, onboardingCompleted },
			});
		} catch (error: unknown) {
			return handleControllerError(res, error);
		}
	}

	/**
	 * @swagger
	 * /api/auth/refresh-token:
	 *   post:
	 *     summary: Refresh access token
	 *     description: Generates a new access token using a valid refresh token
	 *     tags: [Authentication]
	 *     requestBody:
	 *       required: true
	 *       content:
	 *         application/json:
	 *           schema:
	 *             type: object
	 *             required:
	 *               - refreshToken
	 *             properties:
	 *               refreshToken:
	 *                 type: string
	 *     responses:
	 *       200:
	 *         description: Token refreshed successfully
	 *       401:
	 *         description: Invalid or expired refresh token
	 */
	static async refreshToken(req: Request, res: Response) {
		try {
			const { refreshToken } = req.body;
			if (!refreshToken) {
				return sendValidationError(
					res,
					"Refresh token is required",
					"refreshToken"
				);
			}

			const tokens = await AuthService.refreshToken(refreshToken);
			return createResponse(res, {
				status: 200,
				message: "Token refreshed",
				response: tokens,
			});
		} catch (error: unknown) {
			return handleControllerError(res, error, 401);
		}
	}

	/**
	 * @swagger
	 * /api/auth/logout:
	 *   post:
	 *     summary: Logout user
	 *     description: Revokes the refresh token to logout the user
	 *     tags: [Authentication]
	 *     requestBody:
	 *       required: true
	 *       content:
	 *         application/json:
	 *           schema:
	 *             type: object
	 *             required:
	 *               - refreshToken
	 *             properties:
	 *               refreshToken:
	 *                 type: string
	 *     responses:
	 *       200:
	 *         description: Logged out successfully
	 */
	static async logout(req: Request, res: Response) {
		try {
			const { refreshToken } = req.body;
			await AuthService.revokeRefreshToken(refreshToken);

			return createResponse(res, {
				status: 200,
				message: "Logged out successfully",
				response: null,
			});
		} catch (error: unknown) {
			return handleControllerError(res, error, 500);
		}
	}

	/**
	 * @swagger
	 * /api/auth/admin-logout:
	 *   post:
	 *     summary: Admin logout
	 *     description: Revokes the refresh token to logout the admin
	 *     tags: [Authentication]
	 *     requestBody:
	 *       required: true
	 *       content:
	 *         application/json:
	 *           schema:
	 *             type: object
	 *             required:
	 *               - refreshToken
	 *             properties:
	 *               refreshToken:
	 *                 type: string
	 *     responses:
	 *       200:
	 *         description: Admin logged out successfully
	 */
	static async adminLogout(req: Request, res: Response) {
		try {
			const { refreshToken } = req.body;
			await AuthService.revokeRefreshToken(refreshToken);

			return createResponse(res, {
				status: 200,
				message: "Admin logged out successfully",
				response: null,
			});
		} catch (error: unknown) {
			return handleControllerError(res, error, 500);
		}
	}

	/**
	 * @swagger
	 * /api/auth/register-seller:
	 *   post:
	 *     summary: Register seller (Step 1)
	 *     description: First step of seller registration. Creates seller account and sends OTP.
	 *     tags: [Authentication, Seller]
	 *     requestBody:
	 *       required: true
	 *       content:
	 *         application/json:
	 *           schema:
	 *             type: object
	 *             required:
	 *               - phone_number
	 *               # - password
	 *             properties:
	 *               phone_number:
	 *                 type: string
	 *                 example: "9876543210"
	 *               # password:
	 *               #   type: string
	 *               #   example: "SecurePassword123"
	 *     responses:
	 *       200:
	 *         description: OTP sent successfully
	 *       400:
	 *         description: Bad request
	 */
	static async registerSeller(req: Request, res: Response) {
		try {
			const { phone_number } = req.body;
			// const { password } = req.body; // commented out password
			if (!phone_number) {
				return sendValidationError(
					res,
					"Phone number is required",
					"phone_number"
				);
			}
			// if (!password) {
			// 	return sendValidationError(res, "Password is required", "password");
			// }

			const response = await AuthService.registerSeller(req.body);

			return createResponse(res, {
				status: 200,
				message: "OTP sent successfully",
				response: {
					user: response.user,
					otp: response.otp
				},
			});
		} catch (error: unknown) {
			return handleControllerError(res, error);
		}
	}

	/**
	 * @swagger
	 * /api/auth/verify-seller-otp:
	 *   post:
	 *     summary: Verify seller OTP (Step 2)
	 *     description: Second step of seller registration. Verifies OTP and activates seller account.
	 *     tags: [Authentication, Seller]
	 *     requestBody:
	 *       required: true
	 *       content:
	 *         application/json:
	 *           schema:
	 *             type: object
	 *             required:
	 *               - phone_number
	 *               - otp
	 *             properties:
	 *               phone_number:
	 *                 type: string
	 *               otp:
	 *                 type: string
	 *     responses:
	 *       200:
	 *         description: Seller verified successfully
	 *       400:
	 *         description: Invalid OTP
	 */
	static async verifySellerOtp(req: Request, res: Response) {
		try {
			const { otp, phone_number } = req.body;
			if (!phone_number) {
				return sendValidationError(
					res,
					"Phone number is required",
					"phone_number"
				);
			}
			if (!otp) {
				return sendValidationError(res, "OTP is required", "otp");
			}

			const deviceInfo = req.headers["user-agent"] || "unknown";
			const ip = req.ip;

			await AuthService.verifySellerOtp(phone_number, otp, deviceInfo, ip);

			return createResponse(res, {
				status: 200,
				message: "Verification successful",
			});
		} catch (error: unknown) {
			return handleControllerError(res, error);
		}
	}

	/**
	 * @swagger
	 * /api/auth/onboard-seller:
	 *   post:
	 *     summary: Complete seller onboarding (Step 3)
	 *     description: Final step of seller registration. Creates seller profile, store, bank details, and documents.
	 *     tags: [Authentication, Seller]
	 *     security:
	 *       - bearerAuth: []
	 *     requestBody:
	 *       required: true
	 *       content:
	 *         application/json:
	 *           schema:
	 *             type: object
	 *             required:
	 *               - userId
	 *               - store
	 *               - bankDetails
	 *               - documents
	 *             properties:
	 *               userId:
	 *                 type: integer
	 *               email:
	 *                 type: string
	 *               store:
	 *                 type: object
	 *                 properties:
	 *                   storeName:
	 *                     type: string
	 *                   storeAddress:
	 *                     type: string
	 *                   pincode:
	 *                     type: string
	 *                   storeCategory:
	 *                     type: string
	 *                     enum: [Men, Women, Kids, All]
	 *                   phone:
	 *                     type: string
	 *               bankDetails:
	 *                 type: object
	 *                 properties:
	 *                   accountHolderName:
	 *                     type: string
	 *                   accountNumber:
	 *                     type: string
	 *                   ifscCode:
	 *                     type: string
	 *                   termsAccepted:
	 *                     type: boolean
	 *               documents:
	 *                 type: object
	 *                 properties:
	 *                   aadhaarUrl:
	 *                     type: string
	 *                   panUrl:
	 *                     type: string
	 *                   gstUrl:
	 *                     type: string
	 *                   storeDocUrl:
	 *                     type: string
	 *     responses:
	 *       200:
	 *         description: Seller onboarding completed successfully
	 *       400:
	 *         description: Bad request
	 *       401:
	 *         description: Unauthorized
	 */
	static async onboardSeller(req: Request, res: Response) {
		try {
			const response = await AuthService.onboardSeller(req.body);

			return createResponse(res, {
				status: 200,
				message: "OTP sent successfully",
				response: response,
			});
		} catch (error: unknown) {
			return handleControllerError(res, error, 500);
		}
	}

	/**
	 * @swagger
	 * /api/auth/admin-login:
	 *   post:
	 *     summary: Admin login
	 *     description: Login using email and password. Restricted to users with the 'admin' role.
	 *     tags: [Authentication]
	 *     requestBody:
	 *       required: true
	 *       content:
	 *         application/json:
	 *           schema:
	 *             type: object
	 *             required:
	 *               - email
	 *               - password
	 *             properties:
	 *               email:
	 *                 type: string
	 *                 format: email
	 *                 example: "admin@example.com"
	 *               password:
	 *                 type: string
	 *                 example: "SecurePassword123"
	 *     responses:
	 *       200:
	 *         description: Login successful
	 *       400:
	 *         description: Bad request or validation error
	 *       401:
	 *         description: Invalid credentials
	 *       403:
	 *         description: Access denied (Not an admin)
	 */
	static async adminLogin(req: Request, res: Response) {
		try {
			const { email, password } = req.body;
			if (!email) {
				return sendValidationError(res, "Email is required", "email");
			}
			if (!password) {
				return sendValidationError(res, "Password is required", "password");
			}

			const deviceInfo = req.headers["user-agent"] || "unknown";
			const ip = req.ip;

			const { adminId, accessToken, refreshToken } = await AuthService.adminLogin(
				email,
				password,
				deviceInfo,
				ip
			);

			return createResponse(res, {
				status: 200,
				message: "Admin login successful",
				response: { adminId, role: "admin", accessToken, refreshToken },
			});
		} catch (error: unknown) {
			return handleControllerError(res, error);
		}
	}

	/**
	 * @swagger
	 * /api/auth/device-token:
	 *   post:
	 *     summary: Register or update device push notification token
	 *     description: Stores the device push token and details for push notifications. Usable for both buyers and sellers.
	 *     tags: [Authentication]
	 *     requestBody:
	 *       required: true
	 *       content:
	 *         application/json:
	 *           schema:
	 *             type: object
	 *             required:
	 *               - userId
	 *               - deviceId
	 *               - platform
	 *               - fcmToken
	 *               - role
	 *             properties:
	 *               userId:
	 *                 type: integer
	 *                 example: 12
	 *               deviceId:
	 *                 type: string
	 *                 example: "abc123"
	 *               platform:
	 *                 type: string
	 *                 example: "android"
	 *               fcmToken:
	 *                 type: string
	 *                 example: "xxxxx"
	 *               appVersion:
	 *                 type: string
	 *                 example: "1.0.0"
	 *               role:
	 *                 type: string
	 *                 example: "buyer"
	 *     responses:
	 *       200:
	 *         description: Device token registered successfully
	 *       400:
	 *         description: Validation error
	 *       404:
	 *         description: User not found
	 */
	static async registerDevice(req: Request, res: Response) {
		try {
			const { userId, deviceId, platform, fcmToken, appVersion, role } = req.body;

			if (!userId) {
				return sendValidationError(res, "userId is required", "userId");
			}
			if (!deviceId) {
				return sendValidationError(res, "deviceId is required", "deviceId");
			}
			if (!platform) {
				return sendValidationError(res, "platform is required", "platform");
			}
			if (!fcmToken) {
				return sendValidationError(res, "fcmToken is required", "fcmToken");
			}
			if (!role) {
				return sendValidationError(res, "role is required", "role");
			}
			if (role !== "buyer" && role !== "seller") {
				return sendValidationError(res, "role must be either 'buyer' or 'seller'", "role");
			}

			const device = await AuthService.saveDeviceToken({
				userId: Number(userId),
				deviceId,
				platform,
				fcmToken,
				appVersion,
				role,
			});

			return createResponse(res, {
				status: 200,
				message: "Device token registered successfully",
				response: device,
			});
		} catch (error: unknown) {
			return handleControllerError(res, error);
		}
	}
}

