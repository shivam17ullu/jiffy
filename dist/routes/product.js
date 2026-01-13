import { Router } from 'express';
import * as ctrl from '../controller/product/product.controller.js';
import { authenticate } from '../middleware/auth.js';
const productRouter = Router();
productRouter.get('/', ctrl.list);
// Specific routes must come before parameterized routes
productRouter.get('/seller/me', authenticate, ctrl.getSellerProducts);
productRouter.get('/:id', ctrl.get);
productRouter.post('/', authenticate, ctrl.create);
productRouter.put('/:id', authenticate, ctrl.update);
productRouter.delete('/:id', authenticate, ctrl.deleteProduct);
export default productRouter;
