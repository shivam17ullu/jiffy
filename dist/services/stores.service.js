import { SellerProfile } from "../model/relations.js";
export default class StoreService {
    static async getstores() {
        return await SellerProfile.findAll();
    }
}
