import { Router } from 'express';
import * as statsCtrl from '../controller/seller/sellerStats.controller.js';
import * as docsCtrl from '../controller/seller/sellerDocs.controller.js';
import * as profileCtrl from '../controller/seller/sellerProfile.controller.js';
import { authenticate, requireSeller } from '../middleware/auth.js';

const sellerRouter = Router();

// All seller routes require authentication + seller role
sellerRouter.use(authenticate);
sellerRouter.use(requireSeller);
sellerRouter.get('/stats', statsCtrl.getStats);
sellerRouter.get('/docs', docsCtrl.getDocs);
sellerRouter.get('/status', profileCtrl.getStatus);

export default sellerRouter;

