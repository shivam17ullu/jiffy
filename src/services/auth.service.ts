import jwt from "jsonwebtoken";
import models from "../config/db.js";
import { Op } from "sequelize";

const JWT_SECRET = "supersecret";
const JWT_REFRESH_SECRET = "superrefresh";
const JWT_EXPIRY = "15m";
const REFRESH_EXPIRY_DAYS = 30;

export const AuthService = {
  async requestOtp(phone_number: string) {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    await models.OtpLogin.create({
      phone_number,
      otp,
      expires_at: new Date(Date.now() + 5 * 60000),
    });

    console.log(`OTP for ${phone_number}: ${otp}`);
    return true;
  },

  async verifyOtp(phone_number: string, otp: string) {
    const otpEntry = await models.OtpLogin.findOne({
      where: {
        phone_number,
        otp,
        is_used: false,
        expires_at: { [Op.gt]: new Date() },
      },
    });

    if (!otpEntry) throw new Error("Invalid or expired OTP");

    otpEntry.is_used = true;
    await otpEntry.save();

    let user = await models.User.findOne({ where: { phone_number } });
    if (!user) user = await models.User.create({ phone_number });

    const accessToken = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: JWT_EXPIRY });
    const refreshToken = jwt.sign({ id: user.id }, JWT_REFRESH_SECRET, { expiresIn: `${REFRESH_EXPIRY_DAYS}d` });

    await models.RefreshToken.create({
      user_id: user.id,
      token: refreshToken,
      expires_at: new Date(Date.now() + REFRESH_EXPIRY_DAYS * 24 * 60 * 60 * 1000),
    });

    return { accessToken, refreshToken, user };
  },

  async refreshToken(token: string) {
    try {
      const payload = jwt.verify(token, JWT_REFRESH_SECRET) as { id: number };
      const dbToken = await models.RefreshToken.findOne({
        where: { user_id: payload.id, token, is_revoked: false },
      });
      if (!dbToken) throw new Error("Invalid refresh token");

      const newAccessToken = jwt.sign({ id: payload.id }, JWT_SECRET, { expiresIn: JWT_EXPIRY });
      return { accessToken: newAccessToken };
    } catch {
      throw new Error("Refresh token expired or invalid");
    }
  },

  async logout(token: string) {
    await models.RefreshToken.update({ is_revoked: true }, { where: { token } });
    return true;
  },
};
