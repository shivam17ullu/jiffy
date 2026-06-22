import { SellerProfile, VerifiedSellers } from "../../model/relations.js";
export const getSellerStatus = async (userId) => {
    const seller = await SellerProfile.findOne({
        where: { userId },
        include: [{ model: VerifiedSellers }]
    });
    if (!seller) {
        return null;
    }
    const verifiedSeller = seller.VerifiedSeller || seller.VerifiedSellers;
    return {
        status: verifiedSeller?.status || 'pending',
        rejection_reason: verifiedSeller?.rejection_reason || null,
        is_active: verifiedSeller?.is_active || false,
    };
};
