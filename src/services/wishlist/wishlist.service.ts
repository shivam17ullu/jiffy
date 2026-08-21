import {
  Wishlist,
  Product,
  ProductVariant,
  Category,
  User,
  SellerProfile,
  VerifiedSellers,
  Store,
} from "../../model/relations.js";
import { Op, Sequelize } from "sequelize";

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
  const { page = 1, limit = 20, lat, lng } = opts;

  // ── Geo filter – find seller IDs whose store is within radius ───────────────
  let geoSellerIds: number[] | null = null;
  if (lat != null && lng != null) {
    const radiusKm = Number(process.env.DEFAULT_SEARCH_RADIUS_KM) || 15;
    const radiusM = radiusKm * 1000;
    const nearbyStores = await Store.findAll({
      attributes: ['id'],
      include: [{
        model: SellerProfile,
        attributes: ['userId'],
        required: true,
      }],
      where: Sequelize.where(
        Sequelize.literal(`ST_Distance_Sphere(POINT(longitude, latitude), POINT(${lng}, ${lat}))`),
        { [Op.lte]: radiusM }
      ),
    });
    geoSellerIds = nearbyStores.map((s: any) => s.SellerProfile?.userId).filter(Boolean);
  }
  // ────────────────────────────────────────────────────────────────────────────

  const productGeoWhere: any = {};
  if (geoSellerIds !== null) {
    productGeoWhere.sellerId = { [Op.in]: geoSellerIds };
  }

  const wishlistItems = await Wishlist.findAndCountAll({
    where: { userId },
    include: [
      {
        association: "product",
        required: true,
        where: Object.keys(productGeoWhere).length > 0 ? productGeoWhere : undefined,
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
            required: true,
            include: [
              {
                model: SellerProfile,
                required: true,
                attributes: [
                  "businessName",
                  "gstNumber",
                  "address",
                  "city",
                  "state",
                  "zipCode",
                  "phone",
                ],
                include: [
                  {
                    model: VerifiedSellers,
                    where: { is_active: true, status: "approved" },
                    required: true,
                  }
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

