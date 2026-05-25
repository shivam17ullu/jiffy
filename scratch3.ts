import { User } from "./src/model/relations.js";
import { Op } from "sequelize";
import { jiffy } from "./src/config/sequelize.js";

async function run() {
  await jiffy.authenticate();
  const users = await User.findAll({ where: { phone_number: { [Op.like]: "%8676848305%" } } });
  console.log("Users:", users.map(u => u.toJSON()));
  process.exit(0);
}
run().catch(console.error);
