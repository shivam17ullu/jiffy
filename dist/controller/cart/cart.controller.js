import * as service from '../../services/cart/cart.service.js';
export const addItem = async (req, res) => {
    try {
        const userId = req.user.id;
        const { productId, variantId, qty } = req.body;
        const items = await service.addToCart(userId, productId, variantId ?? null, qty ?? 1);
        res.json({ success: true, data: items });
    }
    catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};
export const getCart = async (req, res) => {
    const userId = req.user.id;
    const cart = await service.getCart(userId);
    res.json({ success: true, data: cart });
};
export const updateQty = async (req, res) => {
    const userId = req.user.id;
    const { itemId } = req.params;
    const { qty } = req.body;
    const updated = await service.updateQty(userId, +itemId, qty);
    res.json({ success: true, data: updated });
};
export const removeItem = async (req, res) => {
    const userId = req.user.id;
    const { itemId } = req.params;
    await service.removeItem(userId, +itemId);
    res.json({ success: true });
};
