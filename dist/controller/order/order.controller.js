import * as service from '../../services/order/order.service.js';
export const createOrder = async (req, res) => {
    try {
        const userId = req.user.id;
        const { shippingAddress, paymentInfo } = req.body;
        const order = await service.createOrderFromCart(userId, shippingAddress, paymentInfo);
        res.status(201).json({ success: true, data: order });
    }
    catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};
