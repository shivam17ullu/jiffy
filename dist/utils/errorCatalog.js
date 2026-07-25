import { ApiError } from "./ApiError.js";
import { ValidationError, UniqueConstraintError, DatabaseError, } from "sequelize";
/** Maps service-layer error messages to API-facing responses */
export const ERROR_CATALOG = {
    "Invalid OTP": {
        status: 401,
        message: "Invalid OTP provided",
        field: "otp",
    },
    "OTP expired": {
        status: 401,
        message: "OTP has expired. Please request a new one",
        field: "otp",
    },
    "Invalid refresh token": {
        status: 401,
        message: "Invalid or revoked refresh token",
        field: "refreshToken",
    },
    "Refresh token expired": {
        status: 401,
        message: "Refresh token has expired. Please log in again",
        field: "refreshToken",
    },
    "User not found for this phone number": {
        status: 404,
        message: "No seller account found for this phone number",
        field: "phone_number",
    },
    "Error Occurred.": {
        status: 500,
        message: "Seller registration failed. Please try again later",
    },
    "Variant not found": {
        status: 404,
        message: "Product variant not found",
        field: "variantId",
    },
    "No variant found for this product": {
        status: 404,
        message: "This product has no available variants",
        field: "productId",
    },
    "Cart item not found": {
        status: 404,
        message: "Cart item not found",
        field: "itemId",
    },
    "Cart is empty": {
        status: 400,
        message: "Your cart is empty. Add items before placing an order",
    },
    "Cart not found": {
        status: 404,
        message: "Cart not found",
        field: "cartId",
    },
    "Product not found": {
        status: 404,
        message: "Product not found",
        field: "productId",
    },
    "Product already in wishlist": {
        status: 409,
        message: "Product is already in your wishlist",
        field: "productId",
    },
    "Product not found in wishlist": {
        status: 404,
        message: "Product not found in wishlist",
        field: "productId",
    },
    "Only image files are allowed": {
        status: 400,
        message: "Only image files are allowed",
        field: "images",
    },
    "Invalid variants format. Must be valid JSON array.": {
        status: 400,
        message: "Invalid variants format. Provide a valid JSON array",
        field: "variants",
    },
};
/** Seller activation messages (thrown as ApiError; documented for API consumers) */
export const SELLER_ACCESS_ERRORS = {
    notActive: "Seller account is not active. Complete phone verification first.",
    pendingApproval: "Seller account is pending admin approval.",
};
export const resolveError = (error) => {
    if (error instanceof ApiError) {
        return {
            status: error.statusCode,
            message: error.message,
            errors: error.errors,
        };
    }
    if (error instanceof UniqueConstraintError) {
        const errItem = error.errors[0];
        const field = errItem?.path ?? "field";
        const modelName = errItem?.instance?.constructor?.name;
        let message = "A record with this value already exists";
        if (modelName === "Product") {
            if (field === "slug") {
                message = "A product with this name already exists";
            }
            else {
                message = `Product field '${field}' must be unique`;
            }
        }
        else if (modelName === "Category") {
            if (field === "slug") {
                message = "A category with this name already exists";
            }
            else {
                message = `Category field '${field}' must be unique`;
            }
        }
        else if (modelName === "User") {
            if (field === "phone_number") {
                message = "Phone number is already registered";
            }
            else if (field === "email") {
                message = "Email is already registered";
            }
            else {
                message = "Phone number or email is already registered";
            }
        }
        else if (modelName === "Wishlist") {
            message = "Product is already in your wishlist";
        }
        else if (modelName === "Cart") {
            message = "Product variant is already in your cart";
        }
        else if (modelName === "Role") {
            message = "Role already exists";
        }
        else {
            // Fallback matching by field name if modelName is not found or for other models
            if (field === "phone_number") {
                message = "Phone number is already registered";
            }
            else if (field === "email") {
                message = "Email is already registered";
            }
            else if (field === "slug") {
                message = "A record with this name already exists";
            }
            else {
                message = `${field.charAt(0).toUpperCase() + field.slice(1)} must be unique`;
            }
        }
        return { status: 409, message, errors: [] };
    }
    if (error instanceof ValidationError) {
        const detail = error.errors[0]?.message;
        return {
            status: 400,
            message: detail && detail !== "Validation error" ? detail : "Invalid request data",
            errors: [],
        };
    }
    if (error instanceof DatabaseError) {
        return {
            status: 500,
            message: "A database error occurred. Please try again later",
            errors: [],
        };
    }
    const rawMessage = error instanceof Error ? error.message : "An unexpected error occurred";
    if (rawMessage.startsWith("Insufficient stock")) {
        return {
            status: 409,
            message: "One or more cart items are out of stock",
            errors: [],
        };
    }
    if (rawMessage.startsWith("Invalid status.")) {
        return {
            status: 400,
            message: "Invalid order status. Allowed values: Created, Confirmed, Out For Delivery, Delivered, Return Processed, Return Accepted, Return Rejected, Refund Successful, Rejected, Cancelled",
            errors: [
                {
                    field: "status",
                    message: "Invalid order status value",
                },
            ],
        };
    }
    if (rawMessage.includes("Order not found") ||
        rawMessage.includes("permission")) {
        return {
            status: 404,
            message: "Order not found or you do not have permission to access it",
            errors: [],
        };
    }
    const catalog = ERROR_CATALOG[rawMessage];
    if (catalog) {
        const errors = catalog.field
            ? [{ field: catalog.field, message: catalog.message }]
            : [];
        return { status: catalog.status, message: catalog.message, errors };
    }
    if (rawMessage.includes("Sequelize") || rawMessage.includes("ECONNREFUSED")) {
        return {
            status: 500,
            message: "A database error occurred. Please try again later",
            errors: [],
        };
    }
    return {
        status: 400,
        message: rawMessage || "Invalid request data",
        errors: [],
    };
};
