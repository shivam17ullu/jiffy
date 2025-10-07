import { SellerProfile } from "../model/relations";
export default class StoreService {
    static async getstores() {
        return await SellerProfile.findAll();
    }
}
