import swaggerAutogen from "swagger-autogen";

const doc = {
  info: {
    title: "Jiffy E-Commerce API",
    version: "1.0.0",
    description: "Complete API documentation for Jiffy E-Commerce Platform - Buyer and Seller APIs",
  },
  host: "localhost:3000",
  schemes: ["http", "https"],
  securityDefinitions: {
    bearerAuth: {
      type: "apiKey",
      name: "Authorization",
      scheme: "bearer",
      bearerFormat: "JWT",
      in: "header",
    },
  },
  tags: [
    { name: "Authentication", description: "User authentication and seller registration" },
    { name: "Products", description: "Product management APIs" },
    { name: "Categories", description: "Category management APIs" },
    { name: "Cart", description: "Shopping cart APIs" },
    { name: "Wishlist", description: "Wishlist management APIs (Buyer only)" },
    { name: "Orders", description: "Order management APIs" },
    { name: "Profile", description: "User profile management" },
    { name: "Stores", description: "Store listing APIs" },
    { name: "Location", description: "Shipping address management" },
    { name: "Seller", description: "Seller-specific APIs" },
  ],
};

const outputFile = "./src/config/swagger-output.json";
const endpointsFiles = ["./src/index.ts"]; // entry point where routes are used

swaggerAutogen()(outputFile, endpointsFiles, doc);
