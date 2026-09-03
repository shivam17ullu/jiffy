import dotenv from "dotenv";
import { Op } from "sequelize";
import bcrypt from "bcryptjs";
import { fileURLToPath } from "url";
import { jiffy } from "../config/sequelize.js";
import { Role, User } from "../model/relations.js";

dotenv.config();

async function seedAdmin() {
	const t = await jiffy.transaction();

	try {
		console.log("⏳ Seeding admin user...");

		const [adminRole] = await Role.findOrCreate({
			where: { name: "admin" },
			defaults: { name: "admin" },
			transaction: t,
		});

		const adminPhone = process.env.ADMIN_PHONE?.trim();
		const adminEmail = process.env.ADMIN_EMAIL?.trim();
		const adminPassword = process.env.ADMIN_PASSWORD;

		if (!adminPhone || !adminEmail || !adminPassword) {
			throw new Error("Admin credentials (ADMIN_PHONE, ADMIN_EMAIL, ADMIN_PASSWORD) missing in .env.");
		}

		console.log(`ℹ️  Admin target email: "${adminEmail}", phone: "${adminPhone}"`);

		const defaultPassword = await bcrypt.hash(adminPassword, 10);

		// Search if user exists by either email or phone
		let adminUser = await User.findOne({
			where: {
				[Op.or]: [
					{ email: adminEmail },
					{ phone_number: adminPhone },
				],
			},
			transaction: t,
		});

		if (!adminUser) {
			adminUser = await User.create(
				{
					phone_number: adminPhone,
					email: adminEmail,
					password: defaultPassword,
					is_active: true,
					is_email_verified: true,
				},
				{ transaction: t }
			);
			await (adminUser as any).addRole(adminRole, { transaction: t });
			console.log(`✅ Created admin user successfully.`);
		} else {
			await adminUser.update(
				{
					phone_number: adminPhone,
					email: adminEmail,
					password: defaultPassword,
					is_active: true,
					is_email_verified: true,
				},
				{ transaction: t }
			);

			const roles = await (adminUser as any).getRoles({ transaction: t });
			const hasAdminRole = roles.some((r: any) => r.name === "admin");
			if (!hasAdminRole) {
				await (adminUser as any).addRole(adminRole, { transaction: t });
			}
			console.log(`ℹ️  Updated existing user with fresh credentials and admin role.`);
		}

		await t.commit();
		console.log("🎉 Admin seeded successfully!");
	} catch (err) {
		await t.rollback();
		console.error("❌ Error seeding admin:", err);
		throw err;
	}
}

// Only run if executed directly
const __filename = fileURLToPath(import.meta.url);
if (process.argv[1] === __filename) {
	seedAdmin().then(() => process.exit(0)).catch(() => process.exit(1));
}

export default seedAdmin;
