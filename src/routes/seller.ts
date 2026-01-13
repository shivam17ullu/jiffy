import { Router } from 'express';
import * as statsCtrl from '../controller/seller/sellerStats.controller.js';
import { authenticate, requireSeller } from '../middleware/auth.js';

const sellerRouter = Router();

// All seller routes require authentication + seller role
sellerRouter.use(authenticate);
sellerRouter.use(requireSeller);
sellerRouter.get('/stats', statsCtrl.getStats);

export default sellerRouter;

