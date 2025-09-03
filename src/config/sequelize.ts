import { Sequelize } from "sequelize";
import dotenv from "dotenv";

dotenv.config();

const DB_NAME = process.env.DB_NAME as string;
const DB_USER = process.env.DB_USER as string;
const DB_PASSWORD = process.env.DB_PASSWORD as string;
const DB_HOST = process.env.DB_HOST as string;

export const jiffy = new Sequelize(DB_NAME, DB_USER, DB_PASSWORD, {
  host: DB_HOST,
  dialect: "mysql",
  pool: {
    max: 50,
    min: 0,
    acquire: 60000, // Increase the acquire timeout (in milliseconds)
    idle: 10000,
  },
  logging: false, // disable SQL logs (optional, can be enabled for debugging)
});

// Optional: to avoid TS errors when setting schema support manually
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
jiffy.dialect.supports.schemas = true;
