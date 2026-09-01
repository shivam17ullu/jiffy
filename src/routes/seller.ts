import { Router } from 'express';
import * as statsCtrl from '../controller/seller/sellerStats.controller.js';
import * as docsCtrl from '../controller/seller/sellerDocs.controller.js';
import * as profileCtrl from '../controller/seller/sellerProfile.controller.js';
import AuthController from '../controller/auth.controller.js';
import { authenticate, requireSeller } from '../middleware/auth.js';

const sellerRouter = Router();

// Public seller routes (no access token required)
sellerRouter.post('/refresh-token', AuthController.refreshSellerToken);

// All seller routes below require authentication + seller role
sellerRouter.use(authenticate);
sellerRouter.use(requireSeller);
sellerRouter.get('/stats', statsCtrl.getStats);
sellerRouter.get('/revenue/monthly', statsCtrl.getMonthlyRevenue);
sellerRouter.get('/refunds', statsCtrl.getRefundedOrders);
sellerRouter.get('/docs', docsCtrl.getDocs);
sellerRouter.post('/reupload-docs', docsCtrl.reuploadDocs);
sellerRouter.get('/profile', profileCtrl.getProfile);
sellerRouter.get('/me', profileCtrl.getProfile);
sellerRouter.get('/status', profileCtrl.getStatus);

export default sellerRouter;

