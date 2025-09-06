import ProfileService from "../services/profile.service.js";
export default class BuyerProfileController {
    static async createOrUpdate(req, res) {
        try {
            const profile = await ProfileService.createOrUpdateProfile(req.body);
            res.json({ success: true, data: profile });
        }
        catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }
    static async getProfile(req, res) {
        try {
            const profile = await ProfileService.getProfile(Number(req.params.userId));
            if (!profile) {
                return res.status(404).json({ success: false, message: "Profile not found" });
            }
            res.json({ success: true, data: profile });
        }
        catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }
}
