import { jiffy } from "./src/config/sequelize.js";
import {
  User,
  Role,
  Product,
  ProductVariant,
  Order,
  OrderItem,
  Wallet,
  ReturnExchangeRequest,
  ReturnExchangeItem,
} from "./src/model/relations.js";
import {
  createReturnExchangeRequest,
  updateRequestStatus,
  getRequestById,
} from "./src/services/order/returnExchange.service.js";
import { getOrCreateWallet } from "./src/services/wallet/wallet.service.js";

async function runTest() {
  console.log("=== STARTING RETURN & EXCHANGE INTEGRATION TEST ===");
  await jiffy.authenticate();
  console.log("Database connected successfully.");

  // 1. Setup Test Users
  const [buyer] = await User.findOrCreate({
    where: { email: "test_buyer@jiffy.com" },
    defaults: {
      phone_number: "9999999901",
      email: "test_buyer@jiffy.com",
      status: "active",
      password: "password123",
    },
  });
  console.log(`Buyer user: ID ${buyer.id}`);

  const [seller] = await User.findOrCreate({
    where: { email: "test_seller@jiffy.com" },
    defaults: {
      phone_number: "9999999902",
      email: "test_seller@jiffy.com",
      status: "active",
      password: "password123",
    },
  });
  console.log(`Seller user: ID ${seller.id}`);

  // Ensure buyer has a wallet with starting balance
  const wallet = await getOrCreateWallet(buyer.id);
  const initialBalance = Number(wallet.balance);
  console.log(`Buyer wallet balance: ₹${initialBalance}`);

  // 2. Setup Test Product and Variant
  const [product] = await Product.findOrCreate({
    where: { name: "Test Returnable Shoes" },
    defaults: {
      name: "Test Returnable Shoes",
      description: "Comfortable running shoes for testing return flow.",
      sellerId: seller.id,
      images: JSON.stringify(["shoes.png"]),
      isActive: true,
      price: 499.00,
    },
  });
  console.log(`Product: ID ${product.id}`);

  // Clean old variant if exists or build new
  let variant = await ProductVariant.findOne({ where: { productId: product.id } });
  if (!variant) {
    variant = await ProductVariant.create({
      productId: product.id,
      size: "10",
      color: "Black",
      stock: 10,
      price: 499.00,
    });
  } else {
    // Reset stock and price for variant
    await variant.update({ stock: 10, price: 499.00 });
  }
  console.log(`Variant: ID ${variant.id}, Stock: ${variant.stock}, Price: ₹${variant.price}`);

  // Create another variant for Exchange testing
  let exchangeVariant = await ProductVariant.findOne({ where: { productId: product.id, size: "11" } });
  if (!exchangeVariant) {
    exchangeVariant = await ProductVariant.create({
      productId: product.id,
      size: "11",
      color: "Black",
      stock: 5,
      price: 499.00, // Same price
    });
  } else {
    await exchangeVariant.update({ stock: 5, price: 499.00 });
  }
  console.log(`Exchange Variant: ID ${exchangeVariant.id}, Stock: ${exchangeVariant.stock}, Price: ₹${exchangeVariant.price}`);

  // 3. Create mock delivered order within the 1-hour window
  const order = await Order.create({
    userId: buyer.id,
    sellerId: seller.id,
    total: 499.00,
    status: "Delivered",
    shippingAddress: {
      fullName: "Test Customer",
      address: "123 Test Street",
      city: "Mumbai",
      state: "MH",
      zipCode: "400001",
      phone: "9999999901",
    },
    paymentInfo: {
      method: "Wallet",
      status: "captured",
      walletAmount: 499.00,
    },
  });
  console.log(`Delivered Order created: ID ${order.id}`);

  const orderItem = await OrderItem.create({
    orderId: order.id,
    productId: product.id,
    variantId: variant.id,
    qty: 1,
    price: 499.00,
  });
  console.log(`Order Item created: ID ${orderItem.id}`);

  // Adjust order updatedAt to ensure we are within 1 hour
  await order.update({ updatedAt: new Date() });

  // 4. Test Val: Return quantity greater than purchased
  console.log("\n--- TEST: Exceeded quantity return validation ---");
  try {
    await createReturnExchangeRequest(buyer.id, {
      orderId: order.id,
      type: "RETURN",
      reason: "Size issues",
      items: [
        {
          orderItemId: orderItem.id,
          productId: product.id,
          variantId: variant.id,
          qty: 5, // Exceeds purchased quantity of 1
        },
      ],
    });
    console.error("❌ FAIL: Exceeded quantity validation did not throw error!");
  } catch (err: any) {
    console.log(`✅ SUCCESS: Expected error caught: "${err.message}"`);
  }

  // 5. Test Val: Exchange variant price mismatch
  console.log("\n--- TEST: Price-mismatch exchange variant validation ---");
  // Change exchange variant price temporarily to 599.00
  await exchangeVariant.update({ price: 599.00 });
  try {
    await createReturnExchangeRequest(buyer.id, {
      orderId: order.id,
      type: "EXCHANGE",
      reason: "Size too small",
      items: [
        {
          orderItemId: orderItem.id,
          productId: product.id,
          variantId: variant.id,
          qty: 1,
          exchangeVariantId: exchangeVariant.id,
        },
      ],
    });
    console.error("❌ FAIL: Price mismatch validation did not throw error!");
  } catch (err: any) {
    console.log(`✅ SUCCESS: Expected error caught: "${err.message}"`);
  }
  // Restore price back to 499.00
  await exchangeVariant.update({ price: 499.00 });

  // 6. Test Action: Create valid return request
  console.log("\n--- TEST: Creating valid return request ---");
  const request = await createReturnExchangeRequest(buyer.id, {
    orderId: order.id,
    type: "RETURN",
    reason: "Damaged / Defective product",
    comments: "Shoe sole was damaged.",
    images: ["damaged_shoes.png"],
    items: [
      {
        orderItemId: orderItem.id,
        productId: product.id,
        variantId: variant.id,
        qty: 1,
      },
    ],
  });

  if (request && request.status === "PENDING") {
    console.log(`✅ SUCCESS: Return request #${request.id} created successfully.`);
  } else {
    console.error("❌ FAIL: Return request creation failed or state invalid.");
  }

  // 7. Test Action: Buyer cancels the return request
  console.log("\n--- TEST: Buyer cancels return request ---");
  const cancelledRequest = await updateRequestStatus(request!.id, buyer.id, "buyer", "CANCELLED");
  if (cancelledRequest && cancelledRequest.status === "CANCELLED") {
    console.log("✅ SUCCESS: Request successfully cancelled by buyer.");
  } else {
    console.error("❌ FAIL: Request cancellation failed.");
  }

  // 8. Test Action: Submit new return request (since first was cancelled)
  console.log("\n--- TEST: Submitting new return request ---");
  const secondRequest = await createReturnExchangeRequest(buyer.id, {
    orderId: order.id,
    type: "RETURN",
    reason: "Incorrect size / Fit issues",
    comments: "Slightly tight.",
    images: ["tight_shoes.png"],
    items: [
      {
        orderItemId: orderItem.id,
        productId: product.id,
        variantId: variant.id,
        qty: 1,
      },
    ],
  });
  console.log(`✅ SUCCESS: Second request #${secondRequest!.id} created.`);

  // 9. Test Action: Approve request as seller
  console.log("\n--- TEST: Seller approves return request ---");
  const approvedReq = await updateRequestStatus(secondRequest!.id, seller.id, "seller", "APPROVED");
  if (approvedReq && approvedReq.status === "APPROVED") {
    console.log("✅ SUCCESS: Request approved by seller.");
  } else {
    console.error("❌ FAIL: Seller approval failed.");
  }

  // 10. Test Action: Complete request as seller
  console.log("\n--- TEST: Seller completes return request (triggers refund & stock return) ---");
  
  // Note the variant stock before completion
  const beforeStock = (await ProductVariant.findByPk(variant.id))!.stock;
  
  const completedReq = await updateRequestStatus(secondRequest!.id, seller.id, "seller", "COMPLETED");
  
  const afterStock = (await ProductVariant.findByPk(variant.id))!.stock;
  const finalWallet = await Wallet.findOne({ where: { userId: buyer.id } });
  const finalBalance = Number(finalWallet!.balance);
  const updatedOrder = await Order.findByPk(order.id);

  if (
    completedReq &&
    completedReq.status === "COMPLETED" &&
    afterStock === beforeStock + 1 &&
    finalBalance === initialBalance + 499.00 &&
    updatedOrder!.status === "Refund Successful"
  ) {
    console.log("✅ SUCCESS: Request status is COMPLETED.");
    console.log(`✅ SUCCESS: Variant stock incremented from ${beforeStock} to ${afterStock}.`);
    console.log(`✅ SUCCESS: Wallet credited ₹499.00. Previous: ₹${initialBalance}, New: ₹${finalBalance}.`);
    console.log(`✅ SUCCESS: Order status updated to "${updatedOrder!.status}".`);
  } else {
    console.error("❌ FAIL: Request completion logic did not process correctly!");
    console.log(`Request Status: ${completedReq?.status}`);
    console.log(`Stock before: ${beforeStock}, after: ${afterStock}`);
    console.log(`Wallet balance before: ${initialBalance}, after: ${finalBalance}`);
    console.log(`Order status: ${updatedOrder?.status}`);
  }

  console.log("\n=== RETURN & EXCHANGE INTEGRATION TEST COMPLETED ===");
  process.exit(0);
}

runTest().catch((err) => {
  console.error("Test execution threw error:", err);
  process.exit(1);
});
