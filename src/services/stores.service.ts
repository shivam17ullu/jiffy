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
  const radiusKm = Number(process.env.DEFAULT_SEARCH_RADIUS_KM) || 15;
  if (lat == null || lng == null) return null;

  const radiusM = radiusKm * 1000;

  // ST_Distance_Sphere returns distance in metres (MySQL 5.7+)
  return Sequelize.where(
    Sequelize.literal(
      `ST_Distance_Sphere(
         POINT(longitude, latitude),
         POINT(${lng}, ${lat})
       )`
    ),
    { [Op.lte]: radiusM }
  );
}

export default class StoreService {
  static async getstores(zipCode?: string, storeCategory?: string, lat?: number, lng?: number) {
    const radiusKm = Number(process.env.DEFAULT_SEARCH_RADIUS_KM) || 15;
    let storeWhere: any = {};


    if (storeCategory && storeCategory.toLowerCase() !== "all") {
      storeWhere.storeCategory = storeCategory;
    }

    // ── Geo filter ──────────────────────────────────────────────────────────
    const geoWhere = buildGeoWhere(lat, lng);
    if (geoWhere) {
      storeWhere = { ...storeWhere, [Op.and]: [geoWhere] };
    }
    // ────────────────────────────────────────────────────────────────────────

    let storeInclude: any = {
      model: Store,
      required: (Object.keys(storeWhere).length > 0 || geoWhere != null),
    };

    if (lat != null && lng != null) {
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

    if (Object.keys(storeWhere).length > 0) {
      storeInclude.where = storeWhere;
    }

    // Order by latest store first
    let orderClause: any = [
      [Store, 'createdAt', 'DESC']
    ];

    return await SellerProfile.findAll({
      order: orderClause,
      include: [
        {
          model: VerifiedSellers,
          where: { is_active: true, status: "approved" }, // INNER JOIN condition
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
}

