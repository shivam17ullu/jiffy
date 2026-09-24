import bcrypt from "bcryptjs";
import { fileURLToPath } from "url";
import { jiffy } from "../config/sequelize.js";
import {
	BankDetail,
	BuyerProfile,
	Document,
	Role,
	SellerProfile,
	Store,
	User,
	VerifiedSellers,
} from "../model/relations.js";

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

		const adminPhone = process.env.ADMIN_PHONE;
		const adminEmail = process.env.ADMIN_EMAIL;
		const adminPassword = process.env.ADMIN_PASSWORD;

		if (!adminPhone || !adminEmail || !adminPassword) {
			throw new Error("Admin credentials (ADMIN_PHONE, ADMIN_EMAIL, ADMIN_PASSWORD) missing in env.");
		}

		const defaultPassword = await bcrypt.hash(adminPassword, 10);

		// ----------------------------------------------------------------
		// ADMIN USER
		// ----------------------------------------------------------------
		const [adminUser] = await User.findOrCreate({
			where: { phone_number: adminPhone },
			defaults: {
				phone_number: adminPhone,
				email: adminEmail,
				password: defaultPassword,
				is_active: true,
				is_email_verified: true,
			},
			transaction: t,
		});

		const adminRoles = await (adminUser as any).getRoles({ transaction: t });
		if (!adminRoles.some((r: any) => r.name === "admin")) {
			await (adminUser as any).addRole(adminRole, { transaction: t });
		}
		console.log(`✅ Admin user seeded (${adminUser.phone_number})`);

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
			const [sellerUser] = await User.findOrCreate({
				where: { phone_number: userData.phone_number },
				defaults: {
					...userData,
					password: defaultPassword,
					is_active: true,
					is_email_verified: true,
				},
				transaction: t,
			});

			const userRoles = await (sellerUser as any).getRoles({ transaction: t });
			if (!userRoles.some((r: any) => r.name === "seller")) {
				await (sellerUser as any).addRole(sellerRole, { transaction: t });
			}

			// 2️⃣ Create or find SellerProfile
			const [sellerProfileRecord] = await SellerProfile.findOrCreate({
				where: { userId: sellerUser.id },
				defaults: {
					userId: sellerUser.id,
					...sellerProfile,
				},
				transaction: t,
			});

			// 3️⃣ VerifiedSeller
			await VerifiedSellers.findOrCreate({
				where: { sellerId: sellerProfileRecord.id },
				defaults: {
					sellerId: sellerProfileRecord.id,
					is_active: true,
					status: "approved",
				},
				transaction: t,
			});

			// 4️⃣ Store
			await Store.findOrCreate({
				where: { sellerId: sellerProfileRecord.id },
				defaults: {
					sellerId: sellerProfileRecord.id,
					...store,
				},
				transaction: t,
			});

			// 5️⃣ Bank Details
			await BankDetail.findOrCreate({
				where: { sellerId: sellerProfileRecord.id },
				defaults: {
					sellerId: sellerProfileRecord.id,
					...bankDetails,
				},
				transaction: t,
			});

			// 6️⃣ Documents
			await Document.findOrCreate({
				where: { sellerId: sellerProfileRecord.id },
				defaults: {
					sellerId: sellerProfileRecord.id,
					...documents,
				},
				transaction: t,
			});

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

			const [buyerUser] = await User.findOrCreate({
				where: { phone_number: userData.phone_number },
				defaults: {
					...userData,
					password: defaultPassword,
					is_active: true,
					is_email_verified: true,
				},
				transaction: t,
			});

			const userRoles = await (buyerUser as any).getRoles({ transaction: t });
			if (!userRoles.some((r: any) => r.name === "buyer")) {
				await (buyerUser as any).addRole(buyerRole, { transaction: t });
			}

			await BuyerProfile.findOrCreate({
				where: { userId: buyerUser.id },
				defaults: {
					userId: buyerUser.id,
					...buyerProfile,
				},
				transaction: t,
			});

			console.log(`✅ Buyer seeded: ${buyerUser.phone_number}`);
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
