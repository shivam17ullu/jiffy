import { jiffy } from "../../config/sequelize.js";
import { Cart, CartItem, Order, OrderItem } from "../../model/relations.js";
export const createOrderFromCart = async (userId, shippingAddress, paymentInfo) => {
    const cart = await Cart.findOne({ where: { userId } });
    if (!cart)
        throw new Error('Cart not found or empty');
    const items = await CartItem.findAll({ where: { cartId: cart.id } });
    if (!items.length)
        throw new Error('Cart empty');
    const t = await jiffy.transaction();
    try {
        const total = items.reduce((s, i) => s + (i.price * i.qty), 0);
        const order = await Order.create({ userId, total, status: 'pending', shippingAddress, paymentInfo }, { transaction: t });
        for (const it of items) {
            await OrderItem.create({ orderId: order.id, productId: it.productId, variantId: it.variantId, qty: it.qty, price: it.price }, { transaction: t });
            // optionally decrement stock from variants
        }
        // remove cart items
        await CartItem.destroy({ where: { cartId: cart.id }, transaction: t });
        await t.commit();
        return await Order.findByPk(order.id, { include: ['items'] });
    }
    catch (err) {
        await t.rollback();
        throw err;
    }
};
