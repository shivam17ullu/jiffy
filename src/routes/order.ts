import { Router } from 'express';
import * as ctrl from '../controller/order/order.controller.js';
import { handleDelivarWebhook } from '../controller/order/delivarWebhook.controller.js';
import { authenticate, requireSeller } from '../middleware/auth.js';
import { uploadMultiple } from '../middleware/upload.js';

const orderRouter = Router();

// Delivar Webhook (Public route authenticated via Secret Key / Signature)
orderRouter.post('/webhooks/delivar', handleDelivarWebhook);


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

// Store or update order tracking / booking details (Buyer or Seller)
orderRouter.post('/:id/tracking', authenticate, ctrl.updateTrackingDetails);
orderRouter.patch('/:id/tracking', authenticate, ctrl.updateTrackingDetails);
orderRouter.put('/:id/tracking', authenticate, ctrl.updateTrackingDetails);
orderRouter.post('/:id/booking-details', authenticate, ctrl.updateTrackingDetails);
orderRouter.patch('/:id/booking-details', authenticate, ctrl.updateTrackingDetails);
orderRouter.put('/:id/booking-details', authenticate, ctrl.updateTrackingDetails);

export default orderRouter;

