import { Router } from 'express';
import * as ctrl from '../controller/order/order.controller.js';
import { authenticate } from '../middleware/auth.js';
const orderRouter = Router();
orderRouter.post('/', authenticate, ctrl.createOrder);
orderRouter.get('/', authenticate, ctrl.listOrders);
orderRouter.get('/:id', authenticate, ctrl.getOrderById);
orderRouter.patch('/:id/status', authenticate, ctrl.updateStatus);
export default orderRouter;
