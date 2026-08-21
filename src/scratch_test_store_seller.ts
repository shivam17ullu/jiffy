import { Store, SellerProfile } from "./model/relations.js";

async function test() {
  try {
    const nearbyStores = await Store.findAll({
      attributes: ['id', 'sellerId'],
      include: [{
        model: SellerProfile,
        attributes: ['userId'],
        required: true,
      }],
      limit: 1
    });
    console.log("nearbyStores:", JSON.stringify(nearbyStores, null, 2));
    const nearbySellerIds = nearbyStores.map((s: any) => s.SellerProfile?.userId).filter(Boolean);
    console.log("Mapped IDs:", nearbySellerIds);
  } catch(e) {
    console.error(e);
  }
  process.exit(0);
}
test();
