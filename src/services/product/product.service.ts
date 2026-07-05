import { Op, Sequelize } from "sequelize";
import slugify from "slugify";
import { jiffy } from "../../config/sequelize.js";
import {
	Category,
	Product,
	ProductVariant,
	SellerProfile,
	Store,
	Wishlist,
	VerifiedSellers,
	Document,
	Cart,
	CartItem
} from "../../model/relations.js";


// Helper function to generate a unique slug
async function generateUniqueSlug(name: string, transaction?: any, excludeProductId?: number): Promise<string> {
	const baseSlug = slugify(name, { lower: true });
	let uniqueSlug = baseSlug;
	let count = 1;

	while (true) {
		const whereClause: any = { slug: uniqueSlug };
		if (excludeProductId) {
			whereClause.id = { [Op.ne]: excludeProductId };
		}
		const existing = await Product.findOne({
			where: whereClause,
			transaction
		});
		if (!existing) {
			break;
		}
		uniqueSlug = `${baseSlug}-${count}`;
		count++;
	}
	return uniqueSlug;
}

export const createProduct = async (payload: any, sellerId: number, imageUrls: string[] = []) => {
	const t = await jiffy.transaction();
	try {
		payload.slug = await generateUniqueSlug(payload.name, t);

		const {
			categories = [],
			variants = [],
			images = [],
			tags = [],
			...rest
		} = payload;

		// Use uploaded S3 URLs if provided, otherwise use provided URLs
		const finalImages = imageUrls.length > 0 ? imageUrls : images;

		const product = await Product.create(
			{ ...rest, images: finalImages, tags, sellerId },
			{ transaction: t }
		);

		if (categories.length > 0) {
			await product.addCategories(categories, { transaction: t });
		}

		for (const v of variants) {
			await ProductVariant.create(
				{ ...v, isActive: v.isActive !== undefined ? v.isActive : true, productId: product.id },
				{ transaction: t }
			);
		}

		await t.commit();

		return await Product.findByPk(product.id, {
			include: ["categories", "variants", "seller"],
		});
	} catch (err) {
		await t.rollback();
		throw err;
	}
};


export const listProducts = async (opts: any) => {
	const {
		page = 1,
		limit = 20,
		q,
		categoryId,
		brand,
		minPrice,
		maxPrice,
		sort,
		storeName,
		userId, // Optional: to check wishlist status
	} = opts;

	const where: any = { isActive: true };

	// Get matching seller IDs for store name search in q
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
		qSellerIds = qProfiles.map((p: any) => p.userId);
	}

	// Search query - searches product name, brand, description, and seller business name / store name
	if (q) {
		where[Op.or] = [
			{ name: { [Op.like]: `%${q}%` } },
			{ description: { [Op.like]: `%${q}%` } },
			{ brand: { [Op.like]: `%${q}%` } },
			{ sellerId: { [Op.in]: qSellerIds } }
		];
	}

	// Store name filter - matches against both businessName and storeName
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
		const filterSellerIds = filterProfiles.map((p: any) => p.userId);
		where.sellerId = { [Op.in]: filterSellerIds };
	}

	// Brand filter
	if (brand) {
		where.brand = { [Op.like]: `%${brand}%` };
	}

	// Category filtering - handle hierarchical categories
	let categoryFilter: any = null;
	if (categoryId) {
		// Get the category and all its children (subcategories and sub-subcategories)
		const category = await Category.findByPk(categoryId);
		if (category) {
			// Get all descendant category IDs
			const descendantIds = await getCategoryDescendants(categoryId);
			categoryFilter = descendantIds;
		}
	}

	// Price filtering - filter by variant prices
	let priceFilter: any = null;
	if (minPrice || maxPrice) {
		priceFilter = {};
		if (minPrice) priceFilter.price = { [Op.gte]: parseFloat(minPrice) };
		if (maxPrice)
			priceFilter.price = {
				...priceFilter.price,
				[Op.lte]: parseFloat(maxPrice),
			};
	}

	// Build include array
	const include: any = [
		{
			association: "variants",
			where: priceFilter || undefined,
			required: priceFilter ? true : false,
		},
		{
			association: "categories",
			where: categoryFilter
				? { id: { [Op.in]: categoryFilter } }
				: undefined,
			required: categoryFilter ? true : false,
			include: [
				{
					association: "parent",
					include: [{ association: "parent" }], // Include grandparent for full hierarchy
				},
			],
		},
		{
			association: "seller",
			attributes: ["id", "phone_number", "email"],
			required: true,
			include: [
				{
					model: SellerProfile,
					required: true,
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
							attributes: ["storeName", "isSellerOpen"],
						},
						{
							model: VerifiedSellers,
							where: { is_active: true, status: "approved" },
							required: true,
						}
					],
				},
			],
		},
	];

	// Sort handling
	let order: any = [["createdAt", "DESC"]];
	if (sort) {
		const [field, direction] = sort.split(":");
		if (field === "price") {
			// Sort by minimum variant price
			order = [
				[
					{ model: ProductVariant, as: "variants" },
					"price",
					direction?.toUpperCase() || "ASC",
				],
			];
		} else {
			order = [[field, direction?.toUpperCase() || "ASC"]];
		}
	}

	const products = await Product.findAndCountAll({
		where,
		include,
		limit: parseInt(limit),
		offset: (parseInt(page) - 1) * parseInt(limit),
		order,
		distinct: true, // Important for count with joins
	});

	// Get wishlist status for all products if userId is provided
	let wishlistProductIds: Set<number> = new Set();
	if (userId) {
		const wishlistItems = await Wishlist.findAll({
			where: {
				userId: userId,
				productId: { [Op.in]: products.rows.map((p: any) => p.id) },
			},
			attributes: ['productId'],
		});
		wishlistProductIds = new Set(wishlistItems.map((item: any) => item.productId));
	}
	// Get cart quantity for all products if userId is provided
	let cartVariantQtyMap: Map<number, number> = new Map();
	if (userId) {
		const cart = await Cart.findOne({ where: { userId } });
		if (cart) {
			const items = await CartItem.findAll({
				where: { cartId: cart.id },
				attributes: ['variantId', 'qty'],
			});
			for (const item of items) {
				if (item.variantId) {
					cartVariantQtyMap.set(item.variantId, item.qty);
				}
			}
		}
	}

	// Transform products to include min/max price, wishlist status, and variant quantity in cart
	const transformedProducts = products.rows.map((product: any) => {
		const variants = product.variants || [];
		const prices = variants.map((v: any) => v.price).filter((p: any) => p);
		const minPrice = prices.length > 0 ? Math.min(...prices) : null;
		const maxPrice = prices.length > 0 ? Math.max(...prices) : null;

		const sellerStores = product.seller?.SellerProfile?.Stores || [];
		const isSellerOpen = sellerStores.length > 0 ? sellerStores[0].isSellerOpen : true;

		const rawProduct = product.toJSON();
		const mappedVariants = (rawProduct.variants || []).map((v: any) => ({
			...v,
			qty: cartVariantQtyMap.get(v.id) || 0,
		}));

		return {
			...rawProduct,
			variants: mappedVariants,
			priceRange: {
				min: minPrice,
				max: maxPrice,
			},
			isWishlisted: userId ? wishlistProductIds.has(product.id) : false,
			isSellerOpen,
			seller: product.seller
				? {
					id: product.seller.id,
					phone_number: product.seller.phone_number,
					email: product.seller.email,
					isSellerOpen,
					profile: (product.seller as any).SellerProfile
						? {
							businessName: (product.seller as any).SellerProfile.businessName,
							city: (product.seller as any).SellerProfile.city,
							state: (product.seller as any).SellerProfile.state,
							isSellerOpen,
						}
						: null,
				}
				: null,
		};
	});

	return {
		items: transformedProducts,
		total: products.count,
		page: parseInt(page),
		limit: parseInt(limit),
		totalPages: Math.ceil(products.count / parseInt(limit)),
	};
};

// Helper function to get all descendant category IDs
async function getCategoryDescendants(categoryId: number): Promise<number[]> {
	const categoryIds = [categoryId];
	const children = await Category.findAll({
		where: { parentId: categoryId },
	});

	for (const child of children) {
		const grandChildren = await getCategoryDescendants(child.id);
		categoryIds.push(...grandChildren);
	}

	return categoryIds;
}

export const getProductById = async (id: number, userId?: number, checkSellerStatus = false) => {
	const sellerProfileInclude: any = {
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
				attributes: ["storeName", "isSellerOpen"],
			}
		]
	};

	sellerProfileInclude.include.push({
		model: VerifiedSellers,
		required: false,
	});

	const product = await Product.findByPk(id, {
		include: [
			{
				association: "variants",
			},
			{
				association: "categories",
				include: [
					{
						association: "parent",
						include: [{ association: "parent" }],
					},
				],
			},
			{
				association: "seller",
				attributes: ["id", "phone_number", "email"],
				required: false,
				include: [sellerProfileInclude],
			},
		],
	});

	if (!product) return null;

	if (checkSellerStatus) {
		const isOwner = userId !== undefined && Number(userId) === Number(product.sellerId);
		if (!isOwner) {
			const verifiedSeller = (product as any).seller?.SellerProfile?.VerifiedSeller || (product as any).seller?.SellerProfile?.VerifiedSellers;
			const isApproved = verifiedSeller && (verifiedSeller.is_active === true || verifiedSeller.is_active === 1) && verifiedSeller.status === "approved";
			if (!isApproved) {
				return null;
			}
		}
	}

	// Check if product is in wishlist
	let isWishlisted = false;
	if (userId) {
		const wishlistItem = await Wishlist.findOne({
			where: {
				userId: userId,
				productId: id,
			},
		});
		isWishlisted = !!wishlistItem;
	}

	// Get cart quantity if userId is provided
	let cartVariantQtyMap: Map<number, number> = new Map();
	if (userId) {
		const cart = await Cart.findOne({ where: { userId } });
		if (cart) {
			const items = await CartItem.findAll({
				where: { cartId: cart.id },
				attributes: ['variantId', 'qty'],
			});
			for (const item of items) {
				if (item.variantId) {
					cartVariantQtyMap.set(item.variantId, item.qty);
				}
			}
		}
	}

	// Transform product to include price range, seller details, wishlist status, and variant quantity in cart
	const variants = (product as any).variants || [];
	const prices = variants.map((v: any) => v.price).filter((p: any) => p);
	const minPrice = prices.length > 0 ? Math.min(...prices) : null;
	const maxPrice = prices.length > 0 ? Math.max(...prices) : null;

	const sellerStores = (product as any).seller?.SellerProfile?.Stores || [];
	const isSellerOpen = sellerStores.length > 0 ? sellerStores[0].isSellerOpen : true;

	const rawProduct = product.toJSON() as any;
	const mappedVariants = (rawProduct.variants || []).map((v: any) => ({
		...v,
		qty: cartVariantQtyMap.get(v.id) || 0,
	}));

	return {
		...rawProduct,
		variants: mappedVariants,
		priceRange: {
			min: minPrice,
			max: maxPrice,
		},
		isWishlisted,
		isSellerOpen,
		seller: (product as any).seller
			? {
				id: (product as any).seller.id,
				phone_number: (product as any).seller.phone_number,
				email: (product as any).seller.email,
				isSellerOpen,
				profile: (product as any).seller?.SellerProfile
					? {
						businessName: (product as any).seller.SellerProfile.businessName,
						gstNumber: (product as any).seller.SellerProfile.gstNumber,
						address: (product as any).seller.SellerProfile.address,
						city: (product as any).seller.SellerProfile.city,
						state: (product as any).seller.SellerProfile.state,
						zipCode: (product as any).seller.SellerProfile.zipCode,
						phone: (product as any).seller.SellerProfile.phone,
						isSellerOpen,
					}
					: null,
			}
			: null,
	};
};
// Update product with seller ownership check
export const updateProduct = async (id: number, sellerId: number, payload: any, imageUrls: string[] | null = null) => {
	const t = await jiffy.transaction();
	try {
		// If imageUrls is provided (even if empty array), replace existing images
		// If imageUrls is null, don't touch the images field
		if (imageUrls !== null) {
			// Replace images with the new list (frontend sends the complete list)
			payload.images = imageUrls;
		}

		if (payload.name) {
			payload.slug = await generateUniqueSlug(payload.name, t, id);
		}

		const {
			categories,
			variants,
			tags,
			...rest
		} = payload;

		const updateData: any = { ...rest };
		if (tags !== undefined) updateData.tags = tags;

		const [updatedCount] = await Product.update(updateData, {
			where: { id, sellerId },
			transaction: t,
		});

		if (updatedCount === 0) {
			await t.rollback();
			return null;
		}

		const product = await Product.findByPk(id, { transaction: t });

		if (product) {
			if (categories && Array.isArray(categories)) {
				await (product as any).setCategories(categories, { transaction: t });
			}

			if (variants && Array.isArray(variants)) {
				const existingVariants = await ProductVariant.findAll({
					where: { productId: id },
					transaction: t
				});

				const existingVariantIds = existingVariants.map(v => v.id);
				const payloadVariantIds = variants.map(v => v.id).filter(id => id);

				// Variants to delete
				const variantsToDelete = existingVariantIds.filter(id => !payloadVariantIds.includes(id));
				if (variantsToDelete.length > 0) {
					await ProductVariant.destroy({
						where: { id: { [Op.in]: variantsToDelete } },
						transaction: t
					});
				}

				// Variants to update/create
				for (const v of variants) {
					if (v.id) {
						const { productId, ...variantData } = v;
						await ProductVariant.update(variantData, {
							where: { id: v.id },
							transaction: t
						});
					} else {
						await ProductVariant.create(
							{ ...v, isActive: true, productId: id },
							{ transaction: t }
						);
					}
				}
			}
		}

		await t.commit();
		return await getProductById(id);
	} catch (err) {
		await t.rollback();
		throw err;
	}
};

// Delete product with seller ownership check
export const deleteProduct = async (id: number, sellerId: number) => {
	return await Product.destroy({ where: { id, sellerId } });
};

export const listSellerProducts = async (sellerId: number, opts: any) => {
	const { page = 1, limit = 20, q, categoryId, brand, minPrice, maxPrice, sort } = opts;

	// Base where clause - strictly enforce sellerId
	const where: any = { sellerId };

	// Note: We intentionally do NOT filter by isActive, so sellers can see inactive products

	// Search query
	if (q) {
		where[Op.or] = [
			{ name: { [Op.like]: `%${q}%` } },
			{ description: { [Op.like]: `%${q}%` } },
			{ brand: { [Op.like]: `%${q}%` } },
		];
	}

	// Brand filter
	if (brand) {
		where.brand = { [Op.like]: `%${brand}%` };
	}

	// Category filtering
	let categoryFilter: any = null;
	if (categoryId) {
		const descendantIds = await getCategoryDescendants(categoryId);
		categoryFilter = descendantIds;
	}

	// Price filtering
	let priceFilter: any = null;
	if (minPrice || maxPrice) {
		priceFilter = {};
		if (minPrice) priceFilter.price = { [Op.gte]: parseFloat(minPrice) };
		if (maxPrice)
			priceFilter.price = {
				...priceFilter.price,
				[Op.lte]: parseFloat(maxPrice),
			};
	}

	// Include array
	const include: any = [
		{
			association: "variants",
			where: priceFilter || undefined,
			required: priceFilter ? true : false,
		},
		{
			association: "categories",
			where: categoryFilter
				? { id: { [Op.in]: categoryFilter } }
				: undefined,
			required: categoryFilter ? true : false,
		},
	];

	// Sort handling
	let order: any = [["createdAt", "DESC"]];
	if (sort) {
		const [field, direction] = sort.split(":");
		if (field === "price") {
			order = [
				[
					{ model: ProductVariant, as: "variants" },
					"price",
					direction?.toUpperCase() || "ASC",
				],
			];
		} else {
			order = [[field, direction?.toUpperCase() || "ASC"]];
		}
	}

	const products = await Product.findAndCountAll({
		where,
		include,
		limit: parseInt(limit),
		offset: (parseInt(page) - 1) * parseInt(limit),
		order,
		distinct: true,
	});

	// Transform products
	const transformedProducts = products.rows.map((product: any) => {
		const variants = product.variants || [];
		const prices = variants.map((v: any) => v.price).filter((p: any) => p);
		const minPrice = prices.length > 0 ? Math.min(...prices) : null;
		const maxPrice = prices.length > 0 ? Math.max(...prices) : null;

		return {
			...product.toJSON(),
			priceRange: {
				min: minPrice,
				max: maxPrice,
			},
		};
	});

	return {
		items: transformedProducts,
		total: products.count,
		page: parseInt(page),
		limit: parseInt(limit),
		totalPages: Math.ceil(products.count / parseInt(limit)),
	};
};

export const toggleVariantStatus = async (productId: number, variantId: number, sellerId: number, isActive: boolean) => {
	// Verify the product belongs to the seller
	const product = await Product.findOne({ where: { id: productId, sellerId } });
	if (!product) {
		return null;
	}

	const variant = await ProductVariant.findOne({ where: { id: variantId, productId } });
	if (!variant) {
		return null;
	}

	await variant.update({ isActive, isStock: isActive });

	return await getProductById(productId);
};

export const searchAll = async (q: string) => {
	const term = `%${q}%`;

	// 1. Search products
	const matchedProducts = await Product.findAll({
		where: {
			isActive: true,
			[Op.or]: [
				{ name: { [Op.like]: term } },
				{ description: { [Op.like]: term } }
			]
		},
		include: [
			{
				association: "seller",
				required: true,
				include: [
					{
						model: SellerProfile,
						required: true,
						include: [
							{
								model: VerifiedSellers,
								where: { is_active: true, status: "approved" },
								required: true,
							}
						]
					}
				]
			}
		],
		limit: 20
	});

	const productResults = matchedProducts.map((p: any) => ({
		id: p.id,
		name: p.name,
		type: "product",
		image: (p.images && p.images.length > 0) ? p.images[0] : null,
		isSellerOpen: null
	}));

	// 2. Search stores
	const matchedStores = await Store.findAll({
		where: {
			is_active: true,
			[Op.or]: [
				{ storeName: { [Op.like]: term } },
				{ '$SellerProfile.businessName$': { [Op.like]: term } }
			]
		},
		include: [
			{
				model: SellerProfile,
				required: true,
				include: [
					{
						model: VerifiedSellers,
						where: { is_active: true, status: "approved" },
						required: true
					},
					{
						model: Document,
						attributes: ['storeImageUrl'],
						required: false
					}
				]
			}
		],
		limit: 20
	});

	const storeResults = matchedStores.map((store: any) => ({
		id: store.id,
		name: store.storeName,
		type: "store",
		image: store.SellerProfile?.Document?.storeImageUrl || null,
		isSellerOpen: store.isSellerOpen
	}));

	// 3. Search brands
	const productsWithBrands = await Product.findAll({
		attributes: ['brand', 'images'],
		where: {
			brand: {
				[Op.like]: term
			},
			isActive: true
		},
		include: [
			{
				association: "seller",
				required: true,
				include: [
					{
						model: SellerProfile,
						required: true,
						include: [
							{
								model: VerifiedSellers,
								where: { is_active: true, status: "approved" },
								required: true,
							}
						]
					}
				]
			}
		],
		limit: 100
	});

	const uniqueBrandsMap = new Map();
	for (const p of productsWithBrands) {
		const brandName = p.brand?.trim();
		if (brandName) {
			const lower = brandName.toLowerCase();
			if (!uniqueBrandsMap.has(lower)) {
				uniqueBrandsMap.set(lower, {
					id: brandName,
					name: brandName,
					type: "brand",
					image: (p.images && p.images.length > 0) ? p.images[0] : null,
					isSellerOpen: null
				});
			}
		}
	}
	const brandResults = Array.from(uniqueBrandsMap.values());

	return [...productResults, ...storeResults, ...brandResults];
};

