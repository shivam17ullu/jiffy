import { Document, SellerProfile } from "../../model/relations.js";
export const getSellerDocs = async (userId) => {
    const sellerProfile = await SellerProfile.findOne({ where: { userId } });
    if (!sellerProfile)
        return null;
    return await Document.findOne({ where: { sellerId: sellerProfile.id } });
};
