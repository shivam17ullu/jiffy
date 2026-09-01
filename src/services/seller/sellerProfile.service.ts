import { SellerProfile, VerifiedSellers, User, Store, Document, BankDetail } from "../../model/relations.js";

export const getSellerStatus = async (userId: number) => {
    const seller = await SellerProfile.findOne({
        where: { userId },
        include: [{ model: VerifiedSellers }]
    });

    if (!seller) {
        return null;
    }

    const verifiedSeller = (seller as any).VerifiedSeller || (seller as any).VerifiedSellers;
    
    return {
        status: verifiedSeller?.status || 'pending',
        rejection_reason: verifiedSeller?.rejection_reason || null,
        is_active: verifiedSeller?.is_active || false,
    };
};

export const getSellerProfile = async (userId: number) => {
    const seller = await SellerProfile.findOne({
        where: { userId },
        include: [
            {
                model: User,
                attributes: ["id", "phone_number", "email", "is_active", "createdAt"],
            },
            {
                model: Store,
            },
            {
                model: Document,
            },
            {
                model: BankDetail,
            },
            {
                model: VerifiedSellers,
            },
        ],
    });

    if (!seller) {
        return null;
    }

    const data = seller.toJSON() as any;
    data.email = data.User?.email || null;
    data.phone_number = data.User?.phone_number || data.phone || null;
    data.store = data.Stores?.[0] || data.Store || null;
    data.Store = data.Store || data.Stores?.[0] || null;
    data.reason = data.VerifiedSeller?.rejection_reason || data.VerifiedSellers?.rejection_reason || null;

    return data;
};

