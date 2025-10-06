import otpGenerator from "otp-generator";
export const generateOtp = async () => {
  try {
    const otp = otpGenerator.generate(6, {
      digits: true,
      lowerCaseAlphabets: false,
      upperCaseAlphabets: false,
      specialChars: false,
    });
    return otp;
  } catch (error: any) {
    throw new Error("Failed to genreate OTP");
  }
};
