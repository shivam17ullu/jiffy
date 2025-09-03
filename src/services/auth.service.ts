// src/services/auth.service.ts
import { OtpLogin, User, RefreshToken, Role } from "../model/relations";
import otpGenerator from "otp-generator";
import jwt from "jsonwebtoken";
import { addMinutes, isBefore } from "date-fns";
import { sendOtpFast2SMS } from "../utils/fast2sms";

const ACCESS_TOKEN_EXP = "15m";
const REFRESH_TOKEN_EXP_MIN = 60 * 24 * 7; // 7 days

export default class AuthService {
  static async generateOtp(phone_number: string) {
    const otp = otpGenerator.generate(6, {
      digits: true,
      lowerCaseAlphabets: false,
      upperCaseAlphabets: false,
      specialChars: false,
    });

    const expires_at = addMinutes(new Date(), 5);

    await OtpLogin.create({ phone_number, otp, expires_at });

    // Send via Fast2SMS
    await sendOtpFast2SMS(phone_number, otp);

    return otp;
  }

  static async verifyOtp(
    phone_number: string,
    otp: string,
    deviceInfo?: string,
    ip?: string
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

    // find or create user
    let user = await User.findOne({ where: { phone_number } });
    if (!user) {
      user = await User.create({ phone_number });
      // Assign default "buyer" role
      const buyerRole = await Role.findOne({ where: { name: "buyer" } });
      if (buyerRole) await (user as any).addRole(buyerRole);
    }

    // issue tokens
    const accessToken = this.generateAccessToken(user.id);
    const refreshToken = await this.generateRefreshToken(
      user.id,
      deviceInfo,
      ip
    );

    return { user, accessToken, refreshToken };
  }

  static generateAccessToken(userId: number) {
    return jwt.sign({ userId }, process.env.JWT_SECRET as string, {
      expiresIn: ACCESS_TOKEN_EXP,
    });
  }

  static async generateRefreshToken(
    userId: number,
    deviceInfo?: string,
    ip?: string
  ) {
    const token = jwt.sign(
      { userId },
      process.env.JWT_REFRESH_SECRET as string,
      {
        expiresIn: `${REFRESH_TOKEN_EXP_MIN}m`,
      }
    );

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

    if (isBefore(stored.expires_at, new Date()))
      throw new Error("Refresh token expired");

    const payload = jwt.verify(
      oldToken,
      process.env.JWT_REFRESH_SECRET as string
    ) as { userId: number };

    const accessToken = this.generateAccessToken(payload.userId);

    return { accessToken };
  }

  static async revokeRefreshToken(token: string) {
    const stored = await RefreshToken.findOne({ where: { token } });
    if (stored) {
      stored.is_revoked = true;
      await stored.save();
    }
    return true;
  }
}
