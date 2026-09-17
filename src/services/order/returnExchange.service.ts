import { jiffy } from "../../config/sequelize.js";
import {
  ReturnExchangeRequest,
  ReturnExchangeAttributes,
  ReturnExchangeItem,
  Order,
  OrderItem,
  Product,
  ProductVariant,
  User,
  SellerProfile,
  BuyerProfile,
  Store,
  Location,
} from "../../model/relations.js";
import { Op, Transaction } from "sequelize";
import crypto from "crypto";
import { creditWallet } from "../wallet/wallet.service.js";
import { createAndSendNotification } from "../notification/notification.service.js";
import { getIO, emitToUser } from "../socket/socket.service.js";

/**
 * Helper to enrich Return & Exchange Request with comprehensive buyer/seller pickup IDs, locations with lat/lng, packageDetails, names and contacts
 */
export const enrichReturnExchangeDetails = async (request: any) => {
  if (!request) return null;
  const reqJson = typeof request.toJSON === "function" ? request.toJSON() : { ...request };

  const order = reqJson.order;
  const buyer = reqJson.buyer || order?.buyer;
  const seller = reqJson.seller || order?.seller;
  const sellerId = reqJson.sellerId || order?.sellerId;
  const userId = reqJson.userId || order?.userId;

  // 1. Seller Profile, Store, & Location
  let sellerProfile = seller?.SellerProfile || order?.seller?.SellerProfile;
  if (!sellerProfile || !sellerProfile.id) {
    if (sellerId) {
      sellerProfile = await SellerProfile.findOne({
        where: {
          [Op.or]: [{ userId: sellerId }, { id: sellerId }],
        },
        include: [{ model: Store, required: false }],
      });
    }
  }

  const sellerProfileId = sellerProfile?.id;
  const sellerUserId = sellerProfile?.userId || sellerId;

  let store: any =
    (sellerProfile as any)?.Store ||
    (sellerProfile as any)?.Stores?.[0] ||
    null;

  if (!store && (sellerProfileId || sellerUserId)) {
    store = await Store.findOne({
      where: {
        [Op.or]: [
          ...(sellerProfileId ? [{ sellerId: sellerProfileId }] : []),
          ...(sellerUserId ? [{ sellerId: sellerUserId }] : []),
        ],
      },
      order: [["createdAt", "DESC"]],
    });
  }

  let sellerLocationDb: any = null;
  if (sellerProfileId || sellerUserId) {
    sellerLocationDb = await Location.findOne({
      where: {
        [Op.or]: [
          ...(sellerProfileId ? [{ sellerId: sellerProfileId }] : []),
          ...(sellerUserId ? [{ userId: sellerUserId }] : []),
        ],
      },
      order: [["createdAt", "DESC"]],
    });
  }

  // Seller pickup address ID
  const sellerPickUpId =
    sellerProfile?.pickup_address_id ? Number(sellerProfile.pickup_address_id) :
    store?.pickup_address_id ? Number(store.pickup_address_id) :
    sellerLocationDb?.id ? Number(sellerLocationDb.id) :
    null;

  // Seller Contact & Name
  const sellerName =
    sellerProfile?.businessName ||
    store?.storeName ||
    seller?.name ||
    "Seller";

  const sellerContactNumber =
    sellerProfile?.phone ||
    seller?.phone_number ||
    store?.phone ||
    "";

  // Seller Location & Coordinates
  const sellerAddress =
    store?.storeAddress ||
    sellerLocationDb?.addressLine1 ||
    sellerProfile?.address ||
    "";

  const sellerCity =
    sellerLocationDb?.city ||
    sellerProfile?.city ||
    "";

  const sellerState =
    sellerLocationDb?.state ||
    sellerProfile?.state ||
    "";

  const sellerPincode =
    store?.pincode ||
    sellerLocationDb?.pincode ||
    sellerProfile?.zipCode ||
    "";

  let sellerLat = 0;
  let sellerLng = 0;

  if (store?.latitude !== undefined && store?.latitude !== null && !isNaN(Number(store.latitude))) {
    sellerLat = Number(store.latitude);
  } else if (sellerLocationDb?.latitude !== undefined && sellerLocationDb?.latitude !== null && !isNaN(Number(sellerLocationDb.latitude))) {
    sellerLat = Number(sellerLocationDb.latitude);
  }

  if (store?.longitude !== undefined && store?.longitude !== null && !isNaN(Number(store.longitude))) {
    sellerLng = Number(store.longitude);
  } else if (sellerLocationDb?.longitude !== undefined && sellerLocationDb?.longitude !== null && !isNaN(Number(sellerLocationDb.longitude))) {
    sellerLng = Number(sellerLocationDb.longitude);
  }

  const sellerLocation = {
    address: sellerAddress,
    addressLine1: sellerAddress,
    city: sellerCity,
    state: sellerState,
    pincode: sellerPincode,
    country: sellerLocationDb?.country || "India",
    lat: sellerLat,
    lng: sellerLng,
  };

  // 2. Buyer Profile & Shipping Address & Location
  let shippingAddr = order?.shippingAddress;
  if (typeof shippingAddr === "string") {
    try {
      shippingAddr = JSON.parse(shippingAddr);
    } catch {
      shippingAddr = {};
    }
  }

  const buyerProfile = buyer?.BuyerProfile;

  let buyerLocationDb: any = null;
  const addressId = shippingAddr?.id || shippingAddr?.locationId || shippingAddr?.addressId;
  if (addressId) {
    buyerLocationDb = await Location.findByPk(addressId);
  }
  if (!buyerLocationDb && userId) {
    buyerLocationDb =
      (await Location.findOne({
        where: { userId, isDefault: true },
      })) ||
      (await Location.findOne({
        where: { userId },
        order: [["createdAt", "DESC"]],
      }));
  }

  const dropAddress =
    shippingAddr?.address ||
    shippingAddr?.addressLine1 ||
    [
      shippingAddr?.addressLine1,
      shippingAddr?.addressLine2,
      shippingAddr?.city,
      shippingAddr?.state,
      shippingAddr?.pincode || shippingAddr?.zipCode,
    ]
      .filter(Boolean)
      .join(", ") ||
    buyerLocationDb?.addressLine1 ||
    buyerProfile?.address ||
    "";

  const buyerName =
    shippingAddr?.fullName ||
    shippingAddr?.name ||
    shippingAddr?.dropContactName ||
    buyerProfile?.fullName ||
    buyer?.name ||
    "Customer";

  const buyerContactNumber =
    shippingAddr?.phone ||
    shippingAddr?.phone_number ||
    shippingAddr?.mobile ||
    shippingAddr?.dropContactNumber ||
    buyerProfile?.phone ||
    buyer?.phone_number ||
    "";

  let rawBuyerLat =
    shippingAddr?.lat ??
    shippingAddr?.latitude ??
    shippingAddr?.dropCoords?.lat ??
    shippingAddr?.dropCoords?.latitude ??
    shippingAddr?.coords?.lat ??
    shippingAddr?.coords?.latitude ??
    shippingAddr?.coordinates?.lat ??
    shippingAddr?.coordinates?.latitude ??
    (Array.isArray(shippingAddr?.coordinates) ? shippingAddr.coordinates[1] : undefined) ??
    shippingAddr?.location?.lat ??
    shippingAddr?.location?.latitude ??
    null;

  let rawBuyerLng =
    shippingAddr?.lng ??
    shippingAddr?.longitude ??
    shippingAddr?.dropCoords?.lng ??
    shippingAddr?.dropCoords?.longitude ??
    shippingAddr?.coords?.lng ??
    shippingAddr?.coords?.longitude ??
    shippingAddr?.coordinates?.lng ??
    shippingAddr?.coordinates?.longitude ??
    (Array.isArray(shippingAddr?.coordinates) ? shippingAddr.coordinates[0] : undefined) ??
    shippingAddr?.location?.lng ??
    shippingAddr?.location?.longitude ??
    null;

  let buyerLat = rawBuyerLat !== null && rawBuyerLat !== undefined && !isNaN(Number(rawBuyerLat)) ? Number(rawBuyerLat) : 0;
  let buyerLng = rawBuyerLng !== null && rawBuyerLng !== undefined && !isNaN(Number(rawBuyerLng)) ? Number(rawBuyerLng) : 0;

  if (buyerLat === 0 && buyerLng === 0 && buyerLocationDb) {
    if (buyerLocationDb.latitude && !isNaN(Number(buyerLocationDb.latitude))) {
      buyerLat = Number(buyerLocationDb.latitude);
    }
    if (buyerLocationDb.longitude && !isNaN(Number(buyerLocationDb.longitude))) {
      buyerLng = Number(buyerLocationDb.longitude);
    }
  }

  // Buyer Pickup Address ID
  const buyerPickupAddressId =
    order?.buyerPickupAddressId ? (isNaN(Number(order.buyerPickupAddressId)) ? order.buyerPickupAddressId : Number(order.buyerPickupAddressId)) :
    shippingAddr?.buyerPickupAddressId ? (isNaN(Number(shippingAddr.buyerPickupAddressId)) ? shippingAddr.buyerPickupAddressId : Number(shippingAddr.buyerPickupAddressId)) :
    shippingAddr?.buyer_pickup_address_id ? (isNaN(Number(shippingAddr.buyer_pickup_address_id)) ? shippingAddr.buyer_pickup_address_id : Number(shippingAddr.buyer_pickup_address_id)) :
    buyerLocationDb?.buyerPickupAddressId ? (isNaN(Number(buyerLocationDb.buyerPickupAddressId)) ? buyerLocationDb.buyerPickupAddressId : Number(buyerLocationDb.buyerPickupAddressId)) :
    null;

  const buyerLocation = {
    address: dropAddress,
    addressLine1: shippingAddr?.addressLine1 || shippingAddr?.address || buyerLocationDb?.addressLine1 || buyerProfile?.address || "",
    addressLine2: shippingAddr?.addressLine2 || buyerLocationDb?.addressLine2 || "",
    city: shippingAddr?.city || shippingAddr?.city_name || buyerLocationDb?.city || buyerProfile?.city || "",
    state: shippingAddr?.state || shippingAddr?.state_name || buyerLocationDb?.state || buyerProfile?.state || "",
    pincode: String(shippingAddr?.pincode || shippingAddr?.zipCode || buyerLocationDb?.pincode || buyerProfile?.zipCode || ""),
    country: shippingAddr?.country || buyerLocationDb?.country || "India",
    lat: buyerLat,
    lng: buyerLng,
  };

  // 3. Package Details Calculation
  const items = (order?.items && order.items.length > 0) ? order.items : (reqJson.items || []);
  let totalWeight = 0;
  let maxLength = 0;
  let maxWidth = 0;
  let maxHeight = 0;

  for (const it of items) {
    const v = (it as any).variant || (it as any).originalVariant || (it as any).exchangeVariant;
    const qty = Number((it as any).qty || 1);
    totalWeight += Number(v?.weight || 0.5) * qty;
    maxLength = Math.max(maxLength, Number(v?.length || 10));
    maxWidth = Math.max(maxWidth, Number(v?.width || 5));
    maxHeight += Number(v?.height || 5) * qty;
  }

  const packageDetails = {
    length: Number(maxLength.toFixed(2)) || 10,
    width: Number(maxWidth.toFixed(2)) || 5,
    height: Number(maxHeight.toFixed(2)) || 6,
    weight: Number(totalWeight.toFixed(2)) || 2,
  };

  return {
    ...reqJson,
    buyerPickupAddressId,
    sellerPickUpId,
    buyerLocation,
    sellerLocation,
    packageDetails,
    buyerName,
    buyerContactNumber,
    sellerName,
    sellerContactNumber,
  };
};

/**
 * Create a new Return or Exchange request (Buyer only)
 */
export const createReturnExchangeRequest = async (
  userId: number,
  payload: any
) => {
  const { orderId, type, reason, comments, images, items } = payload;

  if (!orderId || !type || !reason || !items || !items.length) {
    throw new Error("Missing required fields: orderId, type, reason, or items.");
  }

  if (type !== "RETURN" && type !== "EXCHANGE") {
    throw new Error("Invalid request type. Allowed: RETURN, EXCHANGE");
  }

  const t = await jiffy.transaction();

  try {
    // 1. Fetch Order and check status
    const order = await Order.findByPk(orderId, { transaction: t });
    if (!order) {
      throw new Error("Order not found");
    }

    if (order.userId != userId) {
      throw new Error("You do not have permission to return items from this order.");
    }

    if (order.status !== "Delivered") {
      throw new Error("Only delivered orders are eligible for return or exchange.");
    }

    // 2. Validate 1-Hour Eligibility Window
    const deliveryTime = new Date(order.updatedAt).getTime();
    const now = Date.now();
    const oneHourMs = 60 * 60 * 1000;
    if (now - deliveryTime > oneHourMs) {
      throw new Error("Return/Exchange requests can only be made within 1 hour of delivery.");
    }

    // 3. Fetch existing requests to prevent duplicate quantity returns
    const existingRequests = await ReturnExchangeRequest.findAll({
      where: {
        orderId: order.id,
        status: { [Op.ne]: "CANCELLED" },
      },
      include: [{ association: "items" }],
      transaction: t,
    });

    const returnedQtyMap: Record<number, number> = {};
    for (const req of existingRequests) {
      const reqItems = (req as any).items || [];
      for (const item of reqItems) {
        returnedQtyMap[item.orderItemId] = (returnedQtyMap[item.orderItemId] || 0) + item.qty;
      }
    }

    // 4. Validate request items
    const verifiedItems: any[] = [];
    for (const reqItem of items) {
      const { orderItemId, productId, variantId, qty, exchangeVariantId } = reqItem;

      if (!orderItemId || !productId || !variantId || !qty || qty <= 0) {
        throw new Error("Invalid item format in request payload.");
      }

      // Fetch corresponding order item
      const orderItem = await OrderItem.findOne({
        where: { id: orderItemId, orderId: order.id },
        transaction: t,
      });

      if (!orderItem) {
        throw new Error(`Order item #${orderItemId} does not exist in order #${order.id}.`);
      }

      if (orderItem.productId !== productId || orderItem.variantId !== variantId) {
        throw new Error(`Item specifications for order item #${orderItemId} do not match the database.`);
      }

      // Check product-level return / exchange eligibility
      const product = await Product.findByPk(productId, { transaction: t });
      if (product) {
        if (type === "RETURN" && (product.isReturnable === false || (product as any).is_returnable === false)) {
          throw new Error(`Product "${product.name}" is not eligible for return.`);
        }
        if (type === "EXCHANGE" && (product.isExchangeable === false || (product as any).is_exchangeable === false)) {
          throw new Error(`Product "${product.name}" is not eligible for exchange.`);
        }
      }

      // Check remaining returnable quantity
      const alreadyReturned = returnedQtyMap[orderItemId] || 0;
      if (alreadyReturned + qty > orderItem.qty) {
        throw new Error(
          `Requested quantity (${qty}) for item #${orderItemId} exceeds the eligible remaining quantity (${orderItem.qty - alreadyReturned}).`
        );
      }

      // Validate exchange variant constraints if EXCHANGE
      let verifiedExchangeVariantId = null;
      if (type === "EXCHANGE") {
        if (!exchangeVariantId) {
          throw new Error(`Exchange variant is required for exchanging order item #${orderItemId}.`);
        }

        const exchangeVariant = await ProductVariant.findByPk(exchangeVariantId, { transaction: t });
        if (!exchangeVariant) {
          throw new Error(`Exchange variant #${exchangeVariantId} not found.`);
        }

        if (exchangeVariant.productId !== productId) {
          throw new Error("Exchange variant must belong to the same product.");
        }

        if (exchangeVariant.stock < qty) {
          throw new Error(`Insufficient stock for requested exchange variant #${exchangeVariantId}.`);
        }

        // Compare price snapshot from order item (which is what buyer paid) with original variant price
        const originalVariant = await ProductVariant.findByPk(variantId, { transaction: t });
        if (!originalVariant) {
          throw new Error(`Original variant #${variantId} not found.`);
        }

        if (Number(exchangeVariant.price) !== Number(originalVariant.price)) {
          throw new Error(
            `Exchange variant price (₹${exchangeVariant.price}) must match original variant price (₹${originalVariant.price}).`
          );
        }

        verifiedExchangeVariantId = exchangeVariantId;
      }

      verifiedItems.push({
        orderItemId,
        productId,
        variantId,
        qty,
        price: orderItem.price,
        exchangeVariantId: verifiedExchangeVariantId,
      });
    }

    // 5. Create Request record
    const request = await ReturnExchangeRequest.create(
      {
        orderId: order.id,
        userId,
        sellerId: order.sellerId,
        type,
        status: "PENDING",
        reason,
        comments,
        images: images || [],
      },
      { transaction: t }
    );

    // 6. Create request items
    for (const item of verifiedItems) {
      await ReturnExchangeItem.create(
        {
          requestId: request.id,
          orderItemId: item.orderItemId,
          productId: item.productId,
          variantId: item.variantId,
          qty: item.qty,
          price: item.price,
          exchangeVariantId: item.exchangeVariantId,
        },
        { transaction: t }
      );
    }

    // 7. Update overall Order status to initial return/exchange status
    const initialOrderStatus = type === "RETURN" ? "Return Requested" : "Exchange Requested";
    for (const item of verifiedItems) {
      await OrderItem.update(
        { status: initialOrderStatus },
        { where: { id: item.orderItemId }, transaction: t }
      );
    }

    await t.commit();

    // Send push / DB notification to the seller
    createAndSendNotification(
      order.sellerId,
      `New ${type} Request`,
      `A new return/exchange request #${request.id} has been submitted for order #${order.id}.`,
      "new_return_exchange",
      request.id,
      "seller"
    ).catch((err) => {
      console.error(`Failed to send notification to seller #${order.sellerId} for request #${request.id}:`, err);
    });

    // Reload with items and order
    const createdReq = await ReturnExchangeRequest.findByPk(request.id, {
      include: [
        { association: "items", include: [{ association: "originalVariant" }, { association: "exchangeVariant" }, { association: "product" }] },
        {
          association: "order",
          include: [
            { association: "items", include: [{ association: "variant" }, { association: "product" }] },
            { association: "buyer", include: [{ model: BuyerProfile, required: false }] },
            { association: "seller", include: [{ model: SellerProfile, required: false }] },
          ],
        },
        { association: "buyer", include: [{ model: BuyerProfile, required: false }] },
        { association: "seller", include: [{ model: SellerProfile, required: false }] },
      ],
    });

    const enriched = await enrichReturnExchangeDetails(createdReq);

    // Build rich real-time popup payload for the Seller App
    const popupPayload = {
      popupType: "RETURN_EXCHANGE_POPUP",
      event: "new_return_exchange",
      title: `New ${type === "RETURN" ? "Return" : "Exchange"} Request #${request.id}`,
      message: `Buyer requested ${type.toLowerCase()} for Order #${order.id}. Please review and accept.`,
      requestId: request.id,
      orderId: order.id,
      type: request.type,
      status: request.status,
      reason: request.reason,
      comments: request.comments || "",
      images: request.images || [],
      buyer: {
        id: request.userId,
        name: enriched?.buyerName || "Customer",
        phone: enriched?.buyerContactNumber || "",
        location: enriched?.buyerLocation,
      },
      seller: {
        id: request.sellerId,
        name: enriched?.sellerName || "Seller",
        phone: enriched?.sellerContactNumber || "",
        location: enriched?.sellerLocation,
      },
      items: enriched?.items || [],
      packageDetails: enriched?.packageDetails,
      actions: {
        accept: {
          method: "PATCH",
          endpoint: `/api/return-exchange/${request.id}/status`,
          body: { status: "APPROVED" },
        },
        reject: {
          method: "PATCH",
          endpoint: `/api/return-exchange/${request.id}/status`,
          body: { status: "REJECTED" },
        },
        webhookAccept: {
          method: "POST",
          endpoint: `/api/return-exchange/webhook/action`,
          body: { requestId: request.id, action: "ACCEPT" },
        },
      },
      details: enriched,
    };

    // 1. Emit real-time popup to Seller so their app opens the accept popup immediately
    emitToUser(order.sellerId, "new_return_exchange", popupPayload);
    emitToUser(order.sellerId, "return_request_popup", popupPayload);
    emitToUser(order.sellerId, "new_return_exchange_request", popupPayload);

    // 2. Emit confirmation to Buyer
    emitToUser(userId, "return_exchange_created", {
      requestId: request.id,
      orderId: order.id,
      type: request.type,
      status: request.status,
      message: `Your ${type.toLowerCase()} request has been submitted. Waiting for seller acceptance.`,
      details: enriched,
    });

    // 3. Dispatch to seller's external webhook URL if registered
    dispatchSellerWebhook(order.sellerId, "return_exchange.requested", popupPayload).catch((e) =>
      console.error("[Seller Webhook Dispatch Error]", e)
    );

    return enriched;
  } catch (err) {
    await t.rollback();
    throw err;
  }
};


/**
 * Get paginated list of Return & Exchange requests
 */
export const listRequests = async (userId: number, role: string, opts: any) => {
  const { page = 1, limit = 20, status, type } = opts;
  const where: any = {};

  if (role === "buyer") {
    where.userId = userId;
  } else if (role === "seller") {
    where.sellerId = userId;
  }

  if (status) {
    where.status = status;
  }

  if (type) {
    where.type = type;
  }

  // 1. Get count and paginated IDs first to avoid ER_OUT_OF_SORTMEMORY with large JOINs
  const { count, rows: idRows } = await ReturnExchangeRequest.findAndCountAll({
    where,
    attributes: ["id"],
    limit: parseInt(limit),
    offset: (parseInt(page) - 1) * parseInt(limit),
    order: [["createdAt", "DESC"]],
  });

  const ids = idRows.map((row) => row.id);

  let fullRows: any[] = [];
  if (ids.length > 0) {
    // 2. Fetch full relations for those specific IDs
    fullRows = await ReturnExchangeRequest.findAll({
      where: { id: { [Op.in]: ids } },
      include: [
        {
          association: "items",
          include: [
            { association: "originalVariant", attributes: ["size", "color", "price", "weight", "length", "width", "height"] },
            { association: "exchangeVariant", attributes: ["size", "color", "price", "weight", "length", "width", "height"] },
            { association: "product" },
          ],
        },
        {
          association: "order",
          attributes: ["id", "total", "status", "buyerPickupAddressId", "shippingAddress", "sellerId", "userId", "createdAt"],
          include: [
            {
              association: "items",
              include: [{ association: "variant" }, { association: "product" }],
            },
            {
              association: "buyer",
              attributes: ["id", "phone_number", "email"],
              include: [
                {
                  model: BuyerProfile,
                  required: false,
                },
              ],
            },
            {
              association: "seller",
              attributes: ["id", "phone_number", "email"],
              include: [
                {
                  model: SellerProfile,
                  required: false,
                  include: [{ model: Store, required: false }],
                },
              ],
            },
          ],
        },
        {
          association: "buyer",
          attributes: ["id", "phone_number", "email"],
          include: [
            {
              model: BuyerProfile,
              required: false,
            },
          ],
        },
        {
          association: "seller",
          attributes: ["id", "phone_number", "email"],
          include: [
            {
              model: SellerProfile,
              required: false,
              include: [{ model: Store, required: false }],
            },
          ],
        },
      ],
    });

    // Sort the joined results in JavaScript to avoid MySQL sort_buffer exhaustion
    fullRows.sort((a, b) => {
      return ids.indexOf(a.id) - ids.indexOf(b.id);
    });
  }

  const enrichedItems = await Promise.all(fullRows.map(enrichReturnExchangeDetails));

  return {
    items: enrichedItems,
    total: count,
    page: parseInt(page),
    limit: parseInt(limit),
    totalPages: Math.ceil(count / parseInt(limit)),
  };
};

/**
 * Get detailed Return/Exchange Request by ID
 */
export const getRequestById = async (
  requestId: number,
  userId: number,
  role: string
) => {
  const request = await ReturnExchangeRequest.findByPk(requestId, {
    include: [
      {
        association: "items",
        include: [
          {
            association: "originalVariant",
            include: [{ association: "product" }],
          },
          {
            association: "exchangeVariant",
            include: [{ association: "product" }],
          },
          {
            association: "product",
          },
        ],
      },
      {
        association: "order",
        include: [
          {
            association: "items",
            include: [
              { association: "variant" },
              { association: "product" },
            ],
          },
          {
            association: "buyer",
            attributes: ["id", "phone_number", "email"],
            include: [
              {
                model: BuyerProfile,
                required: false,
              },
            ],
          },
          {
            association: "seller",
            attributes: ["id", "phone_number", "email"],
            include: [
              {
                model: SellerProfile,
                required: false,
                include: [{ model: Store, required: false }],
              },
            ],
          },
        ],
      },
      {
        association: "buyer",
        attributes: ["id", "phone_number", "email"],
        include: [
          {
            model: BuyerProfile,
            required: false,
          },
        ],
      },
      {
        association: "seller",
        attributes: ["id", "phone_number", "email"],
        include: [
          {
            model: SellerProfile,
            required: false,
            include: [{ model: Store, required: false }],
          },
        ],
      },
    ],
  });

  if (!request) return null;

  if (role === "buyer" && request.userId != userId) {
    throw new Error("You do not have permission to view this request.");
  }
  if (role === "seller" && request.sellerId != userId) {
    throw new Error("You do not have permission to view this request.");
  }

  return await enrichReturnExchangeDetails(request);
};


/**
 * Update request status (Approvals by Seller/Admin, Cancel by Buyer)
 */
export const updateRequestStatus = async (
  requestId: number,
  userId: number,
  role: string,
  newStatus: string
) => {
  const allowedStatuses = ["PENDING", "APPROVED", "REJECTED", "COMPLETED", "CANCELLED"];
  if (!allowedStatuses.includes(newStatus)) {
    throw new Error(`Invalid request status. Allowed: ${allowedStatuses.join(", ")}`);
  }

  const request = await ReturnExchangeRequest.findByPk(requestId, {
    include: [{ association: "items" }],
  });
  if (!request) {
    throw new Error("Return/Exchange request not found.");
  }

  // Authorization checks
  if (role === "buyer") {
    if (request.userId != userId) {
      throw new Error("You do not have permission to modify this request.");
    }
    if (newStatus !== "CANCELLED") {
      throw new Error("Buyers can only cancel their return/exchange requests.");
    }
  } else if (role === "seller") {
    if (request.sellerId != userId) {
      throw new Error("You do not have permission to update this request.");
    }
  }

  const t = await jiffy.transaction();

  try {
    // Lock the request row to prevent race conditions during status update
    const lockedRequest = await ReturnExchangeRequest.findByPk(requestId, {
      include: [{ association: "items" }],
      transaction: t,
      lock: t.LOCK.UPDATE,
    });

    if (!lockedRequest) {
      throw new Error("Return/Exchange request not found.");
    }

    const prevStatus = lockedRequest.status;

    // Transition logical validation
    if (newStatus === "CANCELLED" && prevStatus !== "PENDING" && prevStatus !== "APPROVED") {
      throw new Error(`Cannot cancel a request in ${prevStatus} state.`);
    }
    if (newStatus === "APPROVED" && prevStatus !== "PENDING") {
      throw new Error(`Cannot approve a request in ${prevStatus} state.`);
    }
    if (newStatus === "REJECTED" && prevStatus !== "PENDING") {
      throw new Error(`Cannot reject a request in ${prevStatus} state.`);
    }
    if (newStatus === "COMPLETED" && prevStatus !== "APPROVED") {
      throw new Error(`Cannot mark a request as completed without approval first.`);
    }

    // Update status in the database
    await lockedRequest.update({ status: newStatus as any }, { transaction: t });

    // Sync order status for accepted / rejected / cancelled states
    if (newStatus === "APPROVED") {
      const itemStatus = lockedRequest.type === "RETURN" ? "Return Accepted" : "Exchange Accepted";
      const exchangeItems = (lockedRequest as any).items || [];
      for (const item of exchangeItems) {
        await OrderItem.update(
          { status: itemStatus },
          { where: { id: item.orderItemId }, transaction: t }
        );
      }

      if (lockedRequest.type === "EXCHANGE") {
        const originalOrder = await Order.findByPk(lockedRequest.orderId, { transaction: t });
        if (!originalOrder) {
          throw new Error("Original order not found.");
        }

        const exchangeItems = (lockedRequest as any).items || [];

        let exchangeTotal = 0;

        for (const item of exchangeItems) {
          // Decrement stock of the exchange variant
          const variant = await ProductVariant.findByPk(item.exchangeVariantId, { transaction: t });
          if (!variant) {
            throw new Error(`Exchange variant #${item.exchangeVariantId} not found.`);
          }
          if (variant.stock < item.qty) {
            throw new Error(`Insufficient stock for exchange variant #${item.exchangeVariantId}.`);
          }
          await variant.update({ stock: variant.stock - item.qty }, { transaction: t });
          
          exchangeTotal += (item.price * item.qty);
        }

        const newExchangeOrder = await Order.create({
          userId: lockedRequest.userId,
          sellerId: lockedRequest.sellerId,
          total: exchangeTotal,
          status: "Confirmed",
          shippingAddress: originalOrder.shippingAddress,
          paymentInfo: originalOrder.paymentInfo || {
            method: "Exchange",
            status: "captured",
            originalOrderId: lockedRequest.orderId,
            exchangeRequestId: lockedRequest.id,
          },
        }, { transaction: t });

        for (const item of exchangeItems) {
          await OrderItem.create({
            orderId: newExchangeOrder.id,
            productId: item.productId,
            variantId: item.exchangeVariantId,
            qty: item.qty,
            price: item.price,
            isReplacement: true, // Mark this as a replacement to prevent recursive exchanges
            status: 'Delivered', // Skip fulfillment for replacement? Or 'Created' depending on logic
          } as any, { transaction: t });
        }

        // Send push notification for new exchange order
        createAndSendNotification(
          lockedRequest.userId,
          "Exchange Order Created",
          `A new order #${newExchangeOrder.id} has been created for your exchange request #${lockedRequest.id}.`,
          "exchange_order_created",
          newExchangeOrder.id,
          "buyer"
        ).catch((err) => {
          console.error(`Failed to send exchange order creation notification to buyer #${lockedRequest.userId}:`, err);
        });
      }
    } else if (newStatus === "REJECTED") {
      const itemStatus = lockedRequest.type === "RETURN" ? "Return Rejected" : "Exchange Rejected";
      const exchangeItems = (lockedRequest as any).items || [];
      for (const item of exchangeItems) {
        await OrderItem.update(
          { status: itemStatus },
          { where: { id: item.orderItemId }, transaction: t }
        );
      }
    } else if (newStatus === "CANCELLED") {
      // Restore overall order item status to null/empty if cancelled
      const exchangeItems = (lockedRequest as any).items || [];
      for (const item of exchangeItems) {
        await OrderItem.update(
          { status: "" },
          { where: { id: item.orderItemId }, transaction: t }
        );
      }
    }

    // Trigger business processes on completion
    if (newStatus === "COMPLETED") {
      const items = (lockedRequest as any).items || [];

      if (lockedRequest.type === "RETURN") {
        let totalRefund = 0;
        for (const item of items) {
          totalRefund += item.price * item.qty;

          // Increment inventory back for returned variants
          const variant = await ProductVariant.findByPk(item.variantId, { transaction: t });
          if (variant) {
            await variant.update({ stock: variant.stock + item.qty }, { transaction: t });
          }
        }

        // Credit to wallet
        await creditWallet(
          {
            userId: lockedRequest.userId,
            amount: totalRefund,
            referenceId: `return_${lockedRequest.id}`,
            referenceType: "ORDER",
            category: "REFUND",
            description: `Refund for Return Request #${lockedRequest.id} on Order #${lockedRequest.orderId}`,
          },
          t
        );

        for (const item of items) {
          await OrderItem.update(
            { status: "Refund Successful" },
            { where: { id: item.orderItemId }, transaction: t }
          );
        }
      } else if (lockedRequest.type === "EXCHANGE") {
        for (const item of items) {
          await OrderItem.update(
            { status: "Exchange Processed" },
            { where: { id: item.orderItemId }, transaction: t }
          );
        }
        
        // Ensure the parent order status returns to Delivered after partial exchanges
        await Order.update(
          { status: "Delivered" },
          { where: { id: lockedRequest.orderId }, transaction: t }
        );
      }
    }

    await t.commit();

    // Send push / DB notification to the buyer on status change
    createAndSendNotification(
      request.userId,
      "Return/Exchange Status Updated",
      `Your request #${request.id} status has been updated to ${newStatus}.`,
      "return_exchange_status_update",
      request.id,
      "buyer"
    ).catch((err) => {
      console.error(`Failed to send status update notification to buyer #${request.userId}:`, err);
    });

    const updatedReq = await ReturnExchangeRequest.findByPk(requestId, {
      include: [
        { association: "items", include: [{ association: "originalVariant" }, { association: "exchangeVariant" }, { association: "product" }] },
        {
          association: "order",
          include: [
            { association: "items", include: [{ association: "variant" }, { association: "product" }] },
            { association: "buyer", include: [{ model: BuyerProfile, required: false }] },
            { association: "seller", include: [{ model: SellerProfile, required: false }] },
          ],
        },
        { association: "buyer", include: [{ model: BuyerProfile, required: false }] },
        { association: "seller", include: [{ model: SellerProfile, required: false }] },
      ],
    });

    return await enrichReturnExchangeDetails(updatedReq);
  } catch (err) {
    await t.rollback();
    throw err;
  }
};

/**
 * Fetch a fully populated and enriched Return/Exchange request with all details
 */
export const getFullReturnExchangeById = async (requestId: number) => {
  const request = await ReturnExchangeRequest.findByPk(requestId, {
    include: [
      {
        association: "items",
        include: [
          { association: "originalVariant", include: [{ association: "product" }] },
          { association: "exchangeVariant", include: [{ association: "product" }] },
          { association: "product" },
        ],
      },
      {
        association: "order",
        include: [
          {
            association: "items",
            include: [{ association: "variant" }, { association: "product" }],
          },
          {
            association: "buyer",
            attributes: ["id", "phone_number", "email"],
            include: [{ model: BuyerProfile, required: false }],
          },
          {
            association: "seller",
            attributes: ["id", "phone_number", "email"],
            include: [
              {
                model: SellerProfile,
                required: false,
                include: [{ model: Store, required: false }],
              },
            ],
          },
        ],
      },
      {
        association: "buyer",
        attributes: ["id", "phone_number", "email"],
        include: [{ model: BuyerProfile, required: false }],
      },
      {
        association: "seller",
        attributes: ["id", "phone_number", "email"],
        include: [
          {
            model: SellerProfile,
            required: false,
            include: [{ model: Store, required: false }],
          },
        ],
      },
    ],
  });

  if (!request) return null;
  return await enrichReturnExchangeDetails(request);
};

/**
 * Update Return / Exchange booking and tracking details
 */
export const updateReturnExchangeTrackingDetails = async (
  requestId: number,
  userId: number,
  trackingData: { booking_order_id?: string; public_tracking_id?: string },
  isAdmin: boolean = false
) => {
  const request = await ReturnExchangeRequest.findByPk(requestId);
  if (!request) {
    throw new Error("Return/Exchange request not found.");
  }

  if (!isAdmin && request.userId != userId && request.sellerId != userId) {
    throw new Error("You do not have permission to update tracking details for this request.");
  }

  const updates: Partial<ReturnExchangeAttributes> = {};
  if (trackingData.booking_order_id !== undefined && trackingData.booking_order_id !== null) {
    updates.booking_order_id = String(trackingData.booking_order_id).trim();
  }
  if (trackingData.public_tracking_id !== undefined && trackingData.public_tracking_id !== null) {
    updates.public_tracking_id = String(trackingData.public_tracking_id).trim();
  }

  if (Object.keys(updates).length > 0) {
    await request.update(updates);
  }

  return await getFullReturnExchangeById(requestId);
};

/**
 * Process incoming Return / Exchange status webhook from Delivar / Logistics
 * Returns all enriched details of the return or exchange order
 */
export const processReturnExchangeWebhook = async (payload: {
  booking_id?: string | number;
  booking_order_id?: string | number;
  request_id?: string | number;
  order_id?: string | number;
  new_status?: string;
  status?: string;
  old_status?: string;
  changed_at?: string;
  public_tracking_id?: string;
}) => {
  const bookingId = payload.booking_id || payload.booking_order_id;
  const requestId = payload.request_id;
  const orderId = payload.order_id;
  const newStatus = payload.new_status || payload.status;
  const changedAt = payload.changed_at || new Date().toISOString();
  const publicTrackingId = payload.public_tracking_id;

  // 1. Locate the ReturnExchangeRequest
  let request: any = null;

  if (bookingId) {
    request = await ReturnExchangeRequest.findOne({
      where: { booking_order_id: String(bookingId) },
    });
  }

  if (!request && requestId && !isNaN(Number(requestId))) {
    request = await ReturnExchangeRequest.findByPk(Number(requestId));
  }

  if (!request && bookingId && !isNaN(Number(bookingId))) {
    request = await ReturnExchangeRequest.findByPk(Number(bookingId));
  }

  if (!request && orderId && !isNaN(Number(orderId))) {
    request = await ReturnExchangeRequest.findOne({
      where: {
        orderId: Number(orderId),
        status: { [Op.in]: ["PENDING", "APPROVED"] },
      },
      order: [["createdAt", "DESC"]],
    });
  }

  if (!request && publicTrackingId) {
    request = await ReturnExchangeRequest.findOne({
      where: { public_tracking_id: String(publicTrackingId) },
    });
  }

  if (!request) {
    throw new Error(
      `Return/Exchange request not found for identifier: ${
        bookingId || requestId || orderId || publicTrackingId
      }`
    );
  }

  // 2. Map rider / delivery status
  let deliveryStatus = request.delivery_status;
  let targetRequestStatus = request.status;
  const normalized = String(newStatus || "").toLowerCase().trim();

  if (
    normalized === "assigned" ||
    normalized === "rider.assigned" ||
    normalized === "rider_assigned"
  ) {
    deliveryStatus = "Rider Assigned";
  } else if (
    normalized === "picked up" ||
    normalized === "order.picked_up" ||
    normalized === "in_transit" ||
    normalized === "in transit" ||
    normalized === "out for delivery" ||
    normalized === "out_for_delivery"
  ) {
    deliveryStatus = "In Transit";
  } else if (
    normalized === "delivered" ||
    normalized === "order.delivered" ||
    normalized === "completed" ||
    normalized === "order.completed"
  ) {
    deliveryStatus = "Delivered";
    targetRequestStatus = "COMPLETED";
  } else if (
    normalized === "cancelled" ||
    normalized === "order.cancelled"
  ) {
    deliveryStatus = "Cancelled";
    targetRequestStatus = "CANCELLED";
  } else if (
    normalized === "rejected" ||
    normalized === "order.rejected"
  ) {
    deliveryStatus = "Rejected";
    targetRequestStatus = "REJECTED";
  } else if (
    normalized === "failed" ||
    normalized === "undelivered" ||
    normalized === "delivery_failed"
  ) {
    deliveryStatus = "Delivery Failed";
  } else if (normalized) {
    deliveryStatus = newStatus;
  }

  // 3. Update tracking details if provided
  if (publicTrackingId && !request.public_tracking_id) {
    request.public_tracking_id = publicTrackingId;
  }
  if (bookingId && !request.booking_order_id) {
    request.booking_order_id = String(bookingId);
  }
  request.delivery_status = deliveryStatus;

  // 4. Handle Status Transitions and Completion triggers
  const isRequestStatusChanged = request.status !== targetRequestStatus;

  if (isRequestStatusChanged && targetRequestStatus === "COMPLETED") {
    // Perform full completion logic (refunds, inventory replenishment, order sync)
    return await updateRequestStatus(
      request.id,
      request.userId,
      "admin",
      "COMPLETED"
    );
  } else if (isRequestStatusChanged && targetRequestStatus === "CANCELLED" && request.status !== "COMPLETED") {
    return await updateRequestStatus(
      request.id,
      request.userId,
      "admin",
      "CANCELLED"
    );
  } else {
    await request.save();
  }

  // 5. Fetch complete enriched details
  const enrichedData = await getFullReturnExchangeById(request.id);

  // 6. Broadcast Real-time Socket.IO events to buyer and seller
  try {
    const io = getIO();
    if (io && enrichedData) {
      const socketPayload = {
        requestId: request.id,
        orderId: request.orderId,
        type: request.type,
        status: request.status,
        delivery_status: request.delivery_status,
        booking_order_id: request.booking_order_id,
        public_tracking_id: request.public_tracking_id,
        changed_at: changedAt,
        delivar_status: newStatus,
        details: enrichedData,
      };

      io.to(`user_${request.userId}`).emit("return_exchange_status_updated", socketPayload);
      io.to(`user_${request.sellerId}`).emit("return_exchange_status_updated", socketPayload);
      io.to(`user_${request.userId}`).emit("return_status_updated", socketPayload);
      io.to(`user_${request.sellerId}`).emit("return_status_updated", socketPayload);
    }
  } catch (socketErr) {
    console.error("[Return/Exchange Webhook] Socket broadcast error:", socketErr);
  }

  // 7. Send Push Notifications on key milestones
  if (deliveryStatus === "In Transit" || normalized === "picked up") {
    createAndSendNotification(
      request.userId,
      `${request.type === "RETURN" ? "Return" : "Exchange"} Items Picked Up 🛵`,
      `The delivery rider has picked up the items for ${request.type.toLowerCase()} request #${request.id}.`,
      "return_exchange_status_update",
      request.id,
      "buyer"
    ).catch((e) => console.error("[Notification Error]", e));

    createAndSendNotification(
      request.sellerId,
      `${request.type === "RETURN" ? "Return" : "Exchange"} Items in Transit 🛵`,
      `Rider has picked up items for ${request.type.toLowerCase()} request #${request.id} and is on the way.`,
      "return_exchange_status_update",
      request.id,
      "seller"
    ).catch((e) => console.error("[Notification Error]", e));
  } else if (deliveryStatus === "Delivered" || targetRequestStatus === "COMPLETED") {
    createAndSendNotification(
      request.userId,
      `${request.type === "RETURN" ? "Return" : "Exchange"} Completed 🎉`,
      `Your ${request.type.toLowerCase()} request #${request.id} for order #${request.orderId} has been completed.`,
      "return_exchange_status_update",
      request.id,
      "buyer"
    ).catch((e) => console.error("[Notification Error]", e));

    createAndSendNotification(
      request.sellerId,
      `${request.type === "RETURN" ? "Return" : "Exchange"} Delivered & Processed 🎉`,
      `${request.type} request #${request.id} for order #${request.orderId} has been successfully delivered and completed.`,
      "return_exchange_status_update",
      request.id,
      "seller"
    ).catch((e) => console.error("[Notification Error]", e));
  }

  return enrichedData;
};

/**
 * Dispatch real-time webhook payload to seller's webhook endpoint if configured
 */
export const dispatchSellerWebhook = async (
  sellerId: number,
  event: string,
  payload: any
) => {
  try {
    const seller = await User.findByPk(sellerId, {
      include: [
        {
          model: SellerProfile,
          include: [{ model: Store, required: false }],
        },
      ],
    });

    const sellerProfile: any = (seller as any)?.SellerProfile;
    const store: any = sellerProfile?.Store || sellerProfile?.Stores?.[0];

    const targetUrl =
      sellerProfile?.webhookUrl ||
      sellerProfile?.webhook_url ||
      store?.webhookUrl ||
      store?.webhook_url ||
      process.env.SELLER_RETURN_WEBHOOK_URL ||
      process.env.SELLER_WEBHOOK_URL;

    if (!targetUrl) return;

    const secret =
      sellerProfile?.webhookSecret ||
      sellerProfile?.webhook_secret ||
      process.env.DELIVAR_WEBHOOK_SECRET ||
      "jiffy_secret";

    const bodyString = JSON.stringify({
      event,
      timestamp: new Date().toISOString(),
      sellerId,
      data: payload,
    });

    const signature = crypto
      .createHmac("sha256", secret)
      .update(bodyString)
      .digest("hex");

    fetch(targetUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-webhook-signature": signature,
        "x-webhook-event": event,
      },
      body: bodyString,
    }).catch((e: any) => {
      console.error(`[Seller Webhook Dispatch Error] target: ${targetUrl}:`, e?.message);
    });
  } catch (err) {
    console.error("[Seller Webhook Dispatch Error]", err);
  }
};

