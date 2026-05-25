import { SellerProfile, User, Store, VerifiedSellers } from "../model/relations.js";
export default class StoreService {
    static async getstores() {
        return await SellerProfile.findAll({
            include: [
                {
                    model: VerifiedSellers,
                    where: { is_active: 1 }, // INNER JOIN condition
                },
            ],
        });
    }
    static async getStoreById(id) {
        return await SellerProfile.findByPk(id, {
            include: [
                {
                    model: User,
                    attributes: { exclude: ["password"] },
                },
                {
                    model: Store,
                },
                {
                    model: VerifiedSellers,
                },
            ],
        });
    }
    static async updateStoreStatus(id, isSellerOpen) {
        const store = await Store.findByPk(id);
        if (!store)
            return null;
        store.isSellerOpen = isSellerOpen;
        await store.save();
        return store;
    }
}
