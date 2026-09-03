import { Router } from 'express';
import * as ctrl from '../controller/order/order.controller.js';
import { authenticate, requireSeller } from '../middleware/auth.js';
import { uploadMultiple } from '../middleware/upload.js';

const orderRouter = Router();

// Buyer can create orders and view their orders
orderRouter.post('/', authenticate, ctrl.createOrder);
orderRouter.get('/', authenticate, ctrl.listOrders);
orderRouter.get('/:id', authenticate, ctrl.getOrderById);

// Sellers can upload verification/dispatch images (min 1, max 3)
orderRouter.post('/:id/verification-images', authenticate, requireSeller, uploadMultiple, ctrl.uploadVerificationImages);
orderRouter.post('/:id/images', authenticate, requireSeller, uploadMultiple, ctrl.uploadVerificationImages);

// Sellers can update order status; Buyers can cancel their orders
orderRouter.patch('/:id/status', authenticate, ctrl.updateStatus);

// Upgrade order payment mode (Wallet, Online, or Mix)
orderRouter.post('/:id/upgrade-payment', authenticate, ctrl.upgradeOrderPayment);

export default orderRouter;
