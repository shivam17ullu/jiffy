import * as service from '../../services/product/product.service.js';
import { Request, Response } from "express";

export const create = async (req: any, res: any) => {
  try {
    const sellerId = req.user.id; // ⭐ seller from JWT
    const product = await service.createProduct(req.body, sellerId);
    res.json({ success: true, data: product });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
};
export const list = async (req: any, res: Response) => {
  const params = {
    page: parseInt(req.query.page) || 1,
    limit: parseInt(req.query.limit) || 20,
    q: req.query.q,
    categoryId: req.query.categoryId ? +req.query.categoryId : undefined,
    minPrice: req.query.minPrice,
    maxPrice: req.query.maxPrice,
    sort: req.query.sort
  };
  const result = await service.listProducts(params);
  res.json({ success:true, ...result });
};

export const get = async (req: Request, res: Response) => {
  const product = await service.getProductById(+req.params.id);
  if (!product) return res.status(404).json({ success:false });
  res.json({ success:true, data: product });
};
