import Sequelize from 'sequelize';
import dotenv from 'dotenv';
dotenv.config();

export const jiffy = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASSWORD, {
    host:  process.env.DB_HOST,
    dialect: 'mysql',
    pool: {
        max: 50,
        min: 0,
        acquire: 60000, // Increase the acquire timeout (in milliseconds)
        idle: 10000
    }
});
jiffy.dialect.supports.schemas = true;
3