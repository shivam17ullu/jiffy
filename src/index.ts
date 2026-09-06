import bodyParser from 'body-parser';
import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import { createServer } from 'http';
import { jiffy } from './config/sequelize.js';
import { initSocket } from './services/socket/socket.service.js';
import authRouter from './routes/auth.js';
const app = express();

import swaggerUi from "swagger-ui-express";
import swaggerFile from "./config/swagger-output.json" with { type: "json" };
import cartRouter from './routes/cart.js';
import categoryRouter from './routes/category.js';
import locationRouter from './routes/location.js';
import orderRouter from './routes/order.js';
import productRouter from './routes/product.js';
import profileRouter from "./routes/profile.js";
import sellerRouter from './routes/seller.js';
import storeRouter from './routes/store.js';
import wishlistRouter from './routes/wishlist.js';
import notificationRouter from './routes/notification.js';
import walletRouter from './routes/wallet.js';
import returnExchangeRouter from './routes/returnExchange.js';
import couponRouter from './routes/coupon.js';
import { globalErrorHandler } from './middleware/errorHandler.js';




// Increase body size limits for JSON and URL-encoded data
// Load environment variables first
dotenv.config();

app.use(bodyParser.json({
	limit: '150mb',
	verify: (req: any, res, buf) => {
		req.rawBody = buf;
	}
}));
app.use(bodyParser.urlencoded({ extended: true, limit: '150mb' }));
app.use(express.json({
	limit: '150mb',
	verify: (req: any, res, buf) => {
		req.rawBody = buf;
	}
}));
app.use(express.urlencoded({ extended: true, limit: '150mb' }));
app.use(cors({
	origin: true,
	credentials: true,
	methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'],
	allowedHeaders: [
		'Content-Type',
		'Authorization',
		'X-Requested-With',
		'Accept',
		'Origin',
		'Access-Control-Request-Method',
		'Access-Control-Request-Headers',
		'x-client-platform',
		'x-app-version',
		'User-Agent'
	],
}));
import adminRouter from './routes/admin.js';
import paymentRouter from './routes/payment.js';

app.use('/api/auth', authRouter);
app.use("/api/profile", profileRouter);
app.use("/api/stores", storeRouter);
app.use('/api/categories', categoryRouter)
app.use("/api/cart", cartRouter)
app.use("/api/products", productRouter)
app.use("/api/orders", orderRouter)
app.use("/api/location", locationRouter)
app.use("/api/wishlist", wishlistRouter)
app.use("/api/notifications", notificationRouter)
app.use("/api/seller", sellerRouter)
app.use("/api/admin", adminRouter)
app.use("/api/wallet", walletRouter)
app.use("/api/return-exchange", returnExchangeRouter)
app.use("/api/coupons", couponRouter)
app.use("/api", paymentRouter)

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerFile));
app.use(globalErrorHandler);

const startServer = async () => {
	try {
		await jiffy.authenticate();
		await jiffy.sync({ alter: true });
		console.log('Connection to both databases has been established successfully.');
		const port = process.env.PORT || 3000;
		const server = createServer(app);
		server.keepAliveTimeout = 65000;
		server.headersTimeout = 66000;
		server.requestTimeout = 300000; // 5 minutes timeout for large mobile uploads
		initSocket(server);
		server.listen(port, () => {
			console.log(`PORT is running on ${port} with WebSockets enabled`);
		});
	} catch (error) {
		console.error('Unable to connect to the databases:', error);
	}
};

startServer();