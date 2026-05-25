import { OtpLogin } from "./src/model/relations.js";
import { jiffy } from "./src/config/sequelize.js";
import AuthService from "./src/services/auth.service.js";

async function run() {
  await jiffy.authenticate();
  
  // Just fake an OTP to see the exact return of verifyOtp
  const otpRecord = await OtpLogin.create({ phone_number: "8676848305", otp: "999999", expires_at: new Date(Date.now() + 10000) });
  
  try {
    const res = await AuthService.verifyOtp("8676848305", "999999", "test", "127.0.0.1");
    console.log("SUCCESS:", JSON.stringify(res, null, 2));
  } catch (err: any) {
    console.log("ERROR THROWN:", err.message);
  }
  process.exit(0);
}
run().catch(console.error);
