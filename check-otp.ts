import { jiffy } from "./src/config/sequelize.js";
import { OtpLogin } from "./src/model/relations.js";

async function run() {
  await jiffy.authenticate();
  const otps = await OtpLogin.findAll({ where: { phone_number: "9999999999" } });
  console.log(otps.map(o => o.toJSON()));
  process.exit();
}

run();
