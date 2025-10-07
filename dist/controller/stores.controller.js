import { createResponse } from "../middleware/responseHandler.js";
import StoreService from "../services/stores.service.js";
export default class StoreController {
    static async getStores(req, res) {
        try {
            const stores = await StoreService.getstores();
            if (!stores) {
                return createResponse(res, { status: 404, message: 'Stores not found' });
            }
            createResponse(res, { status: 200, message: 'success', response: stores });
        }
        catch (error) {
            createResponse(res, { status: 500, message: error.message });
        }
    }
}
