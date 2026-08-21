import { Router } from "express";
import AdminController from "../controller/admin.controller.js";
import AdminCouponController from "../controller/coupon/admin.coupon.controller.js";
import { authenticate, authorize } from "../middleware/auth.js";

const adminRouter = Router();

adminRouter.use(authenticate);
adminRouter.use(authorize(["admin"]));

adminRouter.get("/sellers", AdminController.getSellers);
adminRouter.get("/sellers/:id", AdminController.getSellerDetails);
adminRouter.get("/sellers/:sellerId/dashboard", AdminController.getSellerDashboard);
adminRouter.delete("/sellers/:id", AdminController.deleteSeller);
adminRouter.get("/sellers/:id/docs", AdminController.getSellerDocuments);
adminRouter.patch("/sellers/:id/approve", AdminController.approveSeller);
adminRouter.get("/sellers/:sellerId/products", AdminController.getProducts);
adminRouter.get("/products", AdminController.getProducts);
adminRouter.patch("/products/:id/approve", AdminController.approveProduct);
adminRouter.get("/orders", AdminController.getSellersOrders);
adminRouter.get("/orders/:id", AdminController.getOrderDetail);
adminRouter.patch("/orders/:id/status", AdminController.updateOrderStatus);
adminRouter.get("/revenue", AdminController.getPlatformRevenue);
adminRouter.get("/revenue/sellers/:id", AdminController.getParticularSellerRevenue);
adminRouter.get("/wallets", AdminController.getWallets);

// Coupon Routes
adminRouter.post("/coupons", AdminCouponController.create);
adminRouter.get("/coupons", AdminCouponController.list);
adminRouter.get("/coupons/:id", AdminCouponController.getById);
adminRouter.put("/coupons/:id", AdminCouponController.update);
adminRouter.delete("/coupons/:id", AdminCouponController.delete);

export default adminRouter;