import BuyerProfile from "../model/profile/buyerProfile.js";

export default class ProfileService {
  static async createOrUpdateProfile(data: {
    userId: number;
    fullName: string;
    phone?: string;
    address?: string;
    city?: string;
    state?: string;
    zipCode?: string;
  }) {
    let profile = await BuyerProfile.findOne({ where: { userId: data.userId } });

    if (profile) {
      await profile.update(data);
    } else {
      profile = await BuyerProfile.create(data);
    }

    return profile;
  }

  static async getProfile(userId: number) {
    return await BuyerProfile.findOne({ where: { userId } });
  }
}
