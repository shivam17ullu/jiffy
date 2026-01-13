// src/controllers/auth.controller.ts
import { Request, Response } from "express";
import AuthService from "../services/auth.service.js";
import { createResponse } from "../middleware/responseHandler.js";

export default class AuthController {
  /**
   * @swagger
   * /api/auth/send-otp:
   *   post:
   *     summary: Send OTP for login
   *     description: Sends OTP to the provided phone number for buyer login
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
  static async sendOtp(req: Request, res: Response) {
    try {
      const { phone_number } = req.body;
      if (!phone_number)
        return createResponse(res, {
          status: 400,
          message: "Phone number required",
          response: null,
        });

      await AuthService.generateOtp(phone_number);

      return createResponse(res, {
        status: 200,
        message: "OTP sent successfully",
        response: null,
      });
    } catch (error: any) {
      return createResponse(res, {
        status: 500,
        message: error.message,
        response: null,
      });
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
      const { phone_number, otp } = req.body;
      if (!phone_number || !otp)
        return createResponse(res, {
          status: 400,
          message: "Phone number & OTP required",
          response: null,
        });

      const deviceInfo = req.headers["user-agent"] || "unknown";
      const ip = req.ip;

      const { user, accessToken, refreshToken } = await AuthService.verifyOtp(
        phone_number,
        otp,
        deviceInfo,
        ip
      );

      return createResponse(res, {
        status: 200,
        message: "Login successful",
        response: { user, accessToken, refreshToken },
      });
    } catch (error: any) {
      console.log(error);
      return createResponse(res, {
        status: 400,
        message: error.message,
        response: null,
      });
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
      if (!refreshToken)
        return createResponse(res, {
          status: 400,
          message: "Refresh token required",
          response: null,
        });

      const tokens = await AuthService.refreshToken(refreshToken);
      return createResponse(res, {
        status: 200,
        message: "Token refreshed",
        response: tokens,
      });
    } catch (error: any) {
      return createResponse(res, {
        status: 401,
        message: error.message,
        response: null,
      });
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
    } catch (error: any) {
      return createResponse(res, {
        status: 500,
        message: error.message,
        response: null,
      });
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
   *               - email
   *               - password
   *             properties:
   *               phone_number:
   *                 type: string
   *                 example: "9876543210"
   *               email:
   *                 type: string
   *                 format: email
   *                 example: "seller@example.com"
   *               password:
   *                 type: string
   *                 example: "SecurePassword123"
   *     responses:
   *       200:
   *         description: OTP sent successfully
   *       400:
   *         description: Bad request
   */
  static async registerSeller(req: Request, res: Response) {
    try {
      const { phone_number, email, password } = req.body;
      if (!phone_number || !email || !password)
        return createResponse(res, {
          status: 400,
          message: "Phone number, Email and Password required",
          response: null,
        });

      const response = await AuthService.registerSeller(req.body);

      return createResponse(res, {
        status: 200,
        message: "OTP sent successfully",
        response: response.user,
      });
    } catch (error: any) {
      console.log(error);
      return createResponse(res, {
        status: 500,
        message: error.message,
        response: null,
      });
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
      if (!otp || !phone_number)
        return createResponse(res, {
          status: 400,
          message: " Phone & OTP required",
          response: null,
        });

      const deviceInfo = req.headers["user-agent"] || "unknown";
      const ip = req.ip;

      await AuthService.verifySellerOtp(phone_number, otp,deviceInfo, ip);

      return createResponse(res, {
        status: 200,
        message: "Verification successful",
      });
    } catch (error: any) {
      return createResponse(res, {
        status: 400,
        message: error.message,
        response: null,
      });
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
   *               store:
   *                 type: object
   *                 properties:
   *                   storeName:
   *                     type: string
   *                   storeAddress:
   *                     type: string
   *                   pincode:
   *                     type: string
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
    } catch (error: any) {
      console.log(error)
      return createResponse(res, {
        status: 500,
        message: error.message,
        response: null,
      });
    }
  }
}
