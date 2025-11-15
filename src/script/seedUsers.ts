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
import { fileURLToPath } from "url";
import bcrypt from "bcrypt";

async function seedUsers() {
  const t = await jiffy.transaction();

  try {
    console.log("⏳ Seeding users, roles, and seller profiles...");

    // Fetch roles
    const adminRole = await Role.findOne({
      where: { name: "admin" },
      transaction: t,
    });
    const sellerRole = await Role.findOne({
      where: { name: "seller" },
      transaction: t,
    });
    const buyerRole = await Role.findOne({
      where: { name: "buyer" },
      transaction: t,
    });

    if (!adminRole || !sellerRole || !buyerRole) {
      throw new Error("Roles not found. Please run seedRoles.ts first.");
    }

    // ------------------------------
    // 1. Create Admin User
    // ------------------------------
    const defaultPassword = await bcrypt.hash("Password123", 12);
    
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

    // Update password if user exists but doesn't have one
    if (!adminCreated && !adminUser.password) {
      adminUser.password = defaultPassword;
      await adminUser.save({ transaction: t });
      console.log(`🔑 Updated password for existing admin user: ${adminUser.phone_number}`);
    }

    if (adminCreated) {
      await (adminUser as any).addRole(adminRole, { transaction: t });
      console.log(`✅ Created admin user: ${adminUser.phone_number}`);
    } else {
      console.log(`ℹ️  Admin user already exists: ${adminUser.phone_number}`);
    }

    // ------------------------------
    // 2. Create Seller Users
    // ------------------------------
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
      {
        phone_number: "9876543211",
        email: "seller2@jiffy.com",
        sellerProfile: {
          businessName: "Style Store",
          gstNumber: "GST987654321",
          address: "456 Style Avenue",
          city: "Delhi",
          state: "Delhi",
          zipCode: "110001",
          phone: "9876543211",
        },
        store: {
          storeName: "Style Store Main Outlet",
          storeAddress: "456 Style Avenue, Delhi",
          pincode: "110001",
        },
        bankDetails: {
          accountHolderName: "Style Store",
          accountNumber: "987654321098",
          ifscCode: "ICIC0009876",
          termsAccepted: true,
        },
        documents: {
          aadhaarUrl: "https://example.com/aadhaar2.pdf",
          panUrl: "https://example.com/pan2.pdf",
          gstUrl: "https://example.com/gst2.pdf",
        },
      },
      {
        phone_number: "9876543212",
        email: "seller3@jiffy.com",
        sellerProfile: {
          businessName: "Trendy Mart",
          gstNumber: "GST456789123",
          address: "789 Trendy Road",
          city: "Bangalore",
          state: "Karnataka",
          zipCode: "560001",
          phone: "9876543212",
        },
        store: {
          storeName: "Trendy Mart Central",
          storeAddress: "789 Trendy Road, Bangalore",
          pincode: "560001",
        },
        bankDetails: {
          accountHolderName: "Trendy Mart",
          accountNumber: "456789123456",
          ifscCode: "SBIN0004567",
          termsAccepted: true,
        },
        documents: {
          aadhaarUrl: "https://example.com/aadhaar3.pdf",
          panUrl: "https://example.com/pan3.pdf",
          gstUrl: "https://example.com/gst3.pdf",
        },
      },
    ];

    const createdSellers: any[] = [];

    for (const sellerData of sellers) {
      const {
        sellerProfile,
        store,
        bankDetails,
        documents,
        ...userData
      } = sellerData;

      const [sellerUser, sellerCreated] = await User.findOrCreate({
        where: { phone_number: userData.phone_number },
        defaults: {
          ...userData,
          password: defaultPassword,
          is_active: true,
        },
        transaction: t,
      });

      // Update password if user exists but doesn't have one
      if (!sellerCreated && !sellerUser.password) {
        sellerUser.password = defaultPassword;
        await sellerUser.save({ transaction: t });
        console.log(`🔑 Updated password for existing seller user: ${sellerUser.phone_number}`);
      }

      if (sellerCreated) {
        await (sellerUser as any).addRole(sellerRole, { transaction: t });
        console.log(`✅ Created seller user: ${sellerUser.phone_number}`);

        // Step 1: Create VerifiedSellers first (required for foreign key constraint)
        const verifiedSeller = await VerifiedSellers.create(
          {
            sellerId: 0, // Temporary, will update after SellerProfile is created
            is_active: true,
          },
          { transaction: t }
        );

        // Step 2: Create SellerProfile with the same ID as VerifiedSellers
        // Use raw query to insert with specific ID (bypassing auto-increment)
        await jiffy.query(
          `INSERT INTO seller_profile (id, userId, businessName, gstNumber, address, city, state, zipCode, phone, createdAt, updatedAt) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
          {
            replacements: [
              verifiedSeller.id,
              sellerUser.id,
              sellerProfile.businessName,
              sellerProfile.gstNumber,
              sellerProfile.address,
              sellerProfile.city,
              sellerProfile.state,
              sellerProfile.zipCode,
              sellerProfile.phone,
            ],
            transaction: t,
          }
        );

        // Step 3: Reload SellerProfile to get the full record
        const sellerProfileRecord = await SellerProfile.findByPk(
          verifiedSeller.id,
          { transaction: t }
        );

        if (!sellerProfileRecord) {
          throw new Error("Failed to create seller profile");
        }

        // Step 4: Update VerifiedSellers with the correct sellerId
        verifiedSeller.sellerId = sellerProfileRecord.id;
        await verifiedSeller.save({ transaction: t });

        // Step 5: Create Store
        await Store.create(
          {
            sellerId: sellerProfileRecord.id,
            ...store,
          },
          { transaction: t }
        );

        // Step 6: Create BankDetail
        await BankDetail.create(
          {
            sellerId: sellerProfileRecord.id,
            ...bankDetails,
          },
          { transaction: t }
        );

        // Step 7: Create Document
        await Document.create(
          {
            sellerId: sellerProfileRecord.id,
            ...documents,
          },
          { transaction: t }
        );

        console.log(
          `✅ Created complete seller profile for: ${sellerUser.phone_number}`
        );
      } else {
        console.log(
          `ℹ️  Seller user already exists: ${sellerUser.phone_number}`
        );
      }

      createdSellers.push(sellerUser);
    }

    // ------------------------------
    // 3. Create Buyer Users
    // ------------------------------
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
      {
        phone_number: "9876543221",
        email: "buyer2@jiffy.com",
        buyerProfile: {
          fullName: "Jane Smith",
          phone: "9876543221",
          address: "456 Customer Avenue",
          city: "Delhi",
          state: "Delhi",
          zipCode: "110001",
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

      // Update password if user exists but doesn't have one
      if (!buyerCreated && !buyerUser.password) {
        buyerUser.password = defaultPassword;
        await buyerUser.save({ transaction: t });
        console.log(`🔑 Updated password for existing buyer user: ${buyerUser.phone_number}`);
      }

      if (buyerCreated) {
        await (buyerUser as any).addRole(buyerRole, { transaction: t });
        console.log(`✅ Created buyer user: ${buyerUser.phone_number}`);

        // Create buyer profile
        await BuyerProfile.create(
          {
            userId: buyerUser.id,
            ...buyerProfile,
          },
          { transaction: t }
        );
        console.log(
          `✅ Created buyer profile for: ${buyerUser.phone_number}`
        );
      } else {
        console.log(`ℹ️  Buyer user already exists: ${buyerUser.phone_number}`);
      }
    }

    await t.commit();
    console.log("✅ Users, roles, and seller profiles seeded successfully.");
    console.log(`\n📋 Summary:`);
    console.log(`   - Admin: ${adminUser.phone_number}`);
    console.log(`   - Sellers: ${createdSellers.length} created`);
    console.log(`   - Buyers: ${buyers.length} created`);
    console.log(`\n🔑 Default password for all seeded users: Password123`);
  } catch (error) {
    await t.rollback();
    console.error("❌ Error seeding users:", error);
    throw error;
  }
}

// Only run if this file is executed directly (not imported)
const __filename = fileURLToPath(import.meta.url);
if (process.argv[1] === __filename) {
  seedUsers()
    .then(() => {
      console.log("✅ Seed users completed.");
      process.exit(0);
    })
    .catch((error) => {
      console.error("❌ Seed users failed:", error);
      process.exit(1);
    });
}

export default seedUsers;
