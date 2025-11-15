// src/services/order/order.service.ts
import { jiffy } from "../../config/sequelize.js";
import { Cart, CartItem, Order, OrderItem, Product, ProductVariant, } from "../../model/relations.js";
export const createOrdersFromCart = async (userId, shippingAddress, paymentInfo) => {
    const t = await jiffy.transaction();
    try {
        const cart = await Cart.findOne({
            where: { userId },
            transaction: t,
        });
        if (!cart)
            throw new Error("Cart not found");
        const items = await CartItem.findAll({
            where: { cartId: cart.id },
            include: [
                { model: Product, as: "product" },
                { model: ProductVariant, as: "variant" },
            ],
            transaction: t,
        });
        if (!items.length)
            throw new Error("Cart is empty");
        // Group by seller
        const groups = {};
        for (const item of items) {
            const sellerId = item.product.sellerId;
            if (!groups[sellerId])
                groups[sellerId] = [];
            groups[sellerId].push(item);
        }
        const createdOrders = [];
        // Create one order per seller
        for (const sellerIdStr of Object.keys(groups)) {
            const sellerId = Number(sellerIdStr);
            const groupItems = groups[sellerId];
            let total = 0;
            // stock check + total calculation
            for (const it of groupItems) {
                const variant = it.variant;
                if (variant.stock < it.qty)
                    throw new Error("Insufficient stock for variant: " + variant.id);
                total += (it.price || variant.price) * it.qty;
            }
            // FIXED — added sellerId in Order.create()
            const order = await Order.create({
                userId,
                sellerId, // <-- REQUIRED FIELD FIX
                total,
                status: "pending",
                shippingAddress,
                paymentInfo,
            }, { transaction: t });
            // create OrderItems + reduce stock
            for (const it of groupItems) {
                await OrderItem.create({
                    orderId: order.id,
                    productId: it.productId,
                    variantId: it.variantId,
                    qty: it.qty,
                    price: it.price,
                }, { transaction: t });
                await it.variant.update({ stock: it.variant.stock - it.qty }, { transaction: t });
            }
            createdOrders.push(order);
        }
        // clear cart
        await CartItem.destroy({
            where: { cartId: cart.id },
            transaction: t,
        });
        await t.commit();
        // reload orders
        return Promise.all(createdOrders.map((o) => Order.findByPk(o.id, {
            include: [{ model: OrderItem, as: "items" }],
        })));
    }
    catch (err) {
        await t.rollback();
        throw err;
    }
};
