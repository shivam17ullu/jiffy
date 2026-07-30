import { Router } from 'express';
import * as ctrl from '../controller/order/order.controller.js';
import { authenticate, requireSeller } from '../middleware/auth.js';

const orderRouter = Router();

// Buyer can create orders and view their orders
orderRouter.post('/', authenticate, ctrl.createOrder);
orderRouter.get('/', authenticate, ctrl.listOrders);
orderRouter.get('/:id', authenticate, ctrl.getOrderById);

// Sellers can update order status; Buyers can cancel their orders
orderRouter.patch('/:id/status', authenticate, ctrl.updateStatus);

export default orderRouter;
