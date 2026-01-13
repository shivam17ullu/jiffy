import { Router } from 'express';
import * as ctrl from '../controller/product/product.controller.js';
import { authenticate, requireSeller, optionalAuthenticate } from '../middleware/auth.js';
import { uploadMultiple } from '../middleware/upload.js';

const productRouter = Router();

// Public routes (with optional authentication for wishlist status)
productRouter.get('/', optionalAuthenticate, ctrl.list); // Optional auth - will use userId if authenticated
productRouter.get('/:id', optionalAuthenticate, ctrl.get); // Optional auth - will use userId if authenticated

// Seller-only routes (require authentication + seller role)
productRouter.get('/seller/me', authenticate, requireSeller, ctrl.getSellerProducts);
productRouter.post('/', authenticate, requireSeller, uploadMultiple, ctrl.create);
productRouter.put('/:id', authenticate, requireSeller, uploadMultiple, ctrl.update);
productRouter.delete('/:id', authenticate, requireSeller, ctrl.deleteProduct);

export default productRouter;
