import { Router } from 'express';
import * as ctrl from '../controller/order/order.controller.js';
import { authenticate } from '../middleware/auth.js';

const orderRouter = Router();
orderRouter.post('/', authenticate, ctrl.createOrder);
export default orderRouter;
