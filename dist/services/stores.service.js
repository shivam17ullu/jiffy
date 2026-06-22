import { SellerProfile, User, Store, VerifiedSellers, Document } from "../model/relations.js";
import { Op } from "sequelize";
export default class StoreService {
    static async getstores(zipCode, storeCategory) {
        let storeInclude = {
            model: Store,
            where: {}
        };
        if (zipCode && zipCode.length >= 5) {
            const prefix = zipCode.substring(0, 5);
            storeInclude.where.pincode = {
                [Op.like]: `${prefix}%`,
            };
            storeInclude.required = true;
        }
        else if (zipCode) {
            storeInclude.where.pincode = zipCode;
            storeInclude.required = true;
        }
        if (storeCategory && storeCategory.toLowerCase() !== "all") {
            storeInclude.where.storeCategory = storeCategory;
            storeInclude.required = true;
        }
        if (Object.keys(storeInclude.where).length === 0) {
            delete storeInclude.where;
        }
        return await SellerProfile.findAll({
            include: [
                {
                    model: VerifiedSellers,
                    where: { is_active: true, status: "approved" }, // INNER JOIN condition
                },
                storeInclude,
                {
                    model: Document,
                    attributes: ['storeImageUrl'],
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
