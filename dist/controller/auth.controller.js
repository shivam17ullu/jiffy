import { AuthService } from "../services/auth.service.js";
export const AuthController = {
    requestOtp: async (req, res) => {
        try {
            await AuthService.requestOtp(req.body.phone_number);
            res.json({ message: "OTP sent" });
        }
        catch (err) {
            res.status(400).json({ error: err.message });
        }
    },
    verifyOtp: async (req, res) => {
        try {
            const { accessToken, refreshToken, user } = await AuthService.verifyOtp(req.body.phone_number, req.body.otp);
            res.json({ accessToken, refreshToken, user });
        }
        catch (err) {
            res.status(400).json({ error: err.message });
        }
    },
    refreshToken: async (req, res) => {
        try {
            const { accessToken } = await AuthService.refreshToken(req.body.refreshToken);
            res.json({ accessToken });
        }
        catch (err) {
            res.status(401).json({ error: err.message });
        }
    },
    logout: async (req, res) => {
        try {
            await AuthService.logout(req.body.refreshToken);
            res.json({ message: "Logged out" });
        }
        catch (err) {
            res.status(400).json({ error: err.message });
        }
    },
};
