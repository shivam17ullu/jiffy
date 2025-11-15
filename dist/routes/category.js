import { Router } from 'express';
import * as ctrl from '../controller/product/category.controller.js';
import { authenticate } from '../middleware/auth.js';
const categoryRouter = Router();
categoryRouter.get('/', ctrl.list);
categoryRouter.get('/:id', ctrl.get);
categoryRouter.post('/', authenticate, ctrl.create); // protect as admin ideally
export default categoryRouter;
