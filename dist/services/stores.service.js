import { SellerProfile } from "../model/relations.js";
import VerifiedSellers from "../model/seller/verified_sellers.js";
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
}
