import { VerifiedSellers } from "./src/model/relations.js";
import { jiffy } from "./src/config/sequelize.js";

async function run() {
  await jiffy.authenticate();
  const verified = await VerifiedSellers.findOne({ where: { sellerId: 13 } });
  console.log("Verified:", verified?.toJSON());
  process.exit(0);
}
run().catch(console.error);
