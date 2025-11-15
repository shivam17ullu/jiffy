import {
  Cart,
  CartItem,
  ProductVariant,
  Product,
  User,
  SellerProfile,
  Category,
} from "../../model/relations.js";


export const getOrCreateCart = async (userId: number) => {
  let cart = await Cart.findOne({ where: { userId }});
  if (!cart) cart = await Cart.create({ userId });
  return cart;
};

export const addToCart = async (userId: number, productId: number, variantId: number | null, qty = 1) => {
  const cart = await getOrCreateCart(userId);
  // find variant price snapshot
  let price = 0;
  let finalVariantId: number | null = null;
  
  if (variantId) {
    const v = await ProductVariant.findByPk(variantId);
    if (!v) throw new Error('Variant not found');
    price = v.price;
    finalVariantId = variantId;
  } else {
    // fallback first variant
    const v = await ProductVariant.findOne({ where: { productId }});
    if (v) {
      price = v.price;
      finalVariantId = v.id;
    } else {
      throw new Error('No variant found for this product');
    }
  }
  
  const whereClause: any = { cartId: cart.id, productId };
  if (finalVariantId) {
    whereClause.variantId = finalVariantId;
  } else {
    whereClause.variantId = null;
  }
  
  const existing = await CartItem.findOne({ where: whereClause });
  if (existing) {
    existing.qty += qty;
    existing.price = price;
    await existing.save();
  } else {
    await CartItem.create({ cartId: cart.id, productId, variantId: finalVariantId, qty, price });
  }
  return CartItem.findAll({ where: { cartId: cart.id }, include: [{ association: 'product' }]});
};

export const getCart = async (userId: number) => {
  const cart = await getOrCreateCart(userId);
  
  const items = await CartItem.findAll({
    where: { cartId: cart.id },
    include: [
      {
        association: "product",
        include: [
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
                  "city",
                  "state",
                ],
              },
            ],
          },
          {
            association: "variants",
          },
        ],
      },
    ],
  });

  // Calculate totals and enrich items with variant details
  let subtotal = 0;
  const enrichedItems = await Promise.all(
    items.map(async (item: any) => {
      const product = item.product;
      
      // Get variant details if variantId exists
      let variant = null;
      if (item.variantId) {
        variant = await ProductVariant.findByPk(item.variantId);
      } else if (product?.variants?.length > 0) {
        // Use first variant if no variantId specified
        variant = product.variants[0];
      }

      const itemSubtotal = item.price * item.qty;
      subtotal += itemSubtotal;

      return {
        id: item.id,
        productId: item.productId,
        variantId: item.variantId,
        qty: item.qty,
        price: item.price,
        subtotal: itemSubtotal,
        product: product
          ? {
              id: product.id,
              name: product.name,
              slug: product.slug,
              description: product.description,
              brand: product.brand,
              images: product.images || [],
              tags: product.tags || [],
              categories: product.categories || [],
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
            }
          : null,
        variant: variant
          ? {
              id: variant.id,
              sku: variant.sku,
              size: variant.size,
              color: variant.color,
              price: variant.price,
              mrp: variant.mrp,
              stock: variant.stock,
            }
          : null,
        stockAvailable: variant ? variant.stock >= item.qty : false,
      };
    })
  );

  return {
    cart: {
      id: cart.id,
      userId: cart.userId,
      createdAt: cart.createdAt,
      updatedAt: cart.updatedAt,
    },
    items: enrichedItems,
    summary: {
      itemCount: enrichedItems.length,
      totalItems: enrichedItems.reduce((sum, item) => sum + item.qty, 0),
      subtotal: subtotal,
      // You can add tax, shipping, discount calculations here
      total: subtotal,
    },
  };
};

export const updateQty = async (userId: number, itemId: number, qty: number) => {
  const cart = await getOrCreateCart(userId);
  const item = await CartItem.findOne({ where: { id: itemId, cartId: cart.id }});
  if (!item) throw new Error('Cart item not found');
  item.qty = qty;
  await item.save();
  return item;
};

export const removeItem = async (userId: number, itemId: number) => {
  const cart = await getOrCreateCart(userId);
  await CartItem.destroy({ where: { id: itemId, cartId: cart.id }});
  return true;
};
