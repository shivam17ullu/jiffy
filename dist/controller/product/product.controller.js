import * as service from '../../services/product/product.service.js';
/**
 * @swagger
 * /api/products:
 *   post:
 *     summary: Create a new product
 *     description: Create a new product (Seller only)
 *     tags: [Products]
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
 *               - categories
 *               - variants
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Blue Shirt"
 *               description:
 *                 type: string
 *                 example: "Premium cotton shirt"
 *               brand:
 *                 type: string
 *                 example: "Levis"
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["https://example.com/image1.jpg"]
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["shirt", "men"]
 *               categories:
 *                 type: array
 *                 items:
 *                   type: integer
 *                 example: [1, 2]
 *               variants:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     sku:
 *                       type: string
 *                     size:
 *                       type: string
 *                     color:
 *                       type: string
 *                     price:
 *                       type: number
 *                     mrp:
 *                       type: number
 *                     stock:
 *                       type: integer
 *     responses:
 *       200:
 *         description: Product created successfully
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 */
export const create = async (req, res) => {
    try {
        const sellerId = req.userId; // ⭐ seller from JWT
        const product = await service.createProduct(req.body, sellerId);
        res.json({ success: true, data: product });
    }
    catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};
/**
 * @swagger
 * /api/products:
 *   get:
 *     summary: Get list of products
 *     description: Get paginated list of products with filters and search
 *     tags: [Products]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Items per page
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         description: Search query (searches in name, description, brand)
 *       - in: query
 *         name: categoryId
 *         schema:
 *           type: integer
 *         description: Filter by category ID (includes subcategories and sub-subcategories)
 *       - in: query
 *         name: brand
 *         schema:
 *           type: string
 *         description: Filter by brand name
 *       - in: query
 *         name: minPrice
 *         schema:
 *           type: number
 *         description: Minimum price filter
 *       - in: query
 *         name: maxPrice
 *         schema:
 *           type: number
 *         description: Maximum price filter
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           enum: [price:ASC, price:DESC, name:ASC, name:DESC, createdAt:DESC, createdAt:ASC]
 *         description: Sort field and direction (format: field:direction)
 *     responses:
 *       200:
 *         description: List of products
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 items:
 *                   type: array
 *                   items:
 *                     type: object
 *                 total:
 *                   type: integer
 *                 page:
 *                   type: integer
 *                 limit:
 *                   type: integer
 *                 totalPages:
 *                   type: integer
 */
export const list = async (req, res) => {
    const params = {
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 20,
        q: req.query.q,
        categoryId: req.query.categoryId ? +req.query.categoryId : undefined,
        brand: req.query.brand,
        minPrice: req.query.minPrice,
        maxPrice: req.query.maxPrice,
        sort: req.query.sort
    };
    const result = await service.listProducts(params);
    res.json({ success: true, ...result });
};
/**
 * @swagger
 * /api/products/my-products:
 *   get:
 *     summary: Get seller's products
 *     description: Get paginated list of products for the authenticated seller
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Items per page
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         description: Search query
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *         description: Sort options
 *     responses:
 *       200:
 *         description: List of seller products
 */
export const getSellerProducts = async (req, res) => {
    try {
        const sellerId = req.userId;
        const params = {
            page: parseInt(req.query.page) || 1,
            limit: parseInt(req.query.limit) || 20,
            q: req.query.q,
            categoryId: req.query.categoryId ? +req.query.categoryId : undefined,
            brand: req.query.brand,
            minPrice: req.query.minPrice,
            maxPrice: req.query.maxPrice,
            sort: req.query.sort
        };
        const result = await service.listSellerProducts(sellerId, params);
        res.json({ success: true, ...result });
    }
    catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};
/**
 * @swagger
 * /api/products/{id}:
 *   get:
 *     summary: Get product by ID
 *     description: Get detailed product information including seller details, variants, and categories
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Product ID
 *     responses:
 *       200:
 *         description: Product details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     name:
 *                       type: string
 *                     description:
 *                       type: string
 *                     brand:
 *                       type: string
 *                     images:
 *                       type: array
 *                       items:
 *                         type: string
 *                     tags:
 *                       type: array
 *                       items:
 *                         type: string
 *                     priceRange:
 *                       type: object
 *                       properties:
 *                         min:
 *                           type: number
 *                         max:
 *                           type: number
 *                     variants:
 *                       type: array
 *                       items:
 *                         type: object
 *                     categories:
 *                       type: array
 *                       items:
 *                         type: object
 *                     seller:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: integer
 *                         phone_number:
 *                           type: string
 *                         email:
 *                           type: string
 *                         profile:
 *                           type: object
 *       404:
 *         description: Product not found
 */
export const get = async (req, res) => {
    const product = await service.getProductById(+req.params.id);
    if (!product)
        return res.status(404).json({ success: false, message: "Product not found" });
    res.json({ success: true, data: product });
};
/**
 * @swagger
 * /api/products/{id}:
 *   put:
 *     summary: Update product
 *     description: Update product details (Seller only)
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Product updated successfully
 *       403:
 *         description: Forbidden - Not the owner
 *       404:
 *         description: Product not found
 */
export const update = async (req, res) => {
    try {
        const productId = parseInt(req.params.id);
        const sellerId = req.userId;
        const result = await service.updateProduct(productId, sellerId, req.body);
        if (!result) {
            return res.status(404).json({ success: false, message: "Product not found or unauthorized" });
        }
        res.json({ success: true, data: result });
    }
    catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};
/**
 * @swagger
 * /api/products/{id}:
 *   delete:
 *     summary: Delete product
 *     description: Delete a product (Seller only)
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Product deleted successfully
 *       403:
 *         description: Forbidden - Not the owner
 *       404:
 *         description: Product not found
 */
export const deleteProduct = async (req, res) => {
    try {
        const productId = parseInt(req.params.id);
        const sellerId = req.userId;
        const result = await service.deleteProduct(productId, sellerId);
        if (!result) {
            return res.status(404).json({ success: false, message: "Product not found or unauthorized" });
        }
        res.json({ success: true, message: "Product deleted successfully" });
    }
    catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};
