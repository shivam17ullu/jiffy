import { jiffy } from "./src/config/sequelize.js";
import AuthService from "./src/services/auth.service.js";

async function run() {
  await jiffy.authenticate();
  console.log("Connected to DB");
  try {
    const result = await AuthService.registerSeller({
      phone_number: "9999999999",
      email: "test@example.com"
    });
    console.log("Success:", result);
  } catch (err) {
    console.error("Error:", err);
  }
  process.exit();
}

run();
