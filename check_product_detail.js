import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function run() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  try {
    const [products] = await connection.execute("SELECT * FROM products WHERE id = 1");
    console.log("Product:", products);

    const [variants] = await connection.execute("SELECT * FROM product_variants WHERE productId = 1");
    console.log("Variants:", variants);

    const [prodCats] = await connection.execute("SELECT * FROM product_categories WHERE productId = 1");
    console.log("Product Categories:", prodCats);

  } catch (error) {
    console.error("Error executing queries:", error);
  } finally {
    await connection.end();
  }
}

run().catch(console.error);
