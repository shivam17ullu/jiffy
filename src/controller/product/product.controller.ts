import * as service from '../../services/product/product.service.js';
import { Request, Response } from "express";
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
 *                 example: '[{"sku":"BS-S-M","size":"M","color":"Blue","price":500,"mrp":800,"stock":100}]'
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
    const sellerId = req.userId; // ⭐ seller from JWT
    
    // Parse JSON fields if they come as strings (from multipart/form-data)
    let productData = { ...req.body };
    
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

    // Handle image uploads - support both file uploads and base64 images
    let imageUrls: string[] = [];
    
    // 1. Handle file uploads (multipart/form-data)
    if (req.files && req.files.length > 0) {
      const fileUrls = await uploadMultipleToS3(req.files, 'products');
      imageUrls.push(...fileUrls);
    }
    
    // 2. Handle base64 images from request body (JSON or form-data)
    if (productData.images && Array.isArray(productData.images)) {
      // Filter base64 images
      const base64Images = productData.images.filter((img: string) => 
        typeof img === 'string' && (img.startsWith('data:image') || img.length > 100) // Base64 images are usually long strings
      );
      
      if (base64Images.length > 0) {
        // Upload base64 images to S3
        const base64Urls = await uploadMultipleBase64ToS3(base64Images, 'products');
        imageUrls.push(...base64Urls);
      }
      
      // Keep non-base64 URLs (already uploaded images)
      const existingUrls = productData.images.filter((img: string) => 
        typeof img === 'string' && img.startsWith('http') && !img.startsWith('data:image')
      );
      imageUrls.push(...existingUrls);
      
      // Remove images from body - we'll use the S3 URLs
      delete productData.images;
    }

    // Create product with S3 image URLs
    const product = await service.createProduct(productData, sellerId, imageUrls);
    res.json({ success: true, data: product });
  } catch (err: any) {
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
export const list = async (req: any, res: Response) => {
  const params = {
    page: parseInt(req.query.page) || 1,
    limit: parseInt(req.query.limit) || 20,
    q: req.query.q,
    categoryId: req.query.categoryId ? +req.query.categoryId : undefined,
    brand: req.query.brand,
    minPrice: req.query.minPrice,
    maxPrice: req.query.maxPrice,
    sort: req.query.sort,
    userId: req.userId || undefined, // Include userId if authenticated
  };
  const result = await service.listProducts(params);
  res.json({ success:true, ...result });
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
export const getSellerProducts = async (req: any, res: Response) => {
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
    } catch (err: any) {
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
export const get = async (req: any, res: Response) => {
  const productId = +req.params.id;
  const userId = req.userId || undefined; // Include userId if authenticated
  const product = await service.getProductById(productId, userId);
  if (!product) return res.status(404).json({ success:false, message: "Product not found" });
  res.json({ success:true, data: product });
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
          return res.status(404).json({ success: false, message: "Product not found" });
        }
        
        // Check ownership
        if (existingProduct.sellerId !== sellerId) {
          return res.status(403).json({ success: false, message: "Unauthorized - Not the product owner" });
        }
        
        const existingImages: string[] = (existingProduct.images as string[]) || [];
        
        // Handle image uploads - support both file uploads and base64 images
        let finalImageUrls: string[] = [];
        
        // 1. Handle file uploads (multipart/form-data)
        if (req.files && req.files.length > 0) {
          const fileUrls = await uploadMultipleToS3(req.files, 'products');
          finalImageUrls.push(...fileUrls);
        }
        
        // 2. Handle images from request body
        if (productData.images && Array.isArray(productData.images)) {
          // Filter base64 images (new images to upload)
          const base64Images = productData.images.filter((img: string) => 
            typeof img === 'string' && (img.startsWith('data:image') || (img.length > 100 && !img.startsWith('http')))
          );
          
          // Upload new base64 images to S3
          if (base64Images.length > 0) {
            const base64Urls = await uploadMultipleBase64ToS3(base64Images, 'products');
            finalImageUrls.push(...base64Urls);
          }
          
          // Keep existing S3 URLs (images that user wants to keep)
          const existingUrls = productData.images.filter((img: string) => 
            typeof img === 'string' && img.startsWith('http')
          );
          finalImageUrls.push(...existingUrls);
          
          // Remove images from body - we'll use the final S3 URLs
          delete productData.images;
        }
        
        // Find images to delete from S3 (old images not in the new list)
        const imagesToDelete = existingImages.filter((oldImg: string) => 
          !finalImageUrls.includes(oldImg)
        );
        
        // Delete old images from S3 that are not in the new list
        if (imagesToDelete.length > 0) {
          try {
            await Promise.all(
              imagesToDelete.map((url: string) => 
                deleteFromS3(url).catch((err: any) => {
                  // Log error but don't fail the update if S3 delete fails
                  console.error(`Failed to delete image from S3: ${url}`, err.message);
                })
              )
            );
          } catch (err: any) {
            console.error("Error deleting old images from S3:", err.message);
            // Continue with update even if S3 deletion fails
          }
        }
        
        // Update product with only the new image list (replace, don't merge)
        const result = await service.updateProduct(productId, sellerId, productData, finalImageUrls);
        
        if (!result) {
            return res.status(404).json({ success: false, message: "Product not found or unauthorized" });
        }
        
        res.json({ success: true, data: result });
    } catch (err: any) {
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
export const deleteProduct = async (req: any, res: Response) => {
    try {
        const productId = parseInt(req.params.id);
        const sellerId = req.userId;
        const result = await service.deleteProduct(productId, sellerId);
        
        if (!result) {
            return res.status(404).json({ success: false, message: "Product not found or unauthorized" });
        }
        
        res.json({ success: true, message: "Product deleted successfully" });
    } catch (err: any) {
        res.status(400).json({ success: false, message: err.message });
    }
};
