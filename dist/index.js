import express from 'express';
const app = express();
import bodyParser from 'body-parser';
import cors from 'cors';
import dotenv from 'dotenv';
import { jiffy } from './config/sequelize';
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());
app.use(cors());
dotenv.config();
const startServer = async () => {
    try {
        await jiffy.authenticate();
        console.log('Connection to both databases has been established successfully.');
        const port = process.env.PORT || 3000;
        app.listen(port, () => {
            console.log(`PORT is running on ${port}`);
        });
    }
    catch (error) {
        console.error('Unable to connect to the databases:', error);
    }
};
startServer();
