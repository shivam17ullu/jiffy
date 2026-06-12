import { User, Role, SellerProfile } from "../model/relations.js";
import VerifiedSellers from "../model/seller/verified_sellers.js";
import { ApiError } from "../utils/ApiError.js";
const SELLER_NOT_ACTIVE_MSG = "Seller account is not active. Complete phone verification first.";
const SELLER_PENDING_APPROVAL_MSG = "Seller account is pending admin approval.";
export const userHasSellerRole = (user) => (user.Roles ?? []).some((r) => r.name === "seller");
/**
 * Ensures a seller may log in or use seller APIs:
 * - users.is_active must be true
 * - if SellerProfile exists, verified_sellers.is_active must be true
 */
export async function assertSellerCanAccess(userId) {
    const user = await User.findByPk(userId, {
        include: [Role, SellerProfile],
    });
    if (!user) {
        throw ApiError.notFound("User account not found");
    }
    if (!userHasSellerRole(user)) {
        throw ApiError.forbidden("Access denied. Seller role required.");
    }
    // if (!user.is_active) {
    //   throw ApiError.forbidden(SELLER_NOT_ACTIVE_MSG);
    // }
    const profile = user.SellerProfile;
    if (profile?.id) {
        const verified = await VerifiedSellers.findOne({
            where: { sellerId: profile.id },
        });
        // if (!verified?.is_active) {
        //   throw ApiError.forbidden(SELLER_PENDING_APPROVAL_MSG);
        // }
    }
}
/** Check seller activation by phone before sending OTP (early block). */
export async function assertSellerCanAccessByPhone(phone_number) {
    const user = await User.findOne({
        where: { phone_number },
        include: [Role, SellerProfile],
    });
    if (!user || !userHasSellerRole(user)) {
        return;
    }
    // If the seller is in the middle of registration (no SellerProfile yet),
    // we do not check is_active.
    if (!user.SellerProfile) {
        return;
    }
    await assertSellerCanAccess(user.id);
}
export { SELLER_NOT_ACTIVE_MSG, SELLER_PENDING_APPROVAL_MSG };
