import * as service from '../../services/product/category.service.js';
export const create = async (req, res) => {
    try {
        const { name, parentId, level } = req.body;
        const cat = await service.createCategory(name, parentId ?? null, level);
        res.status(201).json({ success: true, data: cat });
    }
    catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};
export const list = async (req, res) => {
    const cats = await service.getAllCategories();
    res.json({ success: true, data: cats });
};
export const get = async (req, res) => {
    const cat = await service.getCategoryById(+req.params.id);
    if (!cat)
        return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: cat });
};
