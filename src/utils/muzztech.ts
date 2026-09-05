import axios from "axios";

export interface MuzztechSendOtpResponse {
	Status?: string;
	Details?: string;
	OTP?: string;
	success?: boolean;
	message?: string;
}

export interface MuzztechVerifyOtpResponse {
	Status?: string;
	Details?: string;
	success?: boolean;
	message?: string;
}

/**
 * Send OTP using Muzztech API
 * @param phoneNumber Recipient mobile number (e.g. "9110951615")
 */
export const sendOtpMuzztech = async (
	phoneNumber: string
): Promise<{ otpSession: string; otp?: string }> => {
	const apiKey = process.env.MUZZTECH_API_KEY;
	const templateName = process.env.MUZZTECH_OTP_TEMPLATE_NAME || "otp";
	const apiUrl = process.env.MUZZTECH_API_URL || "https://connect.muzztech.com/api/V1";

	if (!apiKey) {
		throw new Error("MUZZTECH_API_KEY is missing from environment variables");
	}

	try {
		const payload = {
			api_key: apiKey,
			phone_number: phoneNumber,
			otp_template_name: templateName,
		};

		const response = await axios.post<MuzztechSendOtpResponse>(apiUrl, payload, {
			headers: {
				"Content-Type": "application/json",
			},
			timeout: 10000,
		});

		const data = response.data;

		// Check if response indicates success
		if (data.Status === "Success" || data.success === true) {
			const otpSession = data.Details || "";
			const otp = data.OTP;
			return {
				otpSession,
				otp,
			};
		}

		const errMsg = data.Details || data.message || "Failed to send OTP via Muzztech";
		throw new Error(errMsg);
	} catch (error: any) {
		console.error("Muzztech Send OTP Error:", error?.response?.data || error.message);
		const message =
			error.response?.data?.Details ||
			error.response?.data?.message ||
			error.message ||
			"Failed to send OTP";
		throw new Error(message);
	}
};

/**
 * Verify OTP using Muzztech API
 * @param otpSession The session ID received during send OTP
 * @param otpEnteredByUser The 6-digit OTP entered by the user
 */
export const verifyOtpMuzztech = async (
	otpSession: string,
	otpEnteredByUser: string
): Promise<{ verified: boolean; message: string }> => {
	const apiKey = process.env.MUZZTECH_API_KEY;
	const apiUrl = process.env.MUZZTECH_API_URL || "https://connect.muzztech.com/api/V1";

	if (!apiKey) {
		throw new Error("MUZZTECH_API_KEY is missing from environment variables");
	}

	try {
		const payload = {
			api_key: apiKey,
			otp_session: otpSession,
			otp_entered_by_user: otpEnteredByUser,
		};

		const response = await axios.post<MuzztechVerifyOtpResponse>(apiUrl, payload, {
			headers: {
				"Content-Type": "application/json",
			},
			timeout: 10000,
		});

		const data = response.data;

		if (
			(data.Status === "Success" && data.Details?.includes("OTP Matched")) ||
			data.Status === "Success" ||
			data.success === true
		) {
			return {
				verified: true,
				message: data.Details || "OTP Matched!",
			};
		}

		const errMsg = data.Details || data.message || "Invalid OTP";
		return {
			verified: false,
			message: errMsg,
		};
	} catch (error: any) {
		console.error("Muzztech Verify OTP Error:", error?.response?.data || error.message);
		const message =
			error.response?.data?.Details ||
			error.response?.data?.message ||
			error.message ||
			"Failed to verify OTP";
		return {
			verified: false,
			message,
		};
	}
};
