import * as service from '../../services/product/product.service.js';
import { Response } from "express";
import {
  handleControllerError,
  sendError,
  sendValidationError,
} from "../../middleware/responseHandler.js";
import { uploadMultiple } from '../../middleware/upload.js';
import { uploadMultipleToS3, uploadMultipleBase64ToS3, deleteFromS3 } from '../../utils/s3Upload.js';
import { Product } from '../../model/relations.js';

/**
 * @swagger
 * /api/products:
 *   post:
 *     summary: Create a new product
 *     description: Create a new product (Seller only). Images can be uploaded as files (multipart/form-data) or provided as URLs in the request body.
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
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
 *               details:
 *                 type: string
 *                 example: "100% Cotton, Premium Quality"
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 description: Product images (files will be uploaded to S3)
 *               tags:
 *                 type: string
 *                 example: "shirt,men"
 *                 description: Comma-separated tags
 *               categories:
 *                 type: string
 *                 example: "[1,2]"
 *                 description: JSON array string of category IDs
 *               variants:
 *                 type: string
 *                 example: '[{"sku":"BS-S-M","size":"M","color":"Blue","price":500,"mrp":800,"stock":100,"isStock":true,"isDefault":true}]'
 *                 description: JSON array string of variant objects
 *     responses:
 *       200:
 *         description: Product created successfully. Images uploaded to S3 and URLs stored in product.
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Seller role required
 */
export const create = async (req: any, res: any) => {
  try {
    const sellerId = req.userId;
    let productData = { ...req.body };

    if (!productData.name) {
      return sendValidationError(res, "Product name is required", "name");
    }
    if (!productData.categories) {
      return sendValidationError(res, "At least one category is required", "categories");
    }
    if (!productData.variants) {
      return sendValidationError(res, "At least one variant is required", "variants");
    }

    // Parse categories if it's a string
    if (typeof productData.categories === 'string') {
      try {
        productData.categories = JSON.parse(productData.categories);
      } catch (e) {
        // If parsing fails, try splitting by comma
        productData.categories = productData.categories.split(',').map((id: string) => parseInt(id.trim())).filter((id: number) => !isNaN(id));
      }
    }

    // Parse variants if it's a string
    if (typeof productData.variants === 'string') {
      try {
        productData.variants = JSON.parse(productData.variants);
      } catch (e) {
        throw new Error('Invalid variants format. Must be valid JSON array.');
      }
    }

    // Parse tags if it's a string
    if (typeof productData.tags === 'string') {
      try {
        productData.tags = JSON.parse(productData.tags);
      } catch (e) {
        // If parsing fails, split by comma
        productData.tags = productData.tags.split(',').map((tag: string) => tag.trim()).filter((tag: string) => tag.length > 0);
      }
    }

    // We no longer use product-level images from req.files, but leaving it for backwards compatibility if needed, though they won't be saved to the product anymore.
    // We will process images inside each variant directly.

    // Process variant images
    for (const variant of productData.variants) {
      if (!variant.images || !Array.isArray(variant.images) || variant.images.length < 2 || variant.images.length > 4) {
        return sendValidationError(res, "Each variant must have between 2 and 4 images", "variants");
      }

      const uploadedImages = [];
      const base64ImagesToUpload = [];

      // Separate existing URLs from new base64 images
      for (const img of variant.images) {
        if (typeof img === 'string' && (img.startsWith('data:image') || (img.length > 100 && !img.startsWith('http')))) {
          base64ImagesToUpload.push(img);
        } else if (typeof img === 'string' && img.startsWith('http')) {
          uploadedImages.push(img);
        }
      }

      // Upload base64 images
      if (base64ImagesToUpload.length > 0) {
        const base64Urls = await uploadMultipleBase64ToS3(base64ImagesToUpload, 'products');
        uploadedImages.push(...base64Urls);
      }

      // Replace variant images with uploaded URLs
      variant.images = uploadedImages;
    }

    // Create product
    const product = await service.createProduct(productData, sellerId);
    res.json({ success: true, data: product });
  } catch (err: unknown) {
    return handleControllerError(res, err);
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
 *       - in: query
 *         name: filter
 *         schema:
 *           type: string
 *         description: Filter by category ID
 *       - in: query
 *         name: storeName
 *         schema:
 *           type: string
 *         description: Filter by store/business name
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
export const list = async (req: any, res: Response) => {
  const params = {
    page: parseInt(req.query.page) || 1,
    limit: parseInt(req.query.limit) || 20,
    q: req.query.q,
    categoryId: req.query.categoryId ? +req.query.categoryId : (req.query.filter ? +req.query.filter : undefined),
    brand: req.query.brand,
    minPrice: req.query.minPrice,
    maxPrice: req.query.maxPrice,
    sort: req.query.sort,
    storeName: req.query.storeName,
    userId: req.userId || undefined, // Include userId if authenticated
    lat: req.query.lat ? parseFloat(req.query.lat as string) : undefined,
    lng: req.query.lng ? parseFloat(req.query.lng as string) : undefined,
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
 *       - in: query
 *         name: filter
 *         schema:
 *           type: string
 *         description: Filter by category ID
 *     responses:
 *       200:
 *         description: List of seller products
 */
export const getSellerProducts = async (req: any, res: Response) => {
  try {
    const sellerId = req.userId;
    const params = {
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 20,
      q: req.query.q,
      categoryId: req.query.categoryId ? +req.query.categoryId : (req.query.filter ? +req.query.filter : undefined),
      brand: req.query.brand,
      minPrice: req.query.minPrice,
      maxPrice: req.query.maxPrice,
      sort: req.query.sort
    };
    const result = await service.listSellerProducts(sellerId, params);
    res.json({ success: true, ...result });
  } catch (err: unknown) {
    return handleControllerError(res, err);
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
export const get = async (req: any, res: Response) => {
  const productId = +req.params.id;
  const userId = req.userId || undefined; // Include userId if authenticated
  const product = await service.getProductById(productId, userId, true);
  if (!product) {
    return sendError(res, 404, "Product not found");
  }
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
export const update = async (req: any, res: Response) => {
  try {
    const productId = parseInt(req.params.id);
    const sellerId = req.userId;

    // Parse JSON fields if they come as strings (from multipart/form-data)
    let productData = { ...req.body };

    // Parse categories if it's a string
    if (typeof productData.categories === 'string') {
      try {
        productData.categories = JSON.parse(productData.categories);
      } catch (e) {
        productData.categories = productData.categories.split(',').map((id: string) => parseInt(id.trim())).filter((id: number) => !isNaN(id));
      }
    }

    // Parse variants if it's a string
    if (typeof productData.variants === 'string') {
      try {
        productData.variants = JSON.parse(productData.variants);
      } catch (e) {
        throw new Error('Invalid variants format. Must be valid JSON array.');
      }
    }

    // Parse tags if it's a string
    if (typeof productData.tags === 'string') {
      try {
        productData.tags = JSON.parse(productData.tags);
      } catch (e) {
        productData.tags = productData.tags.split(',').map((tag: string) => tag.trim()).filter((tag: string) => tag.length > 0);
      }
    }

    // Get existing product to compare images and verify ownership
    const existingProduct = await Product.findByPk(productId);
    if (!existingProduct) {
      return sendError(res, 404, "Product not found");
    }

    if (existingProduct.sellerId !== sellerId) {
      return sendError(res, 403, "You are not authorized to update this product");
    }

    // Process variant images
    for (const variant of productData.variants) {
      if (!variant.images || !Array.isArray(variant.images) || variant.images.length < 2 || variant.images.length > 4) {
        return sendValidationError(res, "Each variant must have between 2 and 4 images", "variants");
      }

      const uploadedImages = [];
      const base64ImagesToUpload = [];

      for (const img of variant.images) {
        if (typeof img === 'string' && (img.startsWith('data:image') || (img.length > 100 && !img.startsWith('http')))) {
          base64ImagesToUpload.push(img);
        } else if (typeof img === 'string' && img.startsWith('http')) {
          uploadedImages.push(img);
        }
      }

      if (base64ImagesToUpload.length > 0) {
        const base64Urls = await uploadMultipleBase64ToS3(base64ImagesToUpload, 'products');
        uploadedImages.push(...base64Urls);
      }

      variant.images = uploadedImages;
    }

    // Update product
    const result = await service.updateProduct(productId, sellerId, productData);

    if (!result) {
      return sendError(res, 404, "Product not found or you are not authorized to update it");
    }

    res.json({ success: true, data: result });
  } catch (err: unknown) {
    return handleControllerError(res, err);
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
export const deleteProduct = async (req: any, res: Response) => {
  try {
    const productId = parseInt(req.params.id);
    const sellerId = req.userId;
    const result = await service.deleteProduct(productId, sellerId);

    if (!result) {
      return sendError(res, 404, "Product not found or you are not authorized to delete it");
    }

    res.json({ success: true, message: "Product deleted successfully" });
  } catch (err: unknown) {
    return handleControllerError(res, err);
  }
};

/**
 * @swagger
 * /api/products/{id}/variants/{variantId}/status:
 *   patch:
 *     summary: Enable or disable a product variant
 *     description: Enable or disable a product variant (Seller only)
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *       - in: path
 *         name: variantId
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - isActive
 *             properties:
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Variant status updated successfully
 *       400:
 *         description: Bad request
 *       403:
 *         description: Forbidden - Not the owner
 *       404:
 *         description: Product or variant not found
 */
export const toggleVariantStatus = async (req: any, res: Response) => {
  try {
    const productId = parseInt(req.params.id);
    const variantId = parseInt(req.params.variantId);
    const sellerId = req.userId;
    const { isActive } = req.body;

    if (typeof isActive !== 'boolean') {
      return sendValidationError(res, "isActive must be a boolean", "isActive");
    }

    const result = await service.toggleVariantStatus(productId, variantId, sellerId, isActive);

    if (!result) {
      return sendError(res, 404, "Product/Variant not found or you are not authorized to update it");
    }

    res.json({ success: true, data: result, message: "Variant status updated successfully" });
  } catch (err: unknown) {
    return handleControllerError(res, err);
  }
};

/**
 * @swagger
 * /api/products/search-all:
 *   get:
 *     summary: Global search for products, stores, and brands
 *     description: Retrieve list of search-related products, stores, and brands based on a query parameter.
 *     tags: [Products]
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         required: true
 *         description: Search query string
 *     responses:
 *       200:
 *         description: List of matched products, stores, and brands
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
 *                         type: string
 *                       name:
 *                         type: string
 *                       type:
 *                         type: string
 *                         enum: [product, store, brand]
 *                       image:
 *                         type: string
 *                         nullable: true
 *                       isSellerOpen:
 *                         type: boolean
 *                         nullable: true
 *       400:
 *         description: Bad request
 */
export const searchAll = async (req: any, res: Response) => {
  try {
    const q = req.query.q || req.query.query || '';
    if (!q) {
      return res.json({ success: true, data: [] });
    }
    const lat = req.query.lat ? parseFloat(req.query.lat as string) : undefined;
    const lng = req.query.lng ? parseFloat(req.query.lng as string) : undefined;
    const result = await service.searchAll(String(q).trim(), lat, lng);
    res.json({ success: true, data: result });
  } catch (err: unknown) {
    return handleControllerError(res, err);
  }
};

/**
 * @swagger
 * /api/products/{id}/variants/{variantId}/default:
 *   patch:
 *     summary: Set a product variant as default
 *     description: Set a product variant as default (Seller only)
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *       - in: path
 *         name: variantId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Variant set as default successfully
 *       403:
 *         description: Forbidden - Not the owner
 *       404:
 *         description: Product or variant not found
 */
export const setDefaultVariant = async (req: any, res: Response) => {
  try {
    const productId = parseInt(req.params.id);
    const variantId = parseInt(req.params.variantId);
    const sellerId = req.userId;

    const result = await service.setDefaultVariant(productId, variantId, sellerId);

    if (!result) {
      return sendError(res, 404, "Product/Variant not found or you are not authorized to update it");
    }

    res.json({ success: true, data: result, message: "Variant set as default successfully" });
  } catch (err: unknown) {
    return handleControllerError(res, err);
  }
};
