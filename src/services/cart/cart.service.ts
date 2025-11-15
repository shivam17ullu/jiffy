import { Cart, CartItem, ProductVariant } from "../../model/relations.js";


export const getOrCreateCart = async (userId: number) => {
  let cart = await Cart.findOne({ where: { userId }});
  if (!cart) cart = await Cart.create({ userId });
  return cart;
};

export const addToCart = async (userId: number, productId: number, variantId: number | 0, qty = 1) => {
  const cart = await getOrCreateCart(userId);
  // find variant price snapshot
  let price = 0;
  if (variantId) {
    const v = await ProductVariant.findByPk(variantId);
    if (!v) throw new Error('Variant not found');
    price = v.price;
  } else {
    // fallback first variant
    const v = await ProductVariant.findOne({ where: { productId }});
    price = v?.price ?? 0;
  }
  const existing = await CartItem.findOne({ where: { cartId: cart.id, productId, variantId }});
  if (existing) {
    existing.qty += qty;
    existing.price = price;
    await existing.save();
  } else {
    await CartItem.create({ cartId: cart.id, productId, variantId, qty, price });
  }
  return CartItem.findAll({ where: { cartId: cart.id }, include: ['product']});
};

export const getCart = async (userId: number) => {
  const cart = await getOrCreateCart(userId);
  const items = await CartItem.findAll({ where: { cartId: cart.id }, include: ['product','product.variant']});
  return { cart, items };
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
