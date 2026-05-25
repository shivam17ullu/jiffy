import { jiffy } from "../config/sequelize.js";
import "../model/relations.js"; // Load all models and associations
async function syncDatabase() {
    try {
        console.log("⏳ Connecting to the database and syncing models...");
        // Test connection
        await jiffy.authenticate();
        console.log("✅ Database connection established successfully.");
        // Sync all models (create tables if they don't exist, or alter them to match models)
        await jiffy.sync({ alter: true });
        console.log("✅ Database schema synced successfully (tables created/updated).");
        process.exit(0);
    }
    catch (error) {
        console.error("❌ Database sync failed:", error);
        process.exit(1);
    }
}
syncDatabase();
