import { jiffy } from "../config/sequelize.js";
import { QueryTypes } from "sequelize";

interface IndexRow {
  TABLE_NAME: string;
  INDEX_NAME: string;
  COLUMN_NAME: string;
  NON_UNIQUE: number;
}

async function fixIndexes() {
  try {
    console.log("⏳ Connecting to the database...");
    await jiffy.authenticate();
    console.log("✅ Database connection established.");

    const dbName = jiffy.getDatabaseName();
    console.log(`🔍 Checking indexes for database: ${dbName}`);

    // Fetch all non-primary indexes
    const indexes: IndexRow[] = await jiffy.query(
      `SELECT TABLE_NAME, INDEX_NAME, COLUMN_NAME, NON_UNIQUE 
       FROM INFORMATION_SCHEMA.STATISTICS 
       WHERE TABLE_SCHEMA = :dbName 
       AND INDEX_NAME != 'PRIMARY'`,
      {
        replacements: { dbName },
        type: QueryTypes.SELECT,
      }
    );

    // Group by TABLE_NAME and COLUMN_NAME
    const tableColumnIndexes = new Map<string, string[]>();

    for (const row of indexes) {
      const key = `${row.TABLE_NAME}.${row.COLUMN_NAME}`;
      if (!tableColumnIndexes.has(key)) {
        tableColumnIndexes.set(key, []);
      }
      const list = tableColumnIndexes.get(key)!;
      if (!list.includes(row.INDEX_NAME)) {
        list.push(row.INDEX_NAME);
      }
    }

    // Identify tables and redundant indexes
    let droppedCount = 0;
    for (const [key, indexNames] of tableColumnIndexes.entries()) {
      const [tableName, columnName] = key.split(".");
      if (indexNames.length > 1) {
        console.log(`⚠️  Found ${indexNames.length} indexes on ${tableName}.${columnName}:`, indexNames);
        // Keep the first one or named constraint, drop the rest
        const toKeep = indexNames[0];
        const toDrop = indexNames.slice(1);

        for (const idx of toDrop) {
          try {
            console.log(`  🗑️ Dropping redundant index \`${idx}\` on table \`${tableName}\`...`);
            await jiffy.query(`ALTER TABLE \`${tableName}\` DROP INDEX \`${idx}\``);
            droppedCount++;
          } catch (err: any) {
            console.error(`  ❌ Failed to drop index \`${idx}\` on \`${tableName}\`:`, err.message);
          }
        }
      }
    }

    console.log(`\n🎉 Finished! Dropped ${droppedCount} redundant index(es).`);
    process.exit(0);
  } catch (error) {
    console.error("❌ Failed to fix indexes:", error);
    process.exit(1);
  }
}

fixIndexes();
