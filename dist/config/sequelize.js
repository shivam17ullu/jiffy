import dotenv from "dotenv";
import { Sequelize } from "sequelize";
dotenv.config();
const DB_NAME = process.env.DB_NAME;
const DB_USER = process.env.DB_USER;
const DB_PASSWORD = process.env.DB_PASSWORD;
const DB_HOST = process.env.DB_HOST;
const DB_PORT = process.env.DB_PORT;
export const jiffy = new Sequelize(DB_NAME, DB_USER, DB_PASSWORD, {
    host: DB_HOST,
    port: Number(DB_PORT),
    dialect: "mysql",
    pool: {
        max: 50,
        min: 0,
        acquire: 60000,
        idle: 10000,
    },
    logging: false,
});
// Optional
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
jiffy.dialect.supports.schemas = true;
