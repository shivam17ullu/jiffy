import { Router } from 'express';
import * as ctrl from '../controller/product/product.controller.js';
import { authenticate, requireSeller } from '../middleware/auth.js';
import { uploadMultiple } from '../middleware/upload.js';

const productRouter = Router();

// Public routes
productRouter.get('/', ctrl.list);
productRouter.get('/:id', ctrl.get);

// Seller-only routes (require authentication + seller role)
productRouter.get('/seller/me', authenticate, requireSeller, ctrl.getSellerProducts);
productRouter.post('/', authenticate, requireSeller, uploadMultiple, ctrl.create);
productRouter.put('/:id', authenticate, requireSeller, uploadMultiple, ctrl.update);
productRouter.delete('/:id', authenticate, requireSeller, ctrl.deleteProduct);

export default productRouter;
