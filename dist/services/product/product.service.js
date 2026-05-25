import { Product, ProductVariant, Category, SellerProfile, Wishlist, } from "../../model/relations.js";
import slugify from "slugify";
import { jiffy } from "../../config/sequelize.js";
import { Op } from "sequelize";
export const createProduct = async (payload, sellerId, imageUrls = []) => {
    const t = await jiffy.transaction();
    try {
        payload.slug = slugify(payload.name, { lower: true });
        const { categories = [], variants = [], images = [], tags = [], ...rest } = payload;
        // Use uploaded S3 URLs if provided, otherwise use provided URLs
        const finalImages = imageUrls.length > 0 ? imageUrls : images;
        const product = await Product.create({ ...rest, images: finalImages, tags, sellerId }, { transaction: t });
        if (categories.length > 0) {
            await product.addCategories(categories, { transaction: t });
        }
        for (const v of variants) {
            await ProductVariant.create({ ...v, productId: product.id }, { transaction: t });
        }
        await t.commit();
        return await Product.findByPk(product.id, {
            include: ["categories", "variants", "seller"],
        });
    }
    catch (err) {
        await t.rollback();
        throw err;
    }
};
export const listProducts = async (opts) => {
    const { page = 1, limit = 20, q, categoryId, brand, minPrice, maxPrice, sort, userId, // Optional: to check wishlist status
     } = opts;
    const where = { isActive: true };
    // Search query
    if (q) {
        where[Op.or] = [
            { name: { [Op.like]: `%${q}%` } },
            { description: { [Op.like]: `%${q}%` } },
            { brand: { [Op.like]: `%${q}%` } },
        ];
    }
    // Brand filter
    if (brand) {
        where.brand = { [Op.like]: `%${brand}%` };
    }
    // Category filtering - handle hierarchical categories
    let categoryFilter = null;
    if (categoryId) {
        // Get the category and all its children (subcategories and sub-subcategories)
        const category = await Category.findByPk(categoryId);
        if (category) {
            // Get all descendant category IDs
            const descendantIds = await getCategoryDescendants(categoryId);
            categoryFilter = descendantIds;
        }
    }
    // Price filtering - filter by variant prices
    let priceFilter = null;
    if (minPrice || maxPrice) {
        priceFilter = {};
        if (minPrice)
            priceFilter.price = { [Op.gte]: parseFloat(minPrice) };
        if (maxPrice)
            priceFilter.price = {
                ...priceFilter.price,
                [Op.lte]: parseFloat(maxPrice),
            };
    }
    // Build include array
    const include = [
        {
            association: "variants",
            where: priceFilter || undefined,
            required: priceFilter ? true : false,
        },
        {
            association: "categories",
            where: categoryFilter
                ? { id: { [Op.in]: categoryFilter } }
                : undefined,
            required: categoryFilter ? true : false,
            include: [
                {
                    association: "parent",
                    include: [{ association: "parent" }], // Include grandparent for full hierarchy
                },
            ],
        },
        {
            association: "seller",
            attributes: ["id", "phone_number", "email"],
            include: [
                {
                    model: SellerProfile,
                    required: false,
                    attributes: [
                        "businessName",
                        "gstNumber",
                        "address",
                        "city",
                        "state",
                        "zipCode",
                        "phone",
                    ],
                },
            ],
        },
    ];
    // Sort handling
    let order = [["createdAt", "DESC"]];
    if (sort) {
        const [field, direction] = sort.split(":");
        if (field === "price") {
            // Sort by minimum variant price
            order = [
                [
                    { model: ProductVariant, as: "variants" },
                    "price",
                    direction?.toUpperCase() || "ASC",
                ],
            ];
        }
        else {
            order = [[field, direction?.toUpperCase() || "ASC"]];
        }
    }
    const products = await Product.findAndCountAll({
        where,
        include,
        limit: parseInt(limit),
        offset: (parseInt(page) - 1) * parseInt(limit),
        order,
        distinct: true, // Important for count with joins
    });
    // Get wishlist status for all products if userId is provided
    let wishlistProductIds = new Set();
    if (userId) {
        const wishlistItems = await Wishlist.findAll({
            where: {
                userId: userId,
                productId: { [Op.in]: products.rows.map((p) => p.id) },
            },
            attributes: ['productId'],
        });
        wishlistProductIds = new Set(wishlistItems.map((item) => item.productId));
    }
    // Transform products to include min/max price and wishlist status
    const transformedProducts = products.rows.map((product) => {
        const variants = product.variants || [];
        const prices = variants.map((v) => v.price).filter((p) => p);
        const minPrice = prices.length > 0 ? Math.min(...prices) : null;
        const maxPrice = prices.length > 0 ? Math.max(...prices) : null;
        return {
            ...product.toJSON(),
            priceRange: {
                min: minPrice,
                max: maxPrice,
            },
            isWishlisted: userId ? wishlistProductIds.has(product.id) : false,
            seller: product.seller
                ? {
                    id: product.seller.id,
                    phone_number: product.seller.phone_number,
                    email: product.seller.email,
                    profile: product.seller.SellerProfile
                        ? {
                            businessName: product.seller.SellerProfile.businessName,
                            city: product.seller.SellerProfile.city,
                            state: product.seller.SellerProfile.state,
                        }
                        : null,
                }
                : null,
        };
    });
    return {
        items: transformedProducts,
        total: products.count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(products.count / parseInt(limit)),
    };
};
// Helper function to get all descendant category IDs
async function getCategoryDescendants(categoryId) {
    const categoryIds = [categoryId];
    const children = await Category.findAll({
        where: { parentId: categoryId },
    });
    for (const child of children) {
        const grandChildren = await getCategoryDescendants(child.id);
        categoryIds.push(...grandChildren);
    }
    return categoryIds;
}
export const getProductById = async (id, userId) => {
    const product = await Product.findByPk(id, {
        include: [
            {
                association: "variants",
            },
            {
                association: "categories",
                include: [
                    {
                        association: "parent",
                        include: [{ association: "parent" }],
                    },
                ],
            },
            {
                association: "seller",
                attributes: ["id", "phone_number", "email"],
                include: [
                    {
                        model: SellerProfile,
                        required: false,
                        attributes: [
                            "businessName",
                            "gstNumber",
                            "address",
                            "city",
                            "state",
                            "zipCode",
                            "phone",
                        ],
                    },
                ],
            },
        ],
    });
    if (!product)
        return null;
    // Check if product is in wishlist
    let isWishlisted = false;
    if (userId) {
        const wishlistItem = await Wishlist.findOne({
            where: {
                userId: userId,
                productId: id,
            },
        });
        isWishlisted = !!wishlistItem;
    }
    // Transform product to include price range, seller details, and wishlist status
    const variants = product.variants || [];
    const prices = variants.map((v) => v.price).filter((p) => p);
    const minPrice = prices.length > 0 ? Math.min(...prices) : null;
    const maxPrice = prices.length > 0 ? Math.max(...prices) : null;
    return {
        ...product.toJSON(),
        priceRange: {
            min: minPrice,
            max: maxPrice,
        },
        isWishlisted,
        seller: product.seller
            ? {
                id: product.seller.id,
                phone_number: product.seller.phone_number,
                email: product.seller.email,
                profile: product.seller?.SellerProfile
                    ? {
                        businessName: product.seller.SellerProfile.businessName,
                        gstNumber: product.seller.SellerProfile.gstNumber,
                        address: product.seller.SellerProfile.address,
                        city: product.seller.SellerProfile.city,
                        state: product.seller.SellerProfile.state,
                        zipCode: product.seller.SellerProfile.zipCode,
                        phone: product.seller.SellerProfile.phone,
                    }
                    : null,
            }
            : null,
    };
};
// Update product with seller ownership check
export const updateProduct = async (id, sellerId, payload, imageUrls = null) => {
    const t = await jiffy.transaction();
    try {
        // If imageUrls is provided (even if empty array), replace existing images
        // If imageUrls is null, don't touch the images field
        if (imageUrls !== null) {
            // Replace images with the new list (frontend sends the complete list)
            payload.images = imageUrls;
        }
        if (payload.name) {
            payload.slug = slugify(payload.name, { lower: true });
        }
        const { categories, variants, tags, ...rest } = payload;
        const updateData = { ...rest };
        if (tags !== undefined)
            updateData.tags = tags;
        const [updatedCount] = await Product.update(updateData, {
            where: { id, sellerId },
            transaction: t,
        });
        if (updatedCount === 0) {
            await t.rollback();
            return null;
        }
        const product = await Product.findByPk(id, { transaction: t });
        if (product) {
            if (categories && Array.isArray(categories)) {
                await product.setCategories(categories, { transaction: t });
            }
            if (variants && Array.isArray(variants)) {
                const existingVariants = await ProductVariant.findAll({
                    where: { productId: id },
                    transaction: t
                });
                const existingVariantIds = existingVariants.map(v => v.id);
                const payloadVariantIds = variants.map(v => v.id).filter(id => id);
                // Variants to delete
                const variantsToDelete = existingVariantIds.filter(id => !payloadVariantIds.includes(id));
                if (variantsToDelete.length > 0) {
                    await ProductVariant.destroy({
                        where: { id: { [Op.in]: variantsToDelete } },
                        transaction: t
                    });
                }
                // Variants to update/create
                for (const v of variants) {
                    if (v.id) {
                        const { productId, ...variantData } = v;
                        await ProductVariant.update(variantData, {
                            where: { id: v.id },
                            transaction: t
                        });
                    }
                    else {
                        await ProductVariant.create({ ...v, productId: id }, { transaction: t });
                    }
                }
            }
        }
        await t.commit();
        return await getProductById(id);
    }
    catch (err) {
        await t.rollback();
        throw err;
    }
};
// Delete product with seller ownership check
export const deleteProduct = async (id, sellerId) => {
    return await Product.destroy({ where: { id, sellerId } });
};
export const listSellerProducts = async (sellerId, opts) => {
    const { page = 1, limit = 20, q, categoryId, brand, minPrice, maxPrice, sort } = opts;
    // Base where clause - strictly enforce sellerId
    const where = { sellerId };
    // Note: We intentionally do NOT filter by isActive, so sellers can see inactive products
    // Search query
    if (q) {
        where[Op.or] = [
            { name: { [Op.like]: `%${q}%` } },
            { description: { [Op.like]: `%${q}%` } },
            { brand: { [Op.like]: `%${q}%` } },
        ];
    }
    // Brand filter
    if (brand) {
        where.brand = { [Op.like]: `%${brand}%` };
    }
    // Category filtering
    let categoryFilter = null;
    if (categoryId) {
        const descendantIds = await getCategoryDescendants(categoryId);
        categoryFilter = descendantIds;
    }
    // Price filtering
    let priceFilter = null;
    if (minPrice || maxPrice) {
        priceFilter = {};
        if (minPrice)
            priceFilter.price = { [Op.gte]: parseFloat(minPrice) };
        if (maxPrice)
            priceFilter.price = {
                ...priceFilter.price,
                [Op.lte]: parseFloat(maxPrice),
            };
    }
    // Include array
    const include = [
        {
            association: "variants",
            where: priceFilter || undefined,
            required: priceFilter ? true : false,
        },
        {
            association: "categories",
            where: categoryFilter
                ? { id: { [Op.in]: categoryFilter } }
                : undefined,
            required: categoryFilter ? true : false,
        },
    ];
    // Sort handling
    let order = [["createdAt", "DESC"]];
    if (sort) {
        const [field, direction] = sort.split(":");
        if (field === "price") {
            order = [
                [
                    { model: ProductVariant, as: "variants" },
                    "price",
                    direction?.toUpperCase() || "ASC",
                ],
            ];
        }
        else {
            order = [[field, direction?.toUpperCase() || "ASC"]];
        }
    }
    const products = await Product.findAndCountAll({
        where,
        include,
        limit: parseInt(limit),
        offset: (parseInt(page) - 1) * parseInt(limit),
        order,
        distinct: true,
    });
    // Transform products
    const transformedProducts = products.rows.map((product) => {
        const variants = product.variants || [];
        const prices = variants.map((v) => v.price).filter((p) => p);
        const minPrice = prices.length > 0 ? Math.min(...prices) : null;
        const maxPrice = prices.length > 0 ? Math.max(...prices) : null;
        return {
            ...product.toJSON(),
            priceRange: {
                min: minPrice,
                max: maxPrice,
            },
        };
    });
    return {
        items: transformedProducts,
        total: products.count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(products.count / parseInt(limit)),
    };
};
export const toggleVariantStatus = async (productId, variantId, sellerId, isActive) => {
    // Verify the product belongs to the seller
    const product = await Product.findOne({ where: { id: productId, sellerId } });
    if (!product) {
        return null;
    }
    const variant = await ProductVariant.findOne({ where: { id: variantId, productId } });
    if (!variant) {
        return null;
    }
    await variant.update({ isActive });
    return await getProductById(productId);
};
