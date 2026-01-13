import {
  Product,
  ProductVariant,
  Category,
  User,
  SellerProfile,
} from "../../model/relations.js";
import slugify from "slugify";
import { jiffy } from "../../config/sequelize.js";
import { Op } from "sequelize";

export const createProduct = async (payload: any, sellerId: number, imageUrls: string[] = []) => {
  const t = await jiffy.transaction();
  try {
    payload.slug = slugify(payload.name, { lower: true });

    const {
      categories = [],
      variants = [],
      images = [],
      tags = [],
      ...rest
    } = payload;

    // Use uploaded S3 URLs if provided, otherwise use provided URLs
    const finalImages = imageUrls.length > 0 ? imageUrls : images;

    const product = await Product.create(
      { ...rest, images: finalImages, tags, sellerId },
      { transaction: t }
    );

    if (categories.length > 0) {
      await product.addCategories(categories, { transaction: t });
    }

    for (const v of variants) {
      await ProductVariant.create(
        { ...v, productId: product.id },
        { transaction: t }
      );
    }

    await t.commit();

    return await Product.findByPk(product.id, {
      include: ["categories", "variants", "seller"],
    });
  } catch (err) {
    await t.rollback();
    throw err;
  }
};


export const listProducts = async (opts: any) => {
  const {
    page = 1,
    limit = 20,
    q,
    categoryId,
    brand,
    minPrice,
    maxPrice,
    sort,
  } = opts;

  const where: any = { isActive: true };

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
  let categoryFilter: any = null;
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
  let priceFilter: any = null;
  if (minPrice || maxPrice) {
    priceFilter = {};
    if (minPrice) priceFilter.price = { [Op.gte]: parseFloat(minPrice) };
    if (maxPrice)
      priceFilter.price = {
        ...priceFilter.price,
        [Op.lte]: parseFloat(maxPrice),
      };
  }

  // Build include array
  const include: any = [
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
  let order: any = [["createdAt", "DESC"]];
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
    } else {
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

  // Transform products to include min/max price
  const transformedProducts = products.rows.map((product: any) => {
    const variants = product.variants || [];
    const prices = variants.map((v: any) => v.price).filter((p: any) => p);
    const minPrice = prices.length > 0 ? Math.min(...prices) : null;
    const maxPrice = prices.length > 0 ? Math.max(...prices) : null;

    return {
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
                  city: (product.seller as any).SellerProfile.city,
                  state: (product.seller as any).SellerProfile.state,
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
async function getCategoryDescendants(categoryId: number): Promise<number[]> {
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

export const getProductById = async (id: number) => {
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

  if (!product) return null;

  // Transform product to include price range and seller details
  const variants = (product as any).variants || [];
  const prices = variants.map((v: any) => v.price).filter((p: any) => p);
  const minPrice = prices.length > 0 ? Math.min(...prices) : null;
  const maxPrice = prices.length > 0 ? Math.max(...prices) : null;

  return {
    ...product.toJSON(),
    priceRange: {
      min: minPrice,
      max: maxPrice,
    },
    seller: (product as any).seller
      ? {
          id: (product as any).seller.id,
          phone_number: (product as any).seller.phone_number,
          email: (product as any).seller.email,
          profile: (product as any).seller?.SellerProfile
            ? {
                businessName: (product as any).seller.SellerProfile.businessName,
                gstNumber: (product as any).seller.SellerProfile.gstNumber,
                address: (product as any).seller.SellerProfile.address,
                city: (product as any).seller.SellerProfile.city,
                state: (product as any).seller.SellerProfile.state,
                zipCode: (product as any).seller.SellerProfile.zipCode,
                phone: (product as any).seller.SellerProfile.phone,
              }
            : null,
        }
      : null,
  };
};
// Update product with seller ownership check
export const updateProduct = async (id: number, sellerId: number, payload: any, imageUrls: string[] | null = null) => {
  // If imageUrls is provided (even if empty array), replace existing images
  // If imageUrls is null, don't touch the images field
  if (imageUrls !== null) {
    // Replace images with the new list (frontend sends the complete list)
    payload.images = imageUrls;
  }

  const [updatedCount] = await Product.update(payload, {
    where: { id, sellerId },
  });
  
  if (updatedCount === 0) return null;
  // Fetch updated product with all associations
  return await getProductById(id);
};

// Delete product with seller ownership check
export const deleteProduct = async (id: number, sellerId: number) => {
  return await Product.destroy({ where: { id, sellerId } });
};

export const listSellerProducts = async (sellerId: number, opts: any) => {
  const { page = 1, limit = 20, q, categoryId, brand, minPrice, maxPrice, sort } = opts;

  // Base where clause - strictly enforce sellerId
  const where: any = { sellerId };

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
  let categoryFilter: any = null;
  if (categoryId) {
    const descendantIds = await getCategoryDescendants(categoryId);
    categoryFilter = descendantIds;
  }

  // Price filtering
  let priceFilter: any = null;
  if (minPrice || maxPrice) {
    priceFilter = {};
    if (minPrice) priceFilter.price = { [Op.gte]: parseFloat(minPrice) };
    if (maxPrice)
      priceFilter.price = {
        ...priceFilter.price,
        [Op.lte]: parseFloat(maxPrice),
      };
  }

  // Include array
  const include: any = [
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
  let order: any = [["createdAt", "DESC"]];
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
    } else {
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
  const transformedProducts = products.rows.map((product: any) => {
    const variants = product.variants || [];
    const prices = variants.map((v: any) => v.price).filter((p: any) => p);
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
