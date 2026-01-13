import { Wishlist, Product, SellerProfile, } from "../../model/relations.js";
/**
 * Add product to wishlist
 */
export const addToWishlist = async (userId, productId) => {
    // Check if product exists
    const product = await Product.findByPk(productId);
    if (!product) {
        throw new Error("Product not found");
    }
    // Check if already in wishlist
    const existing = await Wishlist.findOne({
        where: { userId, productId },
    });
    if (existing) {
        throw new Error("Product already in wishlist");
    }
    // Add to wishlist
    const wishlistItem = await Wishlist.create({ userId, productId });
    return wishlistItem;
};
/**
 * Remove product from wishlist
 */
export const removeFromWishlist = async (userId, productId) => {
    const deleted = await Wishlist.destroy({
        where: { userId, productId },
    });
    if (deleted === 0) {
        throw new Error("Product not found in wishlist");
    }
    return true;
};
/**
 * Get user's wishlist with full product details
 */
export const getWishlist = async (userId, opts = {}) => {
    const { page = 1, limit = 20 } = opts;
    const wishlistItems = await Wishlist.findAndCountAll({
        where: { userId },
        include: [
            {
                association: "product",
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
            },
        ],
        limit: parseInt(limit),
        offset: (parseInt(page) - 1) * parseInt(limit),
        order: [["createdAt", "DESC"]],
        distinct: true,
    });
    // Transform products to include price range
    const transformedItems = wishlistItems.rows.map((item) => {
        const product = item.product;
        if (!product)
            return null;
        const variants = product.variants || [];
        const prices = variants.map((v) => v.price).filter((p) => p);
        const minPrice = prices.length > 0 ? Math.min(...prices) : null;
        const maxPrice = prices.length > 0 ? Math.max(...prices) : null;
        return {
            id: item.id,
            productId: item.productId,
            addedAt: item.createdAt,
            product: {
                ...product.toJSON(),
                priceRange: {
                    min: minPrice,
                    max: maxPrice,
                },
                seller: product.seller
                    ? {
                        id: product.seller.id,
                        phone_number: product.seller.phone_number,
                        email: product.seller.email,
                        profile: product.seller.SellerProfile
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
            },
        };
    }).filter((item) => item !== null);
    return {
        items: transformedItems,
        total: wishlistItems.count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(wishlistItems.count / parseInt(limit)),
    };
};
/**
 * Check if product is in wishlist
 */
export const isInWishlist = async (userId, productId) => {
    const item = await Wishlist.findOne({
        where: { userId, productId },
    });
    return !!item;
};
