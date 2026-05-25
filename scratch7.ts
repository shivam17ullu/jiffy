import { OtpLogin } from "./src/model/relations.js";
import { jiffy } from "./src/config/sequelize.js";

async function run() {
  await jiffy.authenticate();
  await OtpLogin.create({ phone_number: '8676848305', otp: '112233', expires_at: new Date(Date.now() + 100000) });
  process.exit(0);
}
run();
