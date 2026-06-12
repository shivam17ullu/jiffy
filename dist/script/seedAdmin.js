import bcrypt from "bcryptjs";
import { fileURLToPath } from "url";
import { jiffy } from "../config/sequelize.js";
import { Role, User } from "../model/relations.js";
async function seedAdmin() {
    const t = await jiffy.transaction();
    try {
        console.log("⏳ Seeding admin user...");
        const adminRole = await Role.findOne({ where: { name: "admin" }, transaction: t });
        if (!adminRole) {
            throw new Error("Admin role not found.");
        }
        const adminPhone = process.env.ADMIN_PHONE;
        const adminEmail = process.env.ADMIN_EMAIL;
        const adminPassword = process.env.ADMIN_PASSWORD;
        if (!adminPhone || !adminEmail || !adminPassword) {
            throw new Error("Admin credentials (ADMIN_PHONE, ADMIN_EMAIL, ADMIN_PASSWORD) missing in env.");
        }
        const defaultPassword = await bcrypt.hash(adminPassword, 10);
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
            await adminUser.addRole(adminRole, { transaction: t });
            console.log(`✅ Created admin user`);
        }
        else {
            // Update the existing user just in case the credentials changed
            await adminUser.update({
                email: adminEmail,
                password: defaultPassword,
                is_active: true,
            }, { transaction: t });
            // Ensure they have the admin role
            const roles = await adminUser.getRoles({ transaction: t });
            const hasAdminRole = roles.some((r) => r.name === "admin");
            if (!hasAdminRole) {
                await adminUser.addRole(adminRole, { transaction: t });
            }
            console.log(`ℹ️ Admin user already exists. Updated credentials.`);
        }
        await t.commit();
        console.log("🎉 Admin seeded successfully!");
    }
    catch (err) {
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
