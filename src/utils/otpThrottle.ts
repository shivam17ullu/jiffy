interface ThrottleRecord {
	timestamps: number[];
}

class OtpThrottleService {
	private sendAttempts: Map<string, ThrottleRecord> = new Map();
	private verifyFailures: Map<string, ThrottleRecord> = new Map();

	private readonly MAX_CONSECUTIVE_SEND = 3;
	private readonly MAX_CONSECUTIVE_VERIFY = 3;
	private readonly WINDOW_MS = 10 * 60 * 1000; // 10 minutes window

	constructor() {
		// Periodically clean up old records every 15 minutes to prevent memory leak
		setInterval(() => this.cleanup(), 15 * 60 * 1000).unref();
	}

	private cleanupMap(map: Map<string, ThrottleRecord>, now: number) {
		for (const [key, record] of map.entries()) {
			const validTimestamps = record.timestamps.filter(
				(ts) => now - ts < this.WINDOW_MS
			);
			if (validTimestamps.length === 0) {
				map.delete(key);
			} else {
				record.timestamps = validTimestamps;
			}
		}
	}

	private cleanup() {
		const now = Date.now();
		this.cleanupMap(this.sendAttempts, now);
		this.cleanupMap(this.verifyFailures, now);
	}

	private getRecentTimestamps(map: Map<string, ThrottleRecord>, key: string, now: number): number[] {
		const record = map.get(key);
		if (!record) return [];
		const valid = record.timestamps.filter((ts) => now - ts < this.WINDOW_MS);
		record.timestamps = valid;
		return valid;
	}

	/**
	 * Check if sending OTP is allowed for this phone number.
	 */
	checkSendOtpThrottle(phone: string): {
		allowed: boolean;
		message?: string;
		retryAfterSeconds?: number;
	} {
		const now = Date.now();
		const recent = this.getRecentTimestamps(this.sendAttempts, phone, now);

		if (recent.length >= this.MAX_CONSECUTIVE_SEND) {
			const oldestInWindow = recent[0];
			const retryAfterSeconds = Math.max(
				1,
				Math.ceil((oldestInWindow + this.WINDOW_MS - now) / 1000)
			);
			const minutes = Math.ceil(retryAfterSeconds / 60);
			return {
				allowed: false,
				retryAfterSeconds,
				message: `Too many OTP requests. Maximum ${this.MAX_CONSECUTIVE_SEND} consecutive attempts allowed. Please try again after ${minutes} minute(s).`,
			};
		}

		return { allowed: true };
	}

	/**
	 * Record a send OTP attempt.
	 */
	recordSendOtp(phone: string): void {
		const now = Date.now();
		const recent = this.getRecentTimestamps(this.sendAttempts, phone, now);
		recent.push(now);
		this.sendAttempts.set(phone, { timestamps: recent });
	}

	/**
	 * Check if OTP verification is allowed for this phone number.
	 */
	checkVerifyOtpThrottle(phone: string): {
		allowed: boolean;
		message?: string;
		retryAfterSeconds?: number;
	} {
		const now = Date.now();
		const recent = this.getRecentTimestamps(this.verifyFailures, phone, now);

		if (recent.length >= this.MAX_CONSECUTIVE_VERIFY) {
			const oldestInWindow = recent[0];
			const retryAfterSeconds = Math.max(
				1,
				Math.ceil((oldestInWindow + this.WINDOW_MS - now) / 1000)
			);
			const minutes = Math.ceil(retryAfterSeconds / 60);
			return {
				allowed: false,
				retryAfterSeconds,
				message: `Too many failed verification attempts. Maximum ${this.MAX_CONSECUTIVE_VERIFY} attempts allowed. Please request a new OTP or try again after ${minutes} minute(s).`,
			};
		}

		return { allowed: true };
	}

	/**
	 * Record a failed OTP verification attempt.
	 */
	recordVerifyFailure(phone: string): void {
		const now = Date.now();
		const recent = this.getRecentTimestamps(this.verifyFailures, phone, now);
		recent.push(now);
		this.verifyFailures.set(phone, { timestamps: recent });
	}

	/**
	 * Reset verification failures on successful OTP verification.
	 */
	resetVerifyAttempts(phone: string): void {
		this.verifyFailures.delete(phone);
	}

	/**
	 * Reset send attempts (e.g. for testing or administrative reset).
	 */
	resetSendAttempts(phone: string): void {
		this.sendAttempts.delete(phone);
	}
}

export const OtpThrottler = new OtpThrottleService();
