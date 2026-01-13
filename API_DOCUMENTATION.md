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

---

### 2. Verify OTP (Buyer Login)
**POST** `/api/auth/verify-otp`

Verify OTP and login. Creates user if new.

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

---

### 4. Logout
**POST** `/api/auth/logout`

Revoke refresh token.

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
    "phone": "9876543210"
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
  "images": ["https://example.com/image1.jpg"],
  "tags": ["shirt", "men"],
  "categories": [1, 2],
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

---

### 4. Get Seller's Products (Seller Only)
**GET** `/api/products/seller/me`

Get paginated list of seller's own products. **Requires Authentication**

**Query Parameters:** Same as List Products

---

### 5. Update Product (Seller Only)
**PUT** `/api/products/:id`

Update product details. **Requires Authentication & Ownership**

---

### 6. Delete Product (Seller Only)
**DELETE** `/api/products/:id`

Delete a product. **Requires Authentication & Ownership**

---

## 📁 Category APIs

### 1. List Categories (Public)
**GET** `/api/categories`

Get all categories with optional filters.

**Query Parameters:**
- `level` (integer) - Filter by level (0, 1, 2)
- `parentId` (integer) - Filter by parent category

---

### 2. Get Category by ID (Public)
**GET** `/api/categories/:id`

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

---

### 3. Update Cart Item Quantity
**PUT** `/api/cart/item/:itemId`

**Request Body:**
```json
{
  "qty": 3
}
```

---

### 4. Remove Item from Cart
**DELETE** `/api/cart/item/:itemId`

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

---

### 2. Add Product to Wishlist
**POST** `/api/wishlist`

**Request Body:**
```json
{
  "productId": 1
}
```

---

### 3. Remove Product from Wishlist
**DELETE** `/api/wishlist/:productId`

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

---

### 2. List Orders
**GET** `/api/orders`

Get paginated list of orders. Returns buyer's orders or seller's orders based on role.

**Query Parameters:**
- `page` (integer, default: 1)
- `limit` (integer, default: 20)
- `status` (string) - Filter by status: `pending`, `confirmed`, `processing`, `shipped`, `delivered`, `cancelled`

---

### 3. Get Order by ID
**GET** `/api/orders/:id`

Get detailed order information with full product, buyer, and seller details.

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

---

## 👤 Profile APIs

### 1. Get Buyer Profile
**GET** `/api/profile/:id`

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

---

## 🏪 Store APIs

### 1. List Verified Stores (Public)
**GET** `/api/stores/list`

Get all verified and active seller stores.

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

---

### 2. Get User Locations
**GET** `/api/location/:userId`

---

### 3. Update Location
**PUT** `/api/location/:id`

---

### 4. Delete Location
**DELETE** `/api/location/:id`

**Request Body:**
```json
{
  "userId": 1
}
```

---

## 👨‍💼 Seller APIs

### 1. Get Seller Dashboard Statistics
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

