// src/utils/fast2sms.util.ts
import axios from "axios";

export const sendOtpFast2SMS = async (phone_number: string, otp: string) => {
  try {
    const apiKey = process.env.FAST2SMS_API_KEY;
    if (!apiKey) throw new Error("FAST2SMS_API_KEY is missing");

    const message = `Your OTP for login is ${otp}. It will expire in 5 minutes.`;

    const response = await axios.post(
      "https://www.fast2sms.com/dev/bulkV2",
      {
        route: "q",
        message,
        numbers: phone_number,
      },
      {
        headers: {
          authorization: apiKey,
          "Content-Type": "application/json",
        },
      }
    );

    return response.data;
  } catch (error: any) {
    console.error("Fast2SMS Error:", error.message);
    throw new Error("Failed to send OTP");
  }
};
