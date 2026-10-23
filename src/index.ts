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
import brandRouter from './routes/brand.js';
import { globalErrorHandler } from './middleware/errorHandler.js';




// Load environment variables first
if (process.env.NODE_ENV) {
	dotenv.config({ path: `.env.${process.env.NODE_ENV}` });
}
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
app.use('/api/brands', brandRouter)
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
		console.log('Connecting to database...');
		await jiffy.authenticate();
		console.log('Database connected successfully.');

		if (process.env.NODE_ENV !== 'production' && process.env.DB_SYNC === 'true') {
			console.log('Syncing database schema...');
			await jiffy.sync({ alter: true });
			console.log('Database schema synced successfully.');
		}

		const portArgIndex = process.argv.findIndex(arg => arg === '--port' || arg.startsWith('--port='));
		let cliPort: number | undefined;
		if (portArgIndex !== -1) {
			const arg = process.argv[portArgIndex];
			if (arg.startsWith('--port=')) {
				cliPort = Number(arg.split('=')[1]);
			} else if (process.argv[portArgIndex + 1]) {
				cliPort = Number(process.argv[portArgIndex + 1]);
			}
		}
		const port = cliPort || Number(process.env.PORT) || 3000;
		const hostArgIndex = process.argv.findIndex(arg => arg === '--host' || arg.startsWith('--host='));
		let host = process.env.HOST || '0.0.0.0';
		if (hostArgIndex !== -1) {
			const arg = process.argv[hostArgIndex];
			if (arg.startsWith('--host=')) {
				host = arg.split('=')[1];
			} else if (process.argv[hostArgIndex + 1]) {
				host = process.argv[hostArgIndex + 1];
			}
		}

		const server = createServer(app);
		server.keepAliveTimeout = 65000;
		server.headersTimeout = 66000;
		server.requestTimeout = 300000; // 5 minutes timeout for large mobile uploads
		initSocket(server);
		server.listen(port, host, () => {
			console.log(`Server is running with WebSockets enabled:`);
			console.log(`- Local:   http://localhost:${port}`);
			if (host !== 'localhost' && host !== '127.0.0.1') {
				console.log(`- Network: http://${host === '0.0.0.0' ? '192.168.29.177' : host}:${port}`);
			}
		});
	} catch (error) {
		console.error('Unable to connect to the databases:', error);
	}
};

startServer();