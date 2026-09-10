# Jiffy E-Commerce API Documentation

Complete API documentation for the Jiffy E-Commerce Platform with Buyer and Seller functionalities.

## Base URL

```
http://localhost:3000/api
```

## Authentication

Most endpoints require JWT authentication. Include the token in the Authorization header:

```
Authorization: Bearer <access_token>
```

## Swagger Documentation

Access interactive API documentation at:

```
http://localhost:3000/api-docs
```

---
## Error Response Schema

Error responses return only a message in the body. The HTTP status code is set on the response (e.g. 400, 401, 403, 404).

```json
{
  "success": false,
  "message": "Invalid request data"
}
```

---


## 📋 Table of Contents

1. [Authentication APIs](#authentication-apis)
2. [Product APIs](#product-apis)
3. [Category APIs](#category-apis)
4. [Cart APIs](#cart-apis)
5. [Wishlist APIs](#wishlist-apis)
6. [Order APIs](#order-apis)
7. [Profile APIs](#profile-apis)
8. [Store APIs](#store-apis)
9. [Location APIs](#location-apis)
10. [Seller APIs](#seller-apis)

---

## 🔐 Authentication APIs

### 1. Send OTP (Buyer Login)

**POST** `/api/auth/send-otp`

Send OTP to phone number for buyer login.

**Request Body:**

```json
{
  "phone_number": "9876543210"
}
```

**Response:**

```json
{
  "status": 200,
  "message": "OTP sent successfully",
  "response": null
}
```

**Error Response:**

```json
{
  "success": false,
  "status": 400,
  "message": "Phone number is required",
  "errors": [
  {
    "field": "phone_number",
    "message": "Phone number is required"
  }
]
}
```

**Error Response (inactive seller — phone not verified or pending admin approval):**

```json
{
  "success": false,
  "status": 403,
  "message": "Seller account is not active. Complete phone verification first.",
  "errors": []
}
```

**Error Response (mobile number not registered):**

```json
{
  "success": false,
  "status": 404,
  "message": "Mobile number is not registered. Please sign up first.",
  "errors": [
    {
      "field": "phone_number",
      "message": "Mobile number is not registered. Please sign up first."
    }
  ]
}
```

---

### 2. Verify OTP (Buyer Login)

**POST** `/api/auth/verify-otp`

Verify OTP and login. Phone number must already exist in the database (registered via buyer or seller sign-up).

**Request Body:**

```json
{
  "phone_number": "9876543210",
  "otp": "123456"
}
```

**Response:**

```json
{
  "status": 200,
  "message": "Login successful",
  "response": {
    "user": { ... },
    "accessToken": "eyJhbGc...",
    "refreshToken": "eyJhbGc..."
  }
}
```

**Error Response:**

```json
{
  "success": false,
  "status": 401,
  "message": "Invalid OTP provided",
  "errors": [
  {
    "field": "otp",
    "message": "Invalid OTP provided"
  }
]
}
```

**Error Response (seller not active or pending admin approval):**

```json
{
  "success": false,
  "status": 403,
  "message": "Seller account is pending admin approval.",
  "errors": []
}
```

---

### 3. Refresh Token

**POST** `/api/auth/refresh-token`

Get new access token using refresh token.

**Request Body:**

```json
{
  "refreshToken": "eyJhbGc..."
}
```

**Error Response:**

```json
{
  "success": false,
  "status": 401,
  "message": "Refresh token is invalid or expired",
  "errors": []
}
```

**Error Response (seller account deactivated):**

```json
{
  "success": false,
  "status": 403,
  "message": "Seller account is not active. Complete phone verification first.",
  "errors": []
}
```

---

### 4. Logout

**POST** `/api/auth/logout`

Revoke refresh token.

**Error Response:**

```json
{
  "success": false,
  "status": 401,
  "message": "Authentication required to logout",
  "errors": []
}
```

---

### 5. Register Seller (Step 1)

**POST** `/api/auth/register-seller`

First step of seller registration.

**Request Body:**

```json
{
  "phone_number": "9876543210",
  "email": "seller@example.com",
  "password": "SecurePassword123"
}
```

**Error Response:**

```json
{
  "success": false,
  "status": 409,
  "message": "Phone number or email is already registered",
  "errors": []
}
```

---

### 6. Verify Seller OTP (Step 2)

**POST** `/api/auth/verify-seller-otp`

Verify OTP and activate seller account.

**Request Body:**

```json
{
  "phone_number": "9876543210",
  "otp": "123456"
}
```

**Error Response:**

```json
{
  "success": false,
  "status": 401,
  "message": "Invalid seller OTP",
  "errors": [
  {
    "field": "otp",
    "message": "Invalid seller OTP"
  }
]
}
```

---

### 7. Onboard Seller (Step 3)

**POST** `/api/auth/onboard-seller`

Complete seller profile setup. **Requires Authentication**

**Request Body:**

```json
{
  "userId": 1,
  "store": {
    "storeName": "My Store",
    "storeAddress": "123 Main St",
    "pincode": "123456",
    "phone": "9876543210",
    "openingDays": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
    "openingTime": "09:00 AM",
    "closingTime": "09:00 PM"
  },
  "bankDetails": {
    "accountHolderName": "John Doe",
    "accountNumber": "1234567890",
    "ifscCode": "BANK0001234",
    "termsAccepted": true
  },
  "documents": {
    "aadhaarUrl": "https://example.com/aadhaar.pdf",
    "panUrl": "https://example.com/pan.pdf",
    "gstUrl": "https://example.com/gst.pdf"
  }
}
```

**Error Response:**

```json
{
  "success": false,
  "status": 400,
  "message": "All onboarding fields are required",
  "errors": []
}
```

---

### 8. Refresh Token (Seller)

**POST** `/api/seller/refresh-token` or `/api/auth/seller/refresh-token`

Generate a new access token and rotate refresh token for an authenticated seller. Validates that the user has the seller role and active status.

**Request Body:**

```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response:**

```json
{
  "status": 200,
  "message": "Token refreshed successfully",
  "data": {
    "accessToken": "eyJhbGci...",
    "refreshToken": "eyJhbGci...",
    "user": {
      "id": 10,
      "phone_number": "9876543210",
      "email": "seller@example.com",
      "is_active": true,
      "Roles": [
        {
          "id": 2,
          "name": "seller"
        }
      ],
      "SellerProfile": {
        "id": 1,
        "userId": 10,
        "businessName": "Fashion Hub",
        "phone": "9876543210"
      }
    }
  }
}
```

**Error Response (Missing Refresh Token):**

```json
{
  "success": false,
  "status": 400,
  "message": "Refresh token is required",
  "errors": []
}
```

**Error Response (Invalid or Expired Refresh Token):**

```json
{
  "success": false,
  "status": 401,
  "message": "Invalid or revoked refresh token",
  "errors": []
}
```

**Error Response (Not a Seller):**

```json
{
  "success": false,
  "status": 403,
  "message": "Access denied. Seller role required.",
  "errors": []
}
```

---

## 📦 Product APIs

### 1. List Products (Public)

**GET** `/api/products`

Get paginated list of products with filters.

**Query Parameters:**

- `page` (integer, default: 1)
- `limit` (integer, default: 20)
- `q` (string) - Search query
- `categoryId` (integer) - Filter by category (includes subcategories)
- `brand` (string) - Filter by brand
- `minPrice` (number) - Minimum price
- `maxPrice` (number) - Maximum price
- `sort` (string) - Sort options: `price:ASC`, `price:DESC`, `name:ASC`, `name:DESC`, `createdAt:DESC`

**Example:**

```
GET /api/products?page=1&limit=20&q=shirt&categoryId=1&minPrice=100&maxPrice=1000&sort=price:ASC
```

**Response:**

```json
{
  "success": true,
  "items": [
    {
      "id": 1,
      "name": "Blue Shirt",
      "description": "Premium cotton shirt",
      "brand": "Levis",
      "images": ["https://..."],
      "priceRange": {
        "min": 500,
        "max": 1500
      },
      "seller": {
        "id": 2,
        "phone_number": "9876543210",
        "email": "seller@example.com",
        "profile": {
          "businessName": "Fashion Hub",
          "city": "Mumbai",
          "state": "Maharashtra"
        }
      },
      "variants": [...],
      "categories": [...]
    }
  ],
  "total": 100,
  "page": 1,
  "limit": 20,
  "totalPages": 5
}
```

**Error Response:**

```json
{
  "success": false,
  "status": 400,
  "message": "Invalid filter parameters",
  "errors": []
}
```

---

### 2. Get Product by ID (Public)

**GET** `/api/products/:id`

Get detailed product information.

**Response:**

```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Blue Shirt",
    "description": "...",
    "priceRange": { "min": 500, "max": 1500 },
    "variants": [...],
    "categories": [...],
    "seller": {...}
  }
}
```

**Error Response:**

```json
{
  "success": false,
  "status": 404,
  "message": "Product not found",
  "errors": []
}
```

---

### 3. Create Product (Seller Only)

**POST** `/api/products`

Create a new product. **Requires Authentication**

**Request Body:**

```json
{
  "name": "Blue Shirt",
  "description": "Premium cotton shirt",
  "brand": "Levis",
  "details": "100% Cotton, Slim Fit",
  "images": ["https://example.com/image1.jpg"],
  "tags": ["shirt", "men"],
  "categories": [1, 2],
  "isReturnable": true,
  "isExchangeable": true,
  "variants": [
    {
      "sku": "BS-S-M",
      "size": "M",
      "color": "Blue",
      "price": 500,
      "mrp": 800,
      "stock": 100
    }
  ]
}
```

**Error Response:**

```json
{
  "success": false,
  "status": 401,
  "message": "Authentication required to create a product",
  "errors": []
}
```

---

### 4. Get Seller's Products (Seller Only)

**GET** `/api/products/seller/me`

Get paginated list of seller's own products. **Requires Authentication**

**Query Parameters:** Same as List Products

**Error Response:**

```json
{
  "success": false,
  "status": 403,
  "message": "Only sellers can access this endpoint",
  "errors": []
}
```

---

### 5. Update Product (Seller Only)

**PUT** `/api/products/:id`

Update product details including return/exchange flags. **Requires Authentication & Ownership**

**Error Response:**

```json
{
  "success": false,
  "status": 403,
  "message": "Not authorized to update this product",
  "errors": []
}
```

---

### 6. Update Product Return & Exchange Policy (Seller Only)

**PATCH** `/api/products/:id/return-exchange`

Update whether a product is eligible for returns and/or exchanges. **Requires Authentication & Ownership**

**Request Body:**

```json
{
  "isReturnable": true,
  "isExchangeable": false
}
```

**Response:**

```json
{
  "success": true,
  "message": "Product return/exchange policy updated successfully",
  "data": {
    "id": 1,
    "name": "Blue Shirt",
    "isReturnable": true,
    "isExchangeable": false
  }
}
```

---

### 7. Delete Product (Seller Only)

**DELETE** `/api/products/:id`

Delete a product. **Requires Authentication & Ownership**

**Error Response:**

```json
{
  "success": false,
  "status": 404,
  "message": "Product not found or already deleted",
  "errors": []
}
```

---

## 📁 Category APIs

### 1. List Categories (Public)

**GET** `/api/categories`

Get all categories with optional filters.

**Query Parameters:**

- `level` (integer) - Filter by level (0, 1, 2)
- `parentId` (integer) - Filter by parent category

**Error Response:**

```json
{
  "success": false,
  "status": 400,
  "message": "Invalid category filter values",
  "errors": []
}
```

---

### 2. Get Category by ID (Public)

**GET** `/api/categories/:id`

**Error Response:**

```json
{
  "success": false,
  "status": 404,
  "message": "Category not found",
  "errors": []
}
```

---

### 3. Create Category (Admin)

**POST** `/api/categories`

**Requires Authentication**

**Request Body:**

```json
{
  "name": "Electronics",
  "parentId": null,
  "level": 0
}
```

**Error Response:**

```json
{
  "success": false,
  "status": 403,
  "message": "Admin privileges required to create a category",
  "errors": []
}
```

---

## 🛒 Cart APIs

All cart APIs require authentication.

### 1. Get Cart

**GET** `/api/cart`

Get detailed cart with all items.

**Response:**

```json
{
  "success": true,
  "data": {
    "cart": {
      "id": 1,
      "userId": 1,
      "createdAt": "...",
      "updatedAt": "..."
    },
    "items": [
      {
        "id": 1,
        "productId": 1,
        "variantId": 1,
        "qty": 2,
        "price": 500,
        "subtotal": 1000,
        "product": {...},
        "variant": {...},
        "stockAvailable": true
      }
    ],
    "summary": {
      "itemCount": 1,
      "totalItems": 2,
      "subtotal": 1000,
      "total": 1000
    }
  }
}
```

**Error Response:**

```json
{
  "success": false,
  "status": 404,
  "message": "Cart not found for this user",
  "errors": []
}
```

---

### 2. Add Item to Cart

**POST** `/api/cart/add`

**Request Body:**

```json
{
  "productId": 1,
  "variantId": 1,
  "qty": 1
}
```

**Error Response:**

```json
{
  "success": false,
  "status": 409,
  "message": "Requested quantity exceeds available stock",
  "errors": [
  {
    "field": "qty",
    "message": "Requested quantity exceeds available stock"
  }
]
}
```

---

### 3. Update Cart Item Quantity

**PUT** `/api/cart/item/:itemId`

**Request Body:**

```json
{
  "qty": 3
}
```

**Error Response:**

```json
{
  "success": false,
  "status": 404,
  "message": "Cart item not found",
  "errors": []
}
```

---

### 4. Remove Item from Cart

**DELETE** `/api/cart/item/:itemId`

**Error Response:**

```json
{
  "success": false,
  "status": 404,
  "message": "Cart item not found",
  "errors": []
}
```

---

## ❤️ Wishlist APIs

All wishlist APIs require authentication (Buyer only).

### 1. Get Wishlist

**GET** `/api/wishlist`

Get paginated wishlist with product details.

**Query Parameters:**

- `page` (integer, default: 1)
- `limit` (integer, default: 20)

**Response:**

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": 1,
        "productId": 1,
        "addedAt": "2024-01-01T00:00:00.000Z",
        "product": {
          "id": 1,
          "name": "Blue Shirt",
          "priceRange": { "min": 500, "max": 1500 },
          "variants": [...],
          "categories": [...],
          "seller": {...}
        }
      }
    ],
    "total": 10,
    "page": 1,
    "limit": 20,
    "totalPages": 1
  }
}
```

**Error Response:**

```json
{
  "success": false,
  "status": 401,
  "message": "Authentication required to view wishlist",
  "errors": []
}
```

---

### 2. Add Product to Wishlist

**POST** `/api/wishlist`

**Request Body:**

```json
{
  "productId": 1
}
```

**Error Response:**

```json
{
  "success": false,
  "status": 409,
  "message": "Product is already in the wishlist",
  "errors": []
}
```

---

### 3. Remove Product from Wishlist

**DELETE** `/api/wishlist/:productId`

**Error Response:**

```json
{
  "success": false,
  "status": 404,
  "message": "Product not found in wishlist",
  "errors": []
}
```

---

### 4. Check if Product in Wishlist

**GET** `/api/wishlist/check/:productId`

**Response:**

```json
{
  "success": true,
  "data": {
    "isInWishlist": true
  }
}
```

**Error Response:**

```json
{
  "success": false,
  "status": 401,
  "message": "Authentication required to check wishlist status",
  "errors": []
}
```

---

## 📦 Order APIs

All order APIs require authentication.

### 1. Create Order from Cart

**POST** `/api/orders`

Creates separate orders for each seller (groups cart items by seller).

**Request Body:**

```json
{
  "cartId": 1,
  "shippingAddress": {
    "fullName": "John Doe",
    "address": "123 Main St",
    "city": "Mumbai",
    "state": "Maharashtra",
    "zipCode": "400001",
    "phone": "9876543210"
  },
  "paymentInfo": {
    "method": "UPI",
    "transactionId": "TXN123456"
  }
}
```

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "userId": 1,
      "sellerId": 2,
      "total": 1000,
      "status": "created",
      "items": [...]
    }
  ]
}
```

**Error Response:**

```json
{
  "success": false,
  "status": 409,
  "message": "One or more cart items are out of stock",
  "errors": []
}
```

---

### 2. List Orders

**GET** `/api/orders`

Get paginated list of orders. Returns buyer's orders or seller's orders based on role.

**Query Parameters:**

- `page` (integer, default: 1)
- `limit` (integer, default: 20)
- `status` (string) - Filter by status: `pending`, `confirmed`, `processing`, `shipped`, `delivered`, `cancelled`

**Error Response:**

```json
{
  "success": false,
  "status": 400,
  "message": "Invalid order status filter",
  "errors": []
}
```

---

### 3. Get Order by ID

**GET** `/api/orders/:id`

Get detailed order information with full product, buyer, and seller details.

**Error Response:**

```json
{
  "success": false,
  "status": 404,
  "message": "Order not found",
  "errors": []
}
```

---

### 4. Update Order Status (Seller Only)

**PATCH** `/api/orders/:id/status`

**Request Body:**

```json
{
  "status": "shipped"
}
```

**Allowed Statuses:** `pending`, `confirmed`, `processing`, `shipped`, `delivered`, `cancelled`

**Error Response:**

```json
{
  "success": false,
  "status": 400,
  "message": "Invalid order status value",
  "errors": [
  {
    "field": "status",
    "message": "Invalid order status value"
  }
]
}
```

---

### 5. Upload Order Verification Images (Seller Only)

**POST** `/api/orders/:id/verification-images` (Alias: `/api/orders/:id/images`)

Upload between 1 and 3 product condition & packaging verification images after accepting an order to prevent damage/wrong item disputes. Once uploaded, these image URLs are added to the order's `verificationImages` list and returned in order list and order detail APIs for Seller, Admin, and Buyer.

**Authentication:** Required (Seller role, order must belong to this seller)

**Content-Type:** `multipart/form-data` OR `application/json`

**Multipart Form-Data:**
- `images`: Array of 1 to 3 image files (or single `image`)

**JSON Request Body (Base64 / URL strings):**

```json
{
  "images": [
    "data:image/jpeg;base64,...",
    "data:image/jpeg;base64,..."
  ]
}
```

**Success Response:**

```json
{
  "success": true,
  "message": "Order verification images uploaded successfully",
  "data": {
    "id": 1,
    "userId": 10,
    "sellerId": 2,
    "total": 1500,
    "status": "Confirmed",
    "verificationImages": [
      "https://drapeit-products.s3.ap-southeast-2.amazonaws.com/order-verification/uuid1.jpg",
      "https://drapeit-products.s3.ap-southeast-2.amazonaws.com/order-verification/uuid2.jpg"
    ],
    "shippingAddress": { ... },
    "paymentInfo": { ... }
  }
}
```

**Error Response (Invalid image count):**

```json
{
  "success": false,
  "status": 400,
  "message": "Please provide between 1 and 3 verification images",
  "errors": [
    {
      "field": "images",
      "message": "Please provide between 1 and 3 verification images"
    }
  ]
}
```

**Error Response (Forbidden / Not Order Seller):**

```json
{
  "success": false,
  "status": 403,
  "message": "You do not have permission to upload verification images for this order",
  "errors": []
}
```

---

## 👤 Profile APIs

### 1. Get Buyer Profile

**GET** `/api/profile/:id`

**Error Response:**

```json
{
  "success": false,
  "status": 404,
  "message": "Profile not found",
  "errors": []
}
```

---

### 2. Create/Update Buyer Profile

**POST** `/api/profile/setup`

**Requires Authentication**

**Request Body:**

```json
{
  "userId": 1,
  "fullName": "John Doe",
  "phone": "9876543210",
  "address": "123 Main St",
  "city": "Mumbai",
  "state": "Maharashtra",
  "zipCode": "400001"
}
```

**Error Response:**

```json
{
  "success": false,
  "status": 400,
  "message": "All profile fields are required",
  "errors": [
  {
    "field": "fullName",
    "message": "All profile fields are required"
  }
]
}
```

---

## 🏪 Store APIs

### 1. List Verified Stores (Public)

**GET** `/api/stores/list`

Get all verified and active seller stores.

**Error Response:**

```json
{
  "success": false,
  "status": 500,
  "message": "Unable to retrieve store list",
  "errors": []
}
```

---

## 📍 Location APIs

All location APIs require authentication.

### 1. Create Location

**POST** `/api/location`

Add a new shipping address.

**Request Body:**

```json
{
  "userId": 1,
  "address": "123 Main St",
  "city": "Mumbai",
  "state": "Maharashtra",
  "zipCode": "400001",
  "isDefault": true
}
```

**Error Response:**

```json
{
  "success": false,
  "status": 400,
  "message": "Invalid location data",
  "errors": []
}
```

---

### 2. Get User Locations

**GET** `/api/location/:userId`

**Error Response:**

```json
{
  "success": false,
  "status": 404,
  "message": "No locations found for this user",
  "errors": []
}
```

---

### 3. Update Location

**PUT** `/api/location/:id`

**Error Response:**

```json
{
  "success": false,
  "status": 404,
  "message": "Location not found",
  "errors": []
}
```

---

### 4. Delete Location

**DELETE** `/api/location/:id`

**Request Body:**

```json
{
  "userId": 1
}
```

**Error Response:**

```json
{
  "success": false,
  "status": 400,
  "message": "Unable to delete location",
  "errors": []
}
```

---

## 👨‍💼 Seller APIs

### 1. Seller Refresh Token

**POST** `/api/seller/refresh-token` (or `/api/auth/seller/refresh-token`)

Refresh access token specifically for seller application. Requires valid `refreshToken` in request body.

**Request Body:**
```json
{
  "refreshToken": "eyJhbGci..."
}
```

---

### 2. Get Seller Dashboard Statistics

**GET** `/api/seller/stats`

Get comprehensive seller statistics. **Requires Authentication (Seller only)**

**Response:**

```json
{
  "success": true,
  "data": {
    "overview": {
      "totalProducts": 50,
      "activeProducts": 45,
      "inactiveProducts": 5,
      "totalOrders": 200,
      "totalRevenue": 50000
    },
    "ordersByStatus": {
      "pending": 5,
      "confirmed": 10,
      "processing": 8,
      "shipped": 15,
      "delivered": 150,
      "cancelled": 12
    },
    "recentOrders": [...],
    "lowStockProducts": [
      {
        "id": 1,
        "name": "Product Name",
        "variants": [
          {
            "id": 1,
            "sku": "SKU123",
            "stock": 5
          }
        ]
      }
    ]
  }
}
```

**Error Response (not a seller):**

```json
{
  "success": false,
  "status": 403,
  "message": "Access denied. Seller role required.",
  "errors": []
}
```

**Error Response (seller phone not verified — `users.is_active` is false):**

```json
{
  "success": false,
  "status": 403,
  "message": "Seller account is not active. Complete phone verification first.",
  "errors": []
}
```

**Error Response (seller pending admin approval — `verified_sellers.is_active` is false):**

```json
{
  "success": false,
  "status": 403,
  "message": "Seller account is pending admin approval.",
  "errors": []
}
```

### 2. Get Full Seller Profile

**GET** `/api/seller/profile` (or `/api/seller/me`)

Retrieve all details of the authenticated seller including profile, store (with opening schedule), bank details, documents, and verification status. **Requires Authentication (Seller only)**

**Response:**

```json
{
  "success": true,
  "status": 200,
  "message": "Seller profile retrieved successfully",
  "data": {
    "id": 1,
    "userId": 10,
    "businessName": "Fashion Hub",
    "phone": "9876543210",
    "address": "123 Fashion Street",
    "city": "Mumbai",
    "state": "Maharashtra",
    "zipCode": "400001",
    "gstNumber": "27AAAAA0000A1Z5",
    "email": "seller@example.com",
    "phone_number": "9876543210",
    "createdAt": "2026-08-29T06:30:00.000Z",
    "updatedAt": "2026-08-29T06:30:00.000Z",
    "store": {
      "id": 1,
      "sellerId": 1,
      "storeName": "Fashion Hub Main Store",
      "storeAddress": "123 Fashion Street, Mumbai",
      "pincode": "400001",
      "storeCategory": ["Men", "Women"],
      "is_active": true,
      "isSellerOpen": true,
      "latitude": 19.076,
      "longitude": 72.8777,
      "openingDays": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
      "openingTime": "09:00 AM",
      "closingTime": "09:00 PM",
      "createdAt": "2026-08-29T06:30:00.000Z",
      "updatedAt": "2026-08-29T06:30:00.000Z"
    },
    "Document": {
      "aadhaarUrl": "https://...",
      "panUrl": "https://...",
      "gstUrl": "https://...",
      "storeDocUrl": "https://...",
      "storeImageUrl": "https://..."
    },
    "BankDetail": {
      "accountHolderName": "Fashion Hub",
      "accountNumber": "1234567890",
      "ifscCode": "HDFC0001234",
      "termsAccepted": true
    },
    "VerifiedSeller": {
      "id": 1,
      "is_active": true,
      "status": "approved",
      "rejection_reason": null
    },
    "User": {
      "id": 10,
      "phone_number": "9876543210",
      "email": "seller@example.com",
      "is_active": true
    },
    "reason": null
  }
}
```

---

### 4. Update Operating Hours and Days

**PUT / PATCH** `/api/seller/operating-hours` (or `/api/seller/operating-schedule`)

Update operating days, opening time, and closing time for the authenticated seller's store. **Requires Authentication (Seller only)**

**Request Body:**

```json
{
  "openingDays": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
  "openingTime": "09:00 AM",
  "closingTime": "09:00 PM",
  "isSellerOpen": true
}
```

> **Note:**
> - `openingDays` can also be provided as a comma-separated string (e.g. `"Monday, Tuesday, Wednesday"`).
> - You can update one, multiple, or all fields in a single request.
> - `isSellerOpen` is optional and allows toggling the open/closed status.

**Response:**

```json
{
  "success": true,
  "status": 200,
  "message": "Operating hours and days updated successfully",
  "response": {
    "id": 1,
    "sellerId": 1,
    "storeName": "Fashion Hub Main Store",
    "storeAddress": "123 Fashion Street, Mumbai",
    "pincode": "400001",
    "storeCategory": ["Men", "Women"],
    "is_active": true,
    "isSellerOpen": true,
    "latitude": 19.076,
    "longitude": 72.8777,
    "openingDays": [
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday"
    ],
    "openingTime": "09:00 AM",
    "closingTime": "09:00 PM",
    "createdAt": "2026-08-29T06:30:00.000Z",
    "updatedAt": "2026-09-10T12:00:00.000Z"
  },
  "data": {
    "id": 1,
    "sellerId": 1,
    "storeName": "Fashion Hub Main Store",
    "storeAddress": "123 Fashion Street, Mumbai",
    "pincode": "400001",
    "storeCategory": ["Men", "Women"],
    "is_active": true,
    "isSellerOpen": true,
    "latitude": 19.076,
    "longitude": 72.8777,
    "openingDays": [
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday"
    ],
    "openingTime": "09:00 AM",
    "closingTime": "09:00 PM",
    "createdAt": "2026-08-29T06:30:00.000Z",
    "updatedAt": "2026-09-10T12:00:00.000Z"
  }
}
```

**Error Response (no fields provided / invalid format):**

```json
{
  "success": false,
  "status": 400,
  "message": "At least one field (openingDays, openingTime, closingTime, isSellerOpen) must be provided"
}
```

**Error Response (unauthorized / not a seller):**

```json
{
  "success": false,
  "status": 403,
  "message": "Access denied. Seller role required."
}
```

**Error Response (seller profile or store not found):**

```json
{
  "success": false,
  "status": 404,
  "message": "Store not found for this seller"
}
```


---

## 🔑 Role-Based Access

### Buyer APIs

- Cart management
- Wishlist management
- Order creation and viewing (own orders)
- Profile management

### Seller APIs

- Product CRUD (own products)
- Order management (own orders)
- Order status updates
- Seller dashboard/statistics

### Public APIs

- Product listing (with filters)
- Product details
- Category listing
- Store listing

---

## 📝 Notes

1. **Pagination**: Most list endpoints support pagination with `page` and `limit` parameters
2. **Filtering**: Product listing supports advanced filtering (category hierarchy, price range, brand, search)
3. **Multi-Seller Orders**: Orders are automatically grouped by seller when created from cart
4. **Stock Management**: Stock is automatically checked and deducted when orders are created
5. **Price Snapshotting**: Cart and orders store prices at the time of action
6. **Hierarchical Categories**: Category filtering includes all subcategories and sub-subcategories

---

## 🚀 Getting Started

1. **Generate Swagger Documentation:**

   ```bash
   npm run swagger
   ```

2. **Access Swagger UI:**

   ```
   http://localhost:3000/api-docs
   ```

3. **Seed Database:**
   ```bash
   npm run seed:all
   ```

---

## 📞 Support

For API support, refer to the Swagger documentation at `/api-docs` or contact the development team.
