import BuyerProfile from "../model/profile/buyerProfile.js";
export default class ProfileService {
    static async createOrUpdateProfile(data) {
        let profile = await BuyerProfile.findOne({ where: { userId: data.userId } });
        if (profile) {
            await profile.update(data);
        }
        else {
            profile = await BuyerProfile.create(data);
        }
        return profile;
    }
    static async getProfile(userId) {
        return await BuyerProfile.findOne({ where: { userId } });
    }
}
