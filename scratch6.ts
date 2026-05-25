import AuthService from "./src/services/auth.service.js";
import { jiffy } from "./src/config/sequelize.js";
import { OtpLogin } from "./src/model/relations.js";

async function run() {
  await jiffy.authenticate();
  
  // Fake an OTP just to run the exact verifyOtp code
  const phone = "8676848305";
  const otp = "000000";
  await OtpLogin.create({ phone_number: phone, otp, expires_at: new Date(Date.now() + 10000) });
  
  try {
    const result = await AuthService.verifyOtp(phone, otp);
    console.log("onboardingCompleted:", result.onboardingCompleted);
  } catch (err) {
    console.log("Error:", err);
  }
  
  process.exit(0);
}
run();
