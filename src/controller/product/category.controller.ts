import * as service from '../../services/product/category.service.js';
import { Request, Response } from "express";

export const create = async (req: Request, res: Response) => {
  try {
    const { name, parentId, level } = req.body;
    const cat = await service.createCategory(name, parentId ?? null, level);
    res.status(201).json({ success: true, data: cat });
  } catch (err:any) { res.status(400).json({ success: false, message: err.message }); }
};

// GET /api/categories
export const list = async (req: Request, res: Response) => {
  try {
    const level = req.query.level ? Number(req.query.level) : undefined;
    const parentId = req.query.parentId ? Number(req.query.parentId) : undefined;

    const cats = await service.getAllCategories({ level, parentId });

    res.json({ success: true, data: cats });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};


export const get = async (req: Request, res: Response) => {
  const cat = await service.getCategoryById(+req.params.id);
  if (!cat) return res.status(404).json({ success: false, message: 'Not found' });
  res.json({ success: true, data: cat });
};
