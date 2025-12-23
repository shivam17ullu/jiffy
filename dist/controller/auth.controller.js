import AuthService from "../services/auth.service.js";
import { createResponse } from "../middleware/responseHandler.js";
export default class AuthController {
    static async sendOtp(req, res) {
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
        }
        catch (error) {
            return createResponse(res, {
                status: 500,
                message: error.message,
                response: null,
            });
        }
    }
    static async verifyOtp(req, res) {
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
            const { user, accessToken, refreshToken } = await AuthService.verifyOtp(phone_number, otp, deviceInfo, ip);
            return createResponse(res, {
                status: 200,
                message: "Login successful",
                response: { user, accessToken, refreshToken },
            });
        }
        catch (error) {
            console.log(error);
            return createResponse(res, {
                status: 400,
                message: error.message,
                response: null,
            });
        }
    }
    static async refreshToken(req, res) {
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
        }
        catch (error) {
            return createResponse(res, {
                status: 401,
                message: error.message,
                response: null,
            });
        }
    }
    static async logout(req, res) {
        try {
            const { refreshToken } = req.body;
            await AuthService.revokeRefreshToken(refreshToken);
            return createResponse(res, {
                status: 200,
                message: "Logged out successfully",
                response: null,
            });
        }
        catch (error) {
            return createResponse(res, {
                status: 500,
                message: error.message,
                response: null,
            });
        }
    }
    static async registerSeller(req, res) {
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
        }
        catch (error) {
            console.log(error);
            return createResponse(res, {
                status: 500,
                message: error.message,
                response: null,
            });
        }
    }
    static async verifySellerOtp(req, res) {
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
            await AuthService.verifySellerOtp(phone_number, otp, deviceInfo, ip);
            return createResponse(res, {
                status: 200,
                message: "Verification successful",
            });
        }
        catch (error) {
            return createResponse(res, {
                status: 400,
                message: error.message,
                response: null,
            });
        }
    }
    static async onboardSeller(req, res) {
        try {
            const response = await AuthService.onboardSeller(req.body);
            return createResponse(res, {
                status: 200,
                message: "OTP sent successfully",
                response: response,
            });
        }
        catch (error) {
            console.log(error);
            return createResponse(res, {
                status: 500,
                message: error.message,
                response: null,
            });
        }
    }
}
