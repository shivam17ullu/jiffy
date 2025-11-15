import { jiffy } from "../config/sequelize.js";
import { Role } from "../model/relations.js";
import { fileURLToPath } from "url";
async function seedRoles() {
    const t = await jiffy.transaction();
    try {
        console.log("⏳ Seeding roles...");
        const roles = [{ name: "admin" }, { name: "seller" }, { name: "buyer" }];
        for (const roleData of roles) {
            const [role, created] = await Role.findOrCreate({
                where: { name: roleData.name },
                defaults: roleData,
                transaction: t,
            });
            if (created) {
                console.log(`✅ Created role: ${role.name}`);
            }
            else {
                console.log(`ℹ️  Role already exists: ${role.name}`);
            }
        }
        await t.commit();
        console.log("✅ Roles seeded successfully.");
    }
    catch (error) {
        await t.rollback();
        console.error("❌ Error seeding roles:", error);
        throw error;
    }
}
// Only run if this file is executed directly (not imported)
const __filename = fileURLToPath(import.meta.url);
if (process.argv[1] === __filename) {
    seedRoles()
        .then(() => {
        console.log("✅ Seed roles completed.");
        process.exit(0);
    })
        .catch((error) => {
        console.error("❌ Seed roles failed:", error);
        process.exit(1);
    });
}
export default seedRoles;
