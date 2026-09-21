import { SellerProfile, VerifiedSellers, User, Store, Document, BankDetail } from "../../model/relations.js";
import { jiffy } from "../../config/sequelize.js";
import { Op, Transaction } from "sequelize";

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

export const updatePickupAddress = async (userId: number, pickupAddressId: number) => {
    const seller = await SellerProfile.findOne({
        where: { userId }
    });

    if (!seller) {
        const error: any = new Error("Seller profile not found for this user");
        error.status = 404;
        throw error;
    }

    seller.pickup_address_id = pickupAddressId;
    await seller.save();

    // Also update associated stores for consistency
    await Store.update(
        { pickup_address_id: pickupAddressId },
        { where: { sellerId: seller.id } }
    );

    return {
        userId: Number(seller.userId),
        sellerId: seller.id,
        pickup_address_id: seller.pickup_address_id,
    };
};

export interface UpdateSellerProfileInput {
    businessName?: string;
    business_name?: string;
    phone?: string;
    phoneNumber?: string;
    phone_number?: string;
    email?: string;
    address?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    pincode?: string;
    zip_code?: string;
    gstNumber?: string;
    gst_number?: string;
    gst?: string;
    pickup_address_id?: number | null;
    pickupAddressId?: number | null;

    // Nested or root store fields
    store?: {
        storeName?: string;
        store_name?: string;
        storeAddress?: string;
        store_address?: string;
        pincode?: string;
        zipCode?: string;
        storeCategory?: string[] | string;
        store_category?: string[] | string;
        latitude?: number;
        longitude?: number;
        openingDays?: string[] | string;
        opening_days?: string[] | string;
        openingTime?: string;
        opening_time?: string;
        closingTime?: string;
        closing_time?: string;
        isSellerOpen?: boolean;
        is_seller_open?: boolean;
        pickup_address_id?: number | null;
        [key: string]: any;
    };
    storeName?: string;
    store_name?: string;
    storeAddress?: string;
    store_address?: string;
    storeCategory?: string[] | string;
    store_category?: string[] | string;
    latitude?: number;
    longitude?: number;
    openingDays?: string[] | string;
    opening_days?: string[] | string;
    openingTime?: string;
    opening_time?: string;
    closingTime?: string;
    closing_time?: string;
    isSellerOpen?: boolean;
    is_seller_open?: boolean;

    // Nested or root bank details
    bankDetails?: {
        accountHolderName?: string;
        account_holder_name?: string;
        accountNumber?: string;
        account_number?: string;
        ifscCode?: string;
        ifsc_code?: string;
        termsAccepted?: boolean;
        terms_accepted?: boolean;
        [key: string]: any;
    };
    bank_details?: any;
    bank?: any;
    accountHolderName?: string;
    account_holder_name?: string;
    accountNumber?: string;
    account_number?: string;
    ifscCode?: string;
    ifsc_code?: string;
    termsAccepted?: boolean;
    terms_accepted?: boolean;

    [key: string]: any;
}

export const updateSellerProfile = async (userId: number, payload: UpdateSellerProfileInput) => {
    const seller = await SellerProfile.findOne({
        where: { userId }
    });

    if (!seller) {
        const error: any = new Error("Seller profile not found");
        error.status = 404;
        throw error;
    }

    const transaction: Transaction = await jiffy.transaction();

    try {
        const storePayload = (payload.store || {}) as any;
        const bankPayload = (payload.bankDetails || payload.bank_details || payload.bank || {}) as any;

        // 1. Update SellerProfile fields
        const businessName = payload.businessName ?? payload.business_name ?? storePayload.storeName ?? storePayload.store_name ?? payload.storeName ?? payload.store_name;
        if (businessName !== undefined && typeof businessName === "string" && businessName.trim()) {
            seller.businessName = businessName.trim();
        }

        const phone = payload.phone ?? payload.phone_number ?? payload.phoneNumber ?? storePayload.phone;
        if (phone !== undefined) {
            seller.phone = String(phone).trim();
        }

        const address = payload.address ?? payload.storeAddress ?? payload.store_address ?? storePayload.storeAddress ?? storePayload.store_address;
        if (address !== undefined) {
            seller.address = String(address).trim();
        }

        const city = payload.city ?? storePayload.city;
        if (city !== undefined) {
            seller.city = String(city).trim();
        }

        const state = payload.state ?? storePayload.state;
        if (state !== undefined) {
            seller.state = String(state).trim();
        }

        const zipCode = payload.zipCode ?? payload.pincode ?? payload.zip_code ?? storePayload.pincode ?? storePayload.zipCode;
        if (zipCode !== undefined) {
            seller.zipCode = String(zipCode).trim();
        }

        const gstNumber = payload.gstNumber ?? payload.gst_number ?? payload.gst ?? storePayload.gstNumber ?? storePayload.gst_number;
        if (gstNumber !== undefined) {
            seller.gstNumber = String(gstNumber).trim();
        }

        const rawPickupAddressId = payload.pickup_address_id ?? payload.pickupAddressId ?? storePayload.pickup_address_id ?? storePayload.pickupAddressId;
        if (rawPickupAddressId !== undefined) {
            if (rawPickupAddressId === null || rawPickupAddressId === "") {
                seller.pickup_address_id = null;
            } else {
                const parsed = Number(rawPickupAddressId);
                if (!isNaN(parsed)) {
                    seller.pickup_address_id = parsed;
                }
            }
        }

        await seller.save({ transaction });

        // 2. Update Store
        const store = await Store.findOne({
            where: { sellerId: seller.id },
            transaction
        });

        if (store) {
            if (businessName !== undefined && typeof businessName === "string" && businessName.trim()) {
                store.storeName = businessName.trim();
            }
            if (address !== undefined) {
                store.storeAddress = String(address).trim();
            }
            if (zipCode !== undefined) {
                store.pincode = String(zipCode).trim();
            }
            if (seller.pickup_address_id !== undefined) {
                store.pickup_address_id = seller.pickup_address_id;
            }

            // Store category
            const rawCategory = storePayload.storeCategory ?? storePayload.store_category ?? payload.storeCategory ?? payload.store_category;
            if (rawCategory !== undefined) {
                let normalizedCategory: string[] = [];
                if (Array.isArray(rawCategory)) {
                    normalizedCategory = rawCategory.map((c) => String(c).trim()).filter(Boolean);
                } else if (typeof rawCategory === "string" && rawCategory.trim()) {
                    try {
                        const parsed = JSON.parse(rawCategory.trim());
                        if (Array.isArray(parsed)) {
                            normalizedCategory = parsed.map((c) => String(c).trim()).filter(Boolean);
                        } else if (parsed) {
                            normalizedCategory = [String(parsed).trim()];
                        }
                    } catch {
                        normalizedCategory = rawCategory.split(",").map((c: string) => c.trim()).filter(Boolean);
                    }
                }
                if (normalizedCategory.length > 0) {
                    store.storeCategory = normalizedCategory;
                }
            }

            // Latitude & Longitude
            const rawLat = storePayload.latitude ?? payload.latitude;
            if (rawLat !== undefined && rawLat !== null && rawLat !== "") {
                const parsedLat = Number(rawLat);
                if (!isNaN(parsedLat)) store.latitude = parsedLat;
            }
            const rawLng = storePayload.longitude ?? payload.longitude;
            if (rawLng !== undefined && rawLng !== null && rawLng !== "") {
                const parsedLng = Number(rawLng);
                if (!isNaN(parsedLng)) store.longitude = parsedLng;
            }

            // Operating days & hours
            const rawDays = storePayload.openingDays ?? storePayload.opening_days ?? payload.openingDays ?? payload.opening_days ?? payload.storeOpeningDays ?? payload.store_opening_days;
            if (rawDays !== undefined) {
                if (Array.isArray(rawDays)) {
                    store.openingDays = rawDays.map((d: any) => String(d).trim()).filter(Boolean);
                } else if (typeof rawDays === "string") {
                    try {
                        const parsed = JSON.parse(rawDays);
                        if (Array.isArray(parsed)) {
                            store.openingDays = parsed.map((d: any) => String(d).trim()).filter(Boolean);
                        } else {
                            store.openingDays = rawDays.split(",").map((d: string) => d.trim()).filter(Boolean);
                        }
                    } catch {
                        store.openingDays = rawDays.split(",").map((d: string) => d.trim()).filter(Boolean);
                    }
                }
            }

            const openingTime = storePayload.openingTime ?? storePayload.opening_time ?? payload.openingTime ?? payload.opening_time ?? payload.storeOpeningTime ?? payload.store_opening_time;
            if (openingTime !== undefined && typeof openingTime === "string") {
                store.openingTime = openingTime.trim();
            }

            const closingTime = storePayload.closingTime ?? storePayload.closing_time ?? payload.closingTime ?? payload.closing_time ?? payload.storeClosingTime ?? payload.store_closing_time;
            if (closingTime !== undefined && typeof closingTime === "string") {
                store.closingTime = closingTime.trim();
            }

            const isSellerOpen = storePayload.isSellerOpen ?? storePayload.is_seller_open ?? payload.isSellerOpen ?? payload.is_seller_open ?? payload.isOpen ?? payload.is_open;
            if (isSellerOpen !== undefined && typeof isSellerOpen === "boolean") {
                store.isSellerOpen = isSellerOpen;
            }

            await store.save({ transaction });
        }

        // 3. Update BankDetail (create if not exists)
        const accountHolderName = bankPayload.accountHolderName ?? bankPayload.account_holder_name ?? payload.accountHolderName ?? payload.account_holder_name;
        const accountNumber = bankPayload.accountNumber ?? bankPayload.account_number ?? payload.accountNumber ?? payload.account_number;
        const ifscCode = bankPayload.ifscCode ?? bankPayload.ifsc_code ?? payload.ifscCode ?? payload.ifsc_code;
        const termsAccepted = bankPayload.termsAccepted ?? bankPayload.terms_accepted ?? payload.termsAccepted ?? payload.terms_accepted;

        if (accountHolderName !== undefined || accountNumber !== undefined || ifscCode !== undefined || termsAccepted !== undefined) {
            let bankDetail = await BankDetail.findOne({
                where: { sellerId: seller.id },
                transaction
            });

            if (bankDetail) {
                if (accountHolderName !== undefined) bankDetail.accountHolderName = String(accountHolderName).trim();
                if (accountNumber !== undefined) bankDetail.accountNumber = String(accountNumber).trim();
                if (ifscCode !== undefined) bankDetail.ifscCode = String(ifscCode).trim().toUpperCase();
                if (termsAccepted !== undefined) bankDetail.termsAccepted = Boolean(termsAccepted);
                await bankDetail.save({ transaction });
            } else if (accountHolderName && accountNumber && ifscCode) {
                await BankDetail.create({
                    sellerId: seller.id,
                    accountHolderName: String(accountHolderName).trim(),
                    accountNumber: String(accountNumber).trim(),
                    ifscCode: String(ifscCode).trim().toUpperCase(),
                    termsAccepted: termsAccepted !== undefined ? Boolean(termsAccepted) : false,
                }, { transaction });
            }
        }

        // 4. Update User email / phone_number if provided and changed
        const user = await User.findByPk(userId, { transaction });
        if (user) {
            const newEmail = payload.email ? String(payload.email).trim().toLowerCase() : undefined;
            if (newEmail && newEmail !== user.email) {
                const existingUser = await User.findOne({
                    where: { email: newEmail, id: { [Op.ne]: userId } },
                    transaction
                });
                if (existingUser) {
                    const error: any = new Error("Email is already in use by another account");
                    error.status = 400;
                    throw error;
                }
                user.email = newEmail;
            }

            const newPhoneNumber = payload.phone_number ?? payload.phoneNumber;
            if (newPhoneNumber && String(newPhoneNumber).trim() !== user.phone_number) {
                const trimmedPhone = String(newPhoneNumber).trim();
                const existingPhoneUser = await User.findOne({
                    where: { phone_number: trimmedPhone, id: { [Op.ne]: userId } },
                    transaction
                });
                if (existingPhoneUser) {
                    const error: any = new Error("Phone number is already in use by another account");
                    error.status = 400;
                    throw error;
                }
                user.phone_number = trimmedPhone;
            }

            await user.save({ transaction });
        }

        // Commit transaction
        await transaction.commit();

        // Return refreshed profile
        return await getSellerProfile(userId);
    } catch (err) {
        await transaction.rollback();
        throw err;
    }
};

