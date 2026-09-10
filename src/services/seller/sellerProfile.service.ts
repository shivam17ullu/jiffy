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

export interface UpdateOperatingHoursInput {
    openingDays?: string[] | string;
    openingTime?: string;
    closingTime?: string;
    isSellerOpen?: boolean;
    storeId?: number;
    [key: string]: any;
}

export const updateOperatingHours = async (userId: number, payload: UpdateOperatingHoursInput) => {
    const seller = await SellerProfile.findOne({
        where: { userId }
    });

    if (!seller) {
        const error: any = new Error("Seller profile not found");
        error.status = 404;
        throw error;
    }

    const whereClause: any = { sellerId: seller.id };
    if (payload.storeId) {
        whereClause.id = payload.storeId;
    }

    const store = await Store.findOne({ where: whereClause });
    if (!store) {
        const error: any = new Error("Store not found for this seller");
        error.status = 404;
        throw error;
    }

    const rawDays = payload.openingDays ?? payload.opening_days ?? payload.storeOpeningDays ?? payload.store_opening_days;
    let normalizedOpeningDays: string[] | undefined;
    if (rawDays !== undefined) {
        if (Array.isArray(rawDays)) {
            normalizedOpeningDays = rawDays.map((d: any) => String(d).trim()).filter(Boolean);
        } else if (typeof rawDays === "string") {
            try {
                const parsed = JSON.parse(rawDays);
                if (Array.isArray(parsed)) {
                    normalizedOpeningDays = parsed.map((d: any) => String(d).trim()).filter(Boolean);
                } else {
                    normalizedOpeningDays = rawDays.split(",").map((d: string) => d.trim()).filter(Boolean);
                }
            } catch {
                normalizedOpeningDays = rawDays.split(",").map((d: string) => d.trim()).filter(Boolean);
            }
        } else {
            const error: any = new Error("openingDays must be an array of strings or comma-separated string");
            error.status = 400;
            throw error;
        }
    }

    const openingTime = payload.openingTime ?? payload.opening_time ?? payload.storeOpeningTime ?? payload.store_opening_time;
    const closingTime = payload.closingTime ?? payload.closing_time ?? payload.storeClosingTime ?? payload.store_closing_time;
    const isSellerOpen = payload.isSellerOpen ?? payload.is_seller_open ?? payload.isOpen ?? payload.is_open;

    if (normalizedOpeningDays === undefined && openingTime === undefined && closingTime === undefined && isSellerOpen === undefined) {
        const error: any = new Error("At least one field (openingDays, openingTime, closingTime, isSellerOpen) must be provided");
        error.status = 400;
        throw error;
    }

    if (openingTime !== undefined) {
        if (typeof openingTime !== "string") {
            const error: any = new Error("openingTime must be a string");
            error.status = 400;
            throw error;
        }
        store.openingTime = openingTime.trim();
    }

    if (closingTime !== undefined) {
        if (typeof closingTime !== "string") {
            const error: any = new Error("closingTime must be a string");
            error.status = 400;
            throw error;
        }
        store.closingTime = closingTime.trim();
    }

    if (normalizedOpeningDays !== undefined) {
        store.openingDays = normalizedOpeningDays;
    }

    if (isSellerOpen !== undefined) {
        if (typeof isSellerOpen !== "boolean") {
            const error: any = new Error("isSellerOpen must be a boolean");
            error.status = 400;
            throw error;
        }
        store.isSellerOpen = isSellerOpen;
    }

    await store.save();

    return store;
};

