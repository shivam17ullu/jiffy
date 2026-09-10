import { SellerProfile, User, Store, VerifiedSellers, Document } from "../model/relations.js";
import { Op, Sequelize } from "sequelize";

// Radius of the Earth in metres
const EARTH_RADIUS_M = 6371000;

/**
 * Build a Sequelize WHERE literal that returns only stores whose
 * (latitude, longitude) fall within `radiusKm` kilometres of the
 * caller's position.  Returns null when coordinates are not provided.
 */
function buildGeoWhere(lat?: number, lng?: number): any {
  const radiusKm = Number(process.env.DEFAULT_SEARCH_RADIUS_KM) || 10;
  if (lat == null || lng == null || isNaN(lat) || isNaN(lng)) return null;

  const radiusM = radiusKm * 1000;

  // ST_Distance_Sphere returns distance in metres (MySQL 5.7+)
  return Sequelize.where(
    Sequelize.literal(
      `ST_Distance_Sphere(
         POINT(Stores.longitude, Stores.latitude),
         POINT(${lng}, ${lat})
       )`
    ),
    { [Op.lte]: radiusM }
  );
}

export default class StoreService {
  static async getstores(zipCode?: string, storeCategory?: string | string[], lat?: number, lng?: number) {
    const hasGeo = lat != null && lng != null && !isNaN(lat) && !isNaN(lng);
    const geoWhere = hasGeo ? buildGeoWhere(lat, lng) : null;
    const conditions: any[] = [];

    let requestedCategories: string[] = [];
    if (Array.isArray(storeCategory)) {
      requestedCategories = storeCategory.map((c) => String(c).trim()).filter(Boolean);
    } else if (typeof storeCategory === "string" && storeCategory.trim()) {
      const trimmed = storeCategory.trim();
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          requestedCategories = parsed.map((c) => String(c).trim()).filter(Boolean);
        } else if (parsed) {
          requestedCategories = [String(parsed).trim()];
        }
      } catch {
        requestedCategories = trimmed.split(",").map((c) => c.trim()).filter(Boolean);
      }
    }

    const hasAll = requestedCategories.some((c) => c.toLowerCase() === "all");
    if (requestedCategories.length > 0 && !hasAll) {
      const orClauses = requestedCategories.map((cat) => {
        const escaped = cat.replace(/'/g, "\\'");
        return `JSON_CONTAINS(Stores.storeCategory, '"${escaped}"') OR Stores.storeCategory LIKE '%${escaped}%'`;
      });
      const allClause = `JSON_CONTAINS(Stores.storeCategory, '"All"') OR Stores.storeCategory LIKE '%All%' OR Stores.storeCategory = 'All'`;
      conditions.push(Sequelize.literal(`(${orClauses.join(" OR ")} OR ${allClause})`));
    }

    // Only filter by exact pincode if geo coordinates are not provided
    if (zipCode && !hasGeo) {
      conditions.push({ pincode: zipCode });
    }

    if (geoWhere) {
      conditions.push(geoWhere);
    }

    let storeWhere: any = {};
    if (conditions.length > 0) {
      storeWhere = { [Op.and]: conditions };
    }

    let storeInclude: any = {
      model: Store,
      required: true,
    };

    if (hasGeo) {
      storeInclude.attributes = {
        include: [
          [
            Sequelize.literal(`ROUND(ST_Distance_Sphere(POINT(Stores.longitude, Stores.latitude), POINT(${lng}, ${lat})) / 1000, 2)`),
            'distanceKm'
          ],
          [
            // Assuming average city speed of 20 km/h (3 mins per km)
            Sequelize.literal(`ROUND((ST_Distance_Sphere(POINT(Stores.longitude, Stores.latitude), POINT(${lng}, ${lat})) / 1000) * 3)`),
            'estimatedTimeMins'
          ]
        ]
      };
    }

    if (conditions.length > 0) {
      storeInclude.where = storeWhere;
    }

    // Order by nearest store first if lat/lng provided, else latest store first
    let orderClause: any = hasGeo
      ? [
          [
            Sequelize.literal(`ST_Distance_Sphere(POINT(Stores.longitude, Stores.latitude), POINT(${lng}, ${lat}))`),
            'ASC'
          ]
        ]
      : [
          [Store, 'createdAt', 'DESC']
        ];

    return await SellerProfile.findAll({
      order: orderClause,
      subQuery: false,
      include: [
        {
          model: VerifiedSellers,
          where: { is_active: true, status: "approved" }, // INNER JOIN condition
          required: true,
        },
        storeInclude,
        {
          model: Document,
          attributes: ['storeImageUrl'],
        },
      ],
    });
  }

  static async getStoreById(id: number) {
    return await SellerProfile.findByPk(id, {
      include: [
        {
          model: User,
          attributes: { exclude: ["password"] },
        },
        {
          model: Store,
        },
        {
          model: VerifiedSellers,
        },
      ],
    });
  }

  static async updateStoreStatus(id: number, isSellerOpen: boolean) {
    const store = await Store.findByPk(id);
    if (!store) return null;
    
    store.isSellerOpen = isSellerOpen;
    await store.save();
    return store;
  }

  static async updateStoreOperatingHours(id: number, payload: {
    openingDays?: string[] | string;
    openingTime?: string;
    closingTime?: string;
    isSellerOpen?: boolean;
    [key: string]: any;
  }) {
    const store = await Store.findByPk(id);
    if (!store) return null;

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
  }
}

