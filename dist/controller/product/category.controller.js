import * as service from '../../services/product/category.service.js';
/**
 * @swagger
 * /api/categories:
 *   post:
 *     summary: Create a new category
 *     description: Create a new category (Admin only - should add authorization)
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - level
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Electronics"
 *               parentId:
 *                 type: integer
 *                 nullable: true
 *                 description: Parent category ID (for subcategories)
 *               level:
 *                 type: integer
 *                 enum: [0, 1, 2]
 *                 description: Category level (0=root, 1=subcategory, 2=sub-subcategory)
 *     responses:
 *       201:
 *         description: Category created successfully
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 */
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
/**
 * @swagger
 * /api/categories:
 *   get:
 *     summary: Get list of categories
 *     description: Get all categories with optional filtering by level and parentId
 *     tags: [Categories]
 *     parameters:
 *       - in: query
 *         name: level
 *         schema:
 *           type: integer
 *           enum: [0, 1, 2]
 *         description: Filter by category level
 *       - in: query
 *         name: parentId
 *         schema:
 *           type: integer
 *         description: Filter by parent category ID
 *     responses:
 *       200:
 *         description: List of categories
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       name:
 *                         type: string
 *                       slug:
 *                         type: string
 *                       level:
 *                         type: integer
 *                       parentId:
 *                         type: integer
 *                       isActive:
 *                         type: boolean
 */
// GET /api/categories
export const list = async (req, res) => {
    try {
        const level = req.query.level ? Number(req.query.level) : undefined;
        const parentId = req.query.parentId ? Number(req.query.parentId) : undefined;
        const cats = await service.getAllCategories({ level, parentId });
        res.json({ success: true, data: cats });
    }
    catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
/**
 * @swagger
 * /api/categories/{id}:
 *   get:
 *     summary: Get category by ID
 *     description: Get detailed information about a specific category
 *     tags: [Categories]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Category ID
 *     responses:
 *       200:
 *         description: Category details
 *       404:
 *         description: Category not found
 */
export const get = async (req, res) => {
    const cat = await service.getCategoryById(+req.params.id);
    if (!cat)
        return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: cat });
};
