import { Op } from "sequelize";
import { jiffy } from "../config/sequelize.js";
import { Product, SellerProfile, Store } from "../model/relations.js";

async function testSearchQuery(q: string, storeName?: string) {
	try {
		const where: any = { isActive: true };

		// Get matching seller IDs for store name search
		let qSellerIds: number[] = [];
		if (q) {
			const qProfiles = await SellerProfile.findAll({
				where: {
					[Op.or]: [
						{ businessName: { [Op.like]: `%${q}%` } },
						{ '$Stores.storeName$': { [Op.like]: `%${q}%` } }
					]
				},
				include: [
					{
						model: Store,
						required: false,
						attributes: []
					}
				],
				attributes: ['userId']
			});
			qSellerIds = qProfiles.map(p => p.userId);
		}

		if (q) {
			where[Op.or] = [
				{ name: { [Op.like]: `%${q}%` } },
				{ brand: { [Op.like]: `%${q}%` } },
				{ description: { [Op.like]: `%${q}%` } },
				{ sellerId: { [Op.in]: qSellerIds } }
			];
		}

		// Filter by storeName if passed separately
		if (storeName) {
			const filterProfiles = await SellerProfile.findAll({
				where: {
					[Op.or]: [
						{ businessName: { [Op.like]: `%${storeName}%` } },
						{ '$Stores.storeName$': { [Op.like]: `%${storeName}%` } }
					]
				},
				include: [
					{
						model: Store,
						required: false,
						attributes: []
					}
				],
				attributes: ['userId']
			});
			const filterSellerIds = filterProfiles.map(p => p.userId);
			where.sellerId = { [Op.in]: filterSellerIds };
		}

		const include: any = [
			{
				association: "variants",
				required: false,
			},
			{
				association: "categories",
				required: false,
			},
			{
				association: "seller",
				attributes: ["id", "phone_number", "email"],
				required: false,
				include: [
					{
						model: SellerProfile,
						required: false,
						attributes: [
							"businessName",
							"gstNumber",
							"address",
							"city",
							"state",
							"zipCode",
							"phone",
						],
						include: [
							{
								model: Store,
								required: false,
								attributes: ["storeName"],
							}
						],
					},
				],
			},
		];

		const products = await Product.findAndCountAll({
			where,
			include,
			limit: 10,
			offset: 0,
			distinct: true,
		} as any);

		console.log(`Querying for q: "${q}", storeName: "${storeName || ''}"`);
		console.log(`Found ${products.rows.length} products`);
		for (const product of products.rows) {
			console.log(`- Product: ${product.name}, Brand: ${product.brand}, Seller ID: ${product.sellerId}`);
			const seller = (product as any).seller;
			if (seller && seller.SellerProfile) {
				console.log(`  Seller BusinessName: "${seller.SellerProfile.businessName}"`);
				const stores = seller.SellerProfile.Stores || [];
				for (const store of stores) {
					console.log(`  Store Name: "${store.storeName}"`);
				}
			}
		}
	} catch (error: any) {
		console.error("Error in testSearchQuery:", error.message, error.stack);
	}
}

async function run() {
	await testSearchQuery("rani");
	console.log("--------------------------------------");
	await testSearchQuery("", "Fashion Hub Main Store");
	console.log("--------------------------------------");
	await testSearchQuery("Blue Shirt");
	await jiffy.close();
}

run();
