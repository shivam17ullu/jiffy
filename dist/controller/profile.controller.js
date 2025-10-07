import ProfileService from "../services/profile.service.js";
import { createResponse } from "../middleware/responseHandler.js";
export default class BuyerProfileController {
    static async createOrUpdate(req, res) {
        try {
            const profile = await ProfileService.createOrUpdateProfile(req.body);
            createResponse(res, { status: 200, message: 'Success', response: profile });
        }
        catch (error) {
            createResponse(res, { status: 500, message: error.message });
        }
    }
    static async getProfile(req, res) {
        try {
            const profile = await ProfileService.getProfile(Number(req.params.id));
            if (!profile) {
                return createResponse(res, { status: 404, message: 'Profile not found' });
            }
            createResponse(res, { status: 200, message: 'success', response: profile });
        }
        catch (error) {
            createResponse(res, { status: 500, message: error.message });
        }
    }
}
