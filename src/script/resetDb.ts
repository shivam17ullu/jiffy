import { jiffy } from "../config/sequelize.js";
import "../model/relations.js"; // Load all models and associations
import seedRoles from "./seedRoles.js";
import seedAdmin from "./seedAdmin.js";
import seedCategory from "./seedCategory.js";

async function resetDatabase() {
  try {
    console.log("⚠️  Starting Database Wipe & Reset...");
    console.log("🔗 Connecting to database: " + (process.env.DB_NAME || "default"));

    await jiffy.authenticate();
    console.log("✅ Database connection verified.");

    console.log("\n🧹 Truncating all tables...");
    await jiffy.query("SET FOREIGN_KEY_CHECKS = 0;");

    // Fetch all tables from the database dynamically
    const [tables] = (await jiffy.query("SHOW TABLES;")) as [Array<Record<string, string>>, unknown];

    for (const row of tables) {
      const tableName = Object.values(row)[0];
      if (tableName) {
        await jiffy.query(`TRUNCATE TABLE \`${tableName}\`;`);
        console.log(`   🗑️  Truncated table: ${tableName}`);
      }
    }

    await jiffy.query("SET FOREIGN_KEY_CHECKS = 1;");
    console.log("✅ All tables truncated successfully.\n");

    console.log("🌱 Starting Seeding Process...");
    console.log("─".repeat(50));

    // 1. Seed Roles
    console.log("📋 [1/3] Seeding Roles...");
    await seedRoles();
    console.log("");

    // 2. Seed Admin
    console.log("📋 [2/3] Seeding Super Admin...");
    await seedAdmin();
    console.log("");

    // 3. Seed Categories
    console.log("📋 [3/3] Seeding Categories...");
    await seedCategory();
    console.log("");

    console.log("─".repeat(50));
    console.log("🎉 Database wipe and re-seeding completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Database reset failed:", error);
    try {
      await jiffy.query("SET FOREIGN_KEY_CHECKS = 1;");
    } catch {
      // ignore rollback error on FK checks
    }
    process.exit(1);
  }
}

resetDatabase();
