import { jiffy } from "./src/config/sequelize.js";
import { User } from "./src/model/relations.js";
import { getOrCreateWallet, creditWallet } from "./src/services/wallet/wallet.service.js";

async function creditUserWallet(phone: string, amount: number) {
  await jiffy.authenticate();

  const user = await User.findOne({ where: { phone_number: phone } });
  if (!user) {
    console.error(`User with phone ${phone} not found!`);
    process.exit(1);
  }

  const t = await jiffy.transaction();
  try {
    // Ensure wallet exists
    await getOrCreateWallet(user.id, t);

    // Credit amount
    await creditWallet({
      userId: user.id,
      amount,
      referenceId: "ADMIN_SEED",
      referenceType: "ADMIN",
      category: "ADMIN_ADJUSTMENT",
      description: "Seeded test balance for wallet checkout testing"
    }, t);

    await t.commit();
    console.log(`Successfully credited ₹${amount} to user ID ${user.id} (Phone: ${phone})!`);
  } catch (err) {
    await t.rollback();
    console.error("Failed to credit wallet:", err);
  }
  process.exit(0);
}

// Replace with target user phone number and test amount
const targetPhone = "8676848305";
const testAmount = 1000.00;

creditUserWallet(targetPhone, testAmount).catch(console.error);
