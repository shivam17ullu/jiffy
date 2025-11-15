import * as service from '../../services/order/order.service.js';
import { Request, Response } from "express";

export const createOrder = async (req: any, res: Response) => {
  try {
    const userId = req.user.id;
    const { shippingAddress, paymentInfo } = req.body;
    const order = await service.createOrderFromCart(userId, shippingAddress, paymentInfo);
    res.status(201).json({ success:true, data: order });
  } catch (err: any) { res.status(400).json({ success:false, message: err.message }); }
};
