import {
  Wishlist,
  Product,
  ProductVariant,
  Category,
  User,
  SellerProfile,
} from "../../model/relations.js";

/**
 * Add product to wishlist
 */
export const addToWishlist = async (userId: number, productId: number) => {
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
export const removeFromWishlist = async (userId: number, productId: number) => {
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
export const getWishlist = async (userId: number, opts: any = {}) => {
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
  const transformedItems = wishlistItems.rows.map((item: any) => {
    const product = item.product;
    if (!product) return null;

    const variants = product.variants || [];
    const prices = variants.map((v: any) => v.price).filter((p: any) => p);
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
              profile: (product.seller as any).SellerProfile
                ? {
                    businessName: (product.seller as any).SellerProfile.businessName,
                    gstNumber: (product.seller as any).SellerProfile.gstNumber,
                    address: (product.seller as any).SellerProfile.address,
                    city: (product.seller as any).SellerProfile.city,
                    state: (product.seller as any).SellerProfile.state,
                    zipCode: (product.seller as any).SellerProfile.zipCode,
                    phone: (product.seller as any).SellerProfile.phone,
                  }
                : null,
            }
          : null,
      },
    };
  }).filter((item: any) => item !== null);

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
export const isInWishlist = async (userId: number, productId: number) => {
  const item = await Wishlist.findOne({
    where: { userId, productId },
  });
  return !!item;
};

