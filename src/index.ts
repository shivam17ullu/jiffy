import express from 'express';
const app = express();
import bodyParser from 'body-parser';
import cors from 'cors';
import dotenv from 'dotenv';
import { jiffy } from './config/sequelize.js';
import authRouter from './routes/auth.js';

import swaggerUi from "swagger-ui-express";
import swaggerFile from "./config/swagger-output.json" assert { type: "json" };
import profileRouter from "./routes/profile.js";
import storeRouter from './routes/store.js';
import categoryRouter from './routes/category.js';
import cartRouter from './routes/cart.js';
import productRouter from './routes/product.js';
import orderRouter from './routes/order.js';
import locationRouter from './routes/location.js';
import wishlistRouter from './routes/wishlist.js';
import sellerRouter from './routes/seller.js';



// Increase body size limits for JSON and URL-encoded data
// Load environment variables first
dotenv.config();

app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(cors());
app.use('/api/auth', authRouter);
app.use("/api/profile", profileRouter);
app.use("/api/stores", storeRouter);
app.use('/api/categories', categoryRouter)
app.use("/api/cart", cartRouter)
app.use("/api/products", productRouter)
app.use("/api/orders", orderRouter)
app.use("/api/location", locationRouter)
app.use("/api/wishlist", wishlistRouter)
app.use("/api/seller", sellerRouter)
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerFile));

const startServer = async () => {
  try {
    await jiffy.authenticate();
    await jiffy.sync({ alter: true });
    console.log('Connection to both databases has been established successfully.');
    const port = process.env.PORT || 3000;
    app.listen(port, () => {
      console.log(`PORT is running on ${port}`);
    });
  } catch (error) {
    console.error('Unable to connect to the databases:', error);
  }
};

startServer();