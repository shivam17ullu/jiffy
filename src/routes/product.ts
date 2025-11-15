import { Router } from 'express';
import * as ctrl from '../controller/product/product.controller.js';
import { authenticate } from '../middleware/auth.js';

const productRouter = Router();
productRouter.get('/', ctrl.list);
productRouter.get('/:id', ctrl.get);
productRouter.post('/', authenticate, ctrl.create); // protect
export default productRouter;
