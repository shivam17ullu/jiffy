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
		const [adminUser, adminCreated] = await User.findOrCreate({
			where: { phone_number: adminPhone },
			defaults: {
				phone_number: adminPhone,
				email: adminEmail,
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
		const sellers: any[] = [];

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
						status: "approved",
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

				await BuyerProfile.create(
					{
						userId: buyerUser.id,
						...buyerProfile,
					},
					{ transaction: t }
				);

				console.log(`✅ Buyer created: ${buyerUser.phone_number}`);
			}
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
