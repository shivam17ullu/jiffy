import { User, SellerProfile, Role } from "./src/model/relations.js";
import { jiffy } from "./src/config/sequelize.js";

async function run() {
  await jiffy.authenticate();
  const user = await User.findOne({ where: { phone_number: "8676848305" }, include: [Role, SellerProfile] });
  console.log("User:", user?.toJSON());
  const profile = await SellerProfile.findOne({ where: { phone: "8676848305" } });
  console.log("Profile by phone:", profile?.toJSON());
  process.exit(0);
}
run().catch(console.error);
