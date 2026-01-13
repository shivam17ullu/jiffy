import { Router } from 'express';
import * as ctrl from '../controller/order/order.controller.js';
import { authenticate, requireSeller } from '../middleware/auth.js';

const orderRouter = Router();

// Buyer can create orders and view their orders
orderRouter.post('/', authenticate, ctrl.createOrder);
orderRouter.get('/', authenticate, ctrl.listOrders);
orderRouter.get('/:id', authenticate, ctrl.getOrderById);

// Only sellers can update order status
orderRouter.patch('/:id/status', authenticate, requireSeller, ctrl.updateStatus);

export default orderRouter;
