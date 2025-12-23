import { jiffy } from "../config/sequelize.js";
import {
  User,
  Role,
  SellerProfile,
  VerifiedSellers,
  Store,
  Document,
  BankDetail,
  BuyerProfile,
} from "../model/relations.js";
import bcrypt from "bcrypt";
import { fileURLToPath } from "url";

async function seedUsers() {
  const t = await jiffy.transaction();

  try {
    console.log("⏳ Seeding users, roles, and seller profiles...");

    const adminRole = await Role.findOne({ where: { name: "admin" }, transaction: t });
    const sellerRole = await Role.findOne({ where: { name: "seller" }, transaction: t });
    const buyerRole = await Role.findOne({ where: { name: "buyer" }, transaction: t });

    if (!adminRole || !sellerRole || !buyerRole) {
      throw new Error("Roles not found.");
    }

    const defaultPassword = await bcrypt.hash("Password123", 12);

    // ----------------------------------------------------------------
    // ADMIN USER
    // ----------------------------------------------------------------
    const [adminUser, adminCreated] = await User.findOrCreate({
      where: { phone_number: "9999999999" },
      defaults: {
        phone_number: "9999999999",
        email: "admin@jiffy.com",
        password: defaultPassword,
        is_active: true,
      },
      transaction: t,
    });

    if (adminCreated) {
      await (adminUser as any).addRole(adminRole, { transaction: t });
      console.log(`✅ Created admin user`);
    }

    // ----------------------------------------------------------------
    // SELLERS LIST
    // ----------------------------------------------------------------
    const sellers = [
      {
        phone_number: "9876543210",
        email: "seller1@jiffy.com",
        sellerProfile: {
          businessName: "Fashion Hub",
          gstNumber: "GST123456789",
          address: "123 Fashion Street",
          city: "Mumbai",
          state: "Maharashtra",
          zipCode: "400001",
          phone: "9876543210",
        },
        store: {
          storeName: "Fashion Hub Main Store",
          storeAddress: "123 Fashion Street, Mumbai",
          pincode: "400001",
        },
        bankDetails: {
          accountHolderName: "Fashion Hub",
          accountNumber: "123456789012",
          ifscCode: "HDFC0001234",
          termsAccepted: true,
        },
        documents: {
          aadhaarUrl: "https://example.com/aadhaar1.pdf",
          panUrl: "https://example.com/pan1.pdf",
          gstUrl: "https://example.com/gst1.pdf",
        },
      },
    ];

    for (const sellerData of sellers) {
      const { sellerProfile, store, bankDetails, documents, ...userData } = sellerData;

      // 1️⃣ Create/find user
      const [sellerUser, sellerCreated] = await User.findOrCreate({
        where: { phone_number: userData.phone_number },
        defaults: {
          ...userData,
          password: defaultPassword,
          is_active: true,
        },
        transaction: t,
      });

      if (sellerCreated) {
        await (sellerUser as any).addRole(sellerRole, { transaction: t });
      }

      // 2️⃣ Create SellerProfile FIRST
      const sellerProfileRecord = await SellerProfile.create(
        {
          userId: sellerUser.id,
          ...sellerProfile,
        },
        { transaction: t }
      );

      console.log("SellerProfile Created:", sellerProfileRecord.id);

      // 3️⃣ NOW create VerifiedSeller with correct FK (NO 0!)
      await VerifiedSellers.create(
        {
          sellerId: sellerProfileRecord.id,
          is_active: true,
        },
        { transaction: t }
      );

      // 4️⃣ Store
      await Store.create(
        { sellerId: sellerProfileRecord.id, ...store },
        { transaction: t }
      );

      // 5️⃣ Bank Details
      await BankDetail.create(
        { sellerId: sellerProfileRecord.id, ...bankDetails },
        { transaction: t }
      );

      // 6️⃣ Documents
      await Document.create(
        { sellerId: sellerProfileRecord.id, ...documents },
        { transaction: t }
      );

      console.log(`✅ Complete seller seeded: ${sellerUser.phone_number}`);
    }

    // ----------------------------------------------------------------
    // BUYERS
    // ----------------------------------------------------------------
    const buyers = [
      {
        phone_number: "9876543220",
        email: "buyer1@jiffy.com",
        buyerProfile: {
          fullName: "John Doe",
          phone: "9876543220",
          address: "123 Buyer Street",
          city: "Mumbai",
          state: "Maharashtra",
          zipCode: "400001",
        },
      },
    ];

    for (const buyerData of buyers) {
      const { buyerProfile, ...userData } = buyerData;

      const [buyerUser, buyerCreated] = await User.findOrCreate({
        where: { phone_number: userData.phone_number },
        defaults: {
          ...userData,
          password: defaultPassword,
          is_active: true,
        },
        transaction: t,
      });

      if (buyerCreated) {
        await (buyerUser as any).addRole(buyerRole, { transaction: t });
      }

      await BuyerProfile.create(
        {
          userId: buyerUser.id,
          ...buyerProfile,
        },
        { transaction: t }
      );

      console.log(`✅ Buyer created: ${buyerUser.phone_number}`);
    }

    await t.commit();
    console.log("🎉 All users seeded successfully!");
  } catch (err) {
    await t.rollback();
    console.error("❌ Error seeding users:", err);
    throw err;
  }
}

// Only run if executed directly
const __filename = fileURLToPath(import.meta.url);
if (process.argv[1] === __filename) {
  seedUsers().then(() => process.exit(0)).catch(() => process.exit(1));
}

export default seedUsers;
