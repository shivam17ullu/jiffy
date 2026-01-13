import { Router } from 'express';
import * as ctrl from '../controller/wishlist/wishlist.controller.js';
import { authenticate } from '../middleware/auth.js';
const wishlistRouter = Router();
// All wishlist routes require authentication
wishlistRouter.use(authenticate);
wishlistRouter.get('/', ctrl.getWishlist);
wishlistRouter.post('/', ctrl.addToWishlist);
wishlistRouter.delete('/:productId', ctrl.removeFromWishlist);
wishlistRouter.get('/check/:productId', ctrl.checkWishlist);
export default wishlistRouter;
