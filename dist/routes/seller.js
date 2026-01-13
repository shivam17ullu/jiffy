import { Router } from 'express';
import * as statsCtrl from '../controller/seller/sellerStats.controller.js';
import { authenticate } from '../middleware/auth.js';
const sellerRouter = Router();
sellerRouter.use(authenticate);
sellerRouter.get('/stats', statsCtrl.getStats);
export default sellerRouter;
