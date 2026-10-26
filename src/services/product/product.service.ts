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
	CartItem,
	ProductCategory
} from "../../model/relations.js";
import { parseSearchQuery } from "../../utils/searchQueryParser.js";
import { expandSearchQuery } from "../../utils/searchEnhancer.js";


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

/**
 * Helper to build Sequelize order array based on sort query.
 * Handles:
 * - "Recommended / Relevance" (or relevance / recommended / default)
 * - "Price: Low to High" (or price_asc / low_to_high / price:asc)
 * - "Price: High to Low" (or price_desc / high_to_low / price:desc)
 * - "Newest Arrivals" (or newest / latest / createdat:desc)
 * - "Discount: High to Low" (or discount_desc / discount:desc)
 * - Legacy "field:direction" (e.g. price:ASC, createdAt:DESC, name:ASC)
 */
export const buildProductSortOrder = (sort?: string, q?: string): any[] => {
	if (!sort || typeof sort !== "string") {
		return [["createdAt", "DESC"], ["id", "DESC"]];
	}

	const normalized = sort.trim().toLowerCase();

	// 1. Recommended / Relevance
	if (
		normalized === "recommended / relevance" ||
		normalized === "recommended/relevance" ||
		normalized === "recommended" ||
		normalized === "relevance" ||
		normalized === "default" ||
		normalized.includes("recom") ||
		normalized.includes("relev")
	) {
		if (q && q.trim()) {
			const expanded = expandSearchQuery(q.trim());
			const cleanSanitized = (expanded.cleanQuery || q.trim()).replace(/'/g, "\\'");
			const correctedSanitized = (expanded.correctedQuery || "").replace(/'/g, "\\'");
			const firstSynonym = (expanded.synonyms[0] || "").replace(/'/g, "\\'");

			let caseClauses = `
				WHEN \`Product\`.\`name\` = '${cleanSanitized}' THEN 1
				WHEN \`Product\`.\`name\` LIKE '${cleanSanitized}%' THEN 2
				WHEN \`Product\`.\`name\` LIKE '%${cleanSanitized}%' THEN 3
			`;

			if (expanded.isFuzzyCorrected && correctedSanitized) {
				caseClauses += `
					WHEN \`Product\`.\`name\` LIKE '${correctedSanitized}%' THEN 4
					WHEN \`Product\`.\`name\` LIKE '%${correctedSanitized}%' THEN 5
				`;
			}

			if (firstSynonym) {
				caseClauses += `
					WHEN \`Product\`.\`name\` LIKE '%${firstSynonym}%' THEN 6
				`;
			}

			caseClauses += `ELSE 7`;

			return [
				[
					Sequelize.literal(`CASE ${caseClauses} END`),
					"ASC",
				],
				["createdAt", "DESC"],
				["id", "DESC"],
			];
		}
		return [["createdAt", "DESC"], ["id", "DESC"]];
	}

	// 2. Price: Low to High
	if (
		normalized === "price: low to high" ||
		normalized === "price low to high" ||
		normalized === "low to high" ||
		normalized === "low_to_high" ||
		normalized === "price_low_to_high" ||
		normalized === "price_asc" ||
		normalized === "price:asc" ||
		normalized === "price_low" ||
		normalized === "low"
	) {
		return [
			[
				Sequelize.literal(
					"(SELECT COALESCE(MIN(pv.price), 999999999) FROM product_variants pv WHERE pv.productId = `Product`.`id` AND pv.isActive = 1)"
				),
				"ASC",
			],
			["id", "DESC"],
		];
	}

	// 3. Price: High to Low
	if (
		normalized === "price: high to low" ||
		normalized === "price high to low" ||
		normalized === "high to low" ||
		normalized === "high_to_low" ||
		normalized === "price_high_to_low" ||
		normalized === "price_desc" ||
		normalized === "price:desc" ||
		normalized === "price_high" ||
		normalized === "high"
	) {
		return [
			[
				Sequelize.literal(
					"(SELECT COALESCE(MAX(pv.price), 0) FROM product_variants pv WHERE pv.productId = `Product`.`id` AND pv.isActive = 1)"
				),
				"DESC",
			],
			["id", "DESC"],
		];
	}

	// 4. Newest Arrivals
	if (
		normalized === "newest arrivals" ||
		normalized === "newest_arrivals" ||
		normalized === "new_arrivals" ||
		normalized === "newest" ||
		normalized === "new" ||
		normalized === "latest" ||
		normalized === "createdat:desc" ||
		normalized === "createdat_desc" ||
		normalized === "created_at:desc" ||
		normalized === "created_at_desc"
	) {
		return [["createdAt", "DESC"], ["id", "DESC"]];
	}

	// 5. Discount: High to Low
	if (
		normalized === "discount: high to low" ||
		normalized === "discount high to low" ||
		normalized === "discount_high_to_low" ||
		normalized === "discount_desc" ||
		normalized === "discount:desc" ||
		normalized === "discount" ||
		normalized.includes("discount")
	) {
		return [
			[
				Sequelize.literal(
					"(SELECT COALESCE(MAX(CASE WHEN pv.mrp > pv.price AND pv.mrp > 0 THEN ((pv.mrp - pv.price) / pv.mrp) * 100 ELSE 0 END), 0) FROM product_variants pv WHERE pv.productId = `Product`.`id` AND pv.isActive = 1)"
				),
				"DESC",
			],
			["createdAt", "DESC"],
			["id", "DESC"],
		];
	}

	// Legacy field:direction format (e.g. price:ASC, name:DESC)
	if (sort.includes(":")) {
		const [rawField, rawDir] = sort.split(":");
		const field = rawField.trim();
		const direction = rawDir?.trim().toUpperCase() === "ASC" ? "ASC" : "DESC";

		if (field.toLowerCase() === "price") {
			return direction === "ASC"
				? [
						[
							Sequelize.literal(
								"(SELECT COALESCE(MIN(pv.price), 999999999) FROM product_variants pv WHERE pv.productId = `Product`.`id` AND pv.isActive = 1)"
							),
							"ASC",
						],
						["id", "DESC"],
				  ]
				: [
						[
							Sequelize.literal(
								"(SELECT COALESCE(MAX(pv.price), 0) FROM product_variants pv WHERE pv.productId = `Product`.`id` AND pv.isActive = 1)"
							),
							"DESC",
						],
						["id", "DESC"],
				  ];
		}

		if (field.toLowerCase() === "discount") {
			return [
				[
					Sequelize.literal(
						"(SELECT COALESCE(MAX(CASE WHEN pv.mrp > pv.price AND pv.mrp > 0 THEN ((pv.mrp - pv.price) / pv.mrp) * 100 ELSE 0 END), 0) FROM product_variants pv WHERE pv.productId = `Product`.`id` AND pv.isActive = 1)"
					),
					direction,
				],
				["createdAt", "DESC"],
				["id", "DESC"],
			];
		}

		const allowedColumns = ["name", "createdat", "updatedat", "id", "brand"];
		if (allowedColumns.includes(field.toLowerCase())) {
			return [[field, direction], ["id", "DESC"]];
		}
	}

	return [["createdAt", "DESC"], ["id", "DESC"]];
};

/**
 * Helper to parse parameters that can be passed as single values, comma-separated strings,
 * JSON arrays, or native arrays.
 */
export const parseArrayParam = (val: any): string[] => {
	if (val === undefined || val === null) return [];
	if (Array.isArray(val)) {
		return val.map((v) => String(v).trim()).filter(Boolean);
	}
	if (typeof val === "string") {
		const trimmed = val.trim();
		if (!trimmed) return [];
		try {
			const parsed = JSON.parse(trimmed);
			if (Array.isArray(parsed)) {
				return parsed.map((v) => String(v).trim()).filter(Boolean);
			}
		} catch {
			// not valid JSON, fallback to comma separation
		}
		return trimmed.split(",").map((s) => s.trim()).filter(Boolean);
	}
	return [String(val).trim()].filter(Boolean);
};

/**
 * Parses price range from human-readable labels (e.g. "Under ₹500", "₹500 - ₹1,000", "₹5,000 & Above")
 * or from explicit minPrice / maxPrice numbers.
 */
export const parsePriceRange = (
	priceRangeInput?: any,
	rawMinPrice?: any,
	rawMaxPrice?: any
): { minPrice?: number; maxPrice?: number } => {
	let minPrice: number | undefined =
		rawMinPrice !== undefined && rawMinPrice !== null && rawMinPrice !== "" && !isNaN(Number(rawMinPrice))
			? Number(rawMinPrice)
			: undefined;
	let maxPrice: number | undefined =
		rawMaxPrice !== undefined && rawMaxPrice !== null && rawMaxPrice !== "" && !isNaN(Number(rawMaxPrice))
			? Number(rawMaxPrice)
			: undefined;

	if (priceRangeInput && typeof priceRangeInput === "string") {
		const str = priceRangeInput.trim();
		if (minPrice === undefined && maxPrice === undefined) {
			const lower = str.toLowerCase();
			// e.g. "under ₹500", "under 500", "< 500"
			if (lower.includes("under") || lower.startsWith("<")) {
				const numStr = lower.replace(/[^0-9.]/g, "");
				if (numStr) {
					minPrice = 0;
					maxPrice = parseFloat(numStr);
				}
			}
			// e.g. "₹5,000 & above", "above 5000", "5000+", "> 5000"
			else if (lower.includes("above") || lower.includes("+") || lower.startsWith(">")) {
				const numStr = lower.replace(/[^0-9.]/g, "");
				if (numStr) {
					minPrice = parseFloat(numStr);
				}
			}
			// e.g. "₹500 - ₹1,000", "500-1000", "500 to 1000"
			else if (lower.includes("-") || lower.includes("to")) {
				const parts = lower.split(/-|to/);
				if (parts.length === 2) {
					const num1 = parts[0].replace(/[^0-9.]/g, "");
					const num2 = parts[1].replace(/[^0-9.]/g, "");
					if (num1) minPrice = parseFloat(num1);
					if (num2) maxPrice = parseFloat(num2);
				}
			}
			// e.g. "500,1000" (comma delimited without hyphen)
			else if (lower.includes(",")) {
				const parts = lower.split(",");
				if (parts.length === 2) {
					const num1 = parts[0].replace(/[^0-9.]/g, "");
					const num2 = parts[1].replace(/[^0-9.]/g, "");
					if (num1) minPrice = parseFloat(num1);
					if (num2) maxPrice = parseFloat(num2);
				}
			}
		}
	} else if (Array.isArray(priceRangeInput) && priceRangeInput.length >= 2) {
		if (minPrice === undefined) minPrice = Number(priceRangeInput[0]);
		if (maxPrice === undefined) maxPrice = Number(priceRangeInput[1]);
	}

	return { minPrice, maxPrice };
};

export const createProduct = async (payload: any, sellerId: number) => {
	const t = await jiffy.transaction();
	try {
		payload.slug = await generateUniqueSlug(payload.name, t);

		const {
			categories = [],
			variants = [],
			tags = [],
			isReturnable,
			isExchangeable,
			...rest
		} = payload;

		const isReturnableBool = isReturnable !== undefined
			? (typeof isReturnable === "string" ? isReturnable === "true" : Boolean(isReturnable))
			: (payload.is_returnable !== undefined
				? (typeof payload.is_returnable === "string" ? payload.is_returnable === "true" : Boolean(payload.is_returnable))
				: true);

		const isExchangeableBool = isExchangeable !== undefined
			? (typeof isExchangeable === "string" ? isExchangeable === "true" : Boolean(isExchangeable))
			: (payload.is_exchangeable !== undefined
				? (typeof payload.is_exchangeable === "string" ? payload.is_exchangeable === "true" : Boolean(payload.is_exchangeable))
				: true);

		const product = await Product.create(
			{
				...rest,
				tags,
				sellerId,
				isReturnable: isReturnableBool,
				isExchangeable: isExchangeableBool,
			},
			{ transaction: t }
		);

		if (categories.length > 0) {
			await product.addCategories(categories, { transaction: t });
		}

		if (variants && variants.length > 0) {
			let hasDefault = false;
			for (const v of variants) {
				if (v.isDefault && !hasDefault) {
					hasDefault = true;
				} else {
					v.isDefault = false;
				}
			}
			if (!hasDefault) {
				variants[0].isDefault = true;
			}
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


// ─────────────────────────────────────────────────────────────────────────────
// Caching & Helper Utilities for High-Performance Queries
// ─────────────────────────────────────────────────────────────────────────────

interface CategoryCacheEntry {
	expiresAt: number;
	map: Map<number, number[]>; // parentId -> childIds
}

let categoryTreeCache: CategoryCacheEntry | null = null;

export const clearCategoryTreeCache = () => {
	categoryTreeCache = null;
};

async function getCachedCategoryMap(): Promise<Map<number, number[]>> {
	const now = Date.now();
	if (categoryTreeCache && categoryTreeCache.expiresAt > now) {
		return categoryTreeCache.map;
	}

	const allCategories = await Category.findAll({
		attributes: ['id', 'parentId'],
		where: { isActive: true },
		raw: true,
	});

	const map = new Map<number, number[]>();
	for (const cat of allCategories as any[]) {
		const pId = cat.parentId ? Number(cat.parentId) : 0;
		if (!map.has(pId)) {
			map.set(pId, []);
		}
		map.get(pId)!.push(Number(cat.id));
	}

	categoryTreeCache = {
		expiresAt: now + 5 * 60 * 1000, // 5 min TTL
		map,
	};
	return map;
}

// In-memory O(1) non-blocking category descendant resolver
async function getCategoryDescendants(categoryId: number): Promise<number[]> {
	const map = await getCachedCategoryMap();
	const result: number[] = [categoryId];
	const queue: number[] = [categoryId];

	while (queue.length > 0) {
		const current = queue.shift()!;
		const children = map.get(current);
		if (children && children.length > 0) {
			for (const childId of children) {
				result.push(childId);
				queue.push(childId);
			}
		}
	}

	return result;
}

// Short-lived geo cache for nearby seller IDs
const geoSellerCache = new Map<string, { expiresAt: number; sellerIds: number[] }>();

async function getNearbySellerIds(lat?: number, lng?: number): Promise<number[] | null> {
	if (lat == null || lng == null || isNaN(lat) || isNaN(lng)) {
		return null;
	}

	const radiusKm = Number(process.env.DEFAULT_SEARCH_RADIUS_KM) || 10;
	const cacheKey = `${lat.toFixed(2)}_${lng.toFixed(2)}_${radiusKm}`;
	const now = Date.now();

	const cached = geoSellerCache.get(cacheKey);
	if (cached && cached.expiresAt > now) {
		return cached.sellerIds;
	}

	const radiusM = radiusKm * 1000;
	const latDelta = radiusKm / 111.0;
	const lngDelta = radiusKm / (111.0 * Math.cos(lat * (Math.PI / 180)) || 1);

	const minLat = lat - latDelta;
	const maxLat = lat + latDelta;
	const minLng = lng - lngDelta;
	const maxLng = lng + lngDelta;

	const nearbyStores = await Store.findAll({
		attributes: ['id'],
		include: [{
			model: SellerProfile,
			attributes: ['userId'],
			required: true,
		}],
		where: {
			latitude: { [Op.between]: [minLat, maxLat] },
			longitude: { [Op.between]: [minLng, maxLng] },
			[Op.and]: [
				Sequelize.where(
					Sequelize.literal(`ST_Distance_Sphere(POINT(longitude, latitude), POINT(${lng}, ${lat}))`),
					{ [Op.lte]: radiusM }
				)
			]
		},
	});

	const sellerIds = Array.from(new Set(
		nearbyStores.map((s: any) => s.SellerProfile?.userId).filter(Boolean)
	));

	if (geoSellerCache.size > 500) {
		geoSellerCache.clear();
	}
	geoSellerCache.set(cacheKey, {
		expiresAt: now + 60 * 1000, // 60s TTL
		sellerIds,
	});

	return sellerIds;
}

async function getStoreCategorySellerIds(storeCategory?: any): Promise<number[] | null> {
	if (!storeCategory) return null;

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
	if (requestedCategories.length === 0 || hasAll) {
		return null;
	}

	const orClauses = requestedCategories.map((cat) => {
		const escaped = cat.replace(/'/g, "\\'");
		return `JSON_CONTAINS(Store.storeCategory, '"${escaped}"') OR Store.storeCategory LIKE '%${escaped}%'`;
	});
	const allClause = `JSON_CONTAINS(Store.storeCategory, '"All"') OR Store.storeCategory LIKE '%All%' OR Store.storeCategory = 'All'`;
	const storeCondition = Sequelize.literal(`(${orClauses.join(" OR ")} OR ${allClause})`);

	const matchingStores = await Store.findAll({
		attributes: ['sellerId'],
		where: storeCondition,
		include: [{
			model: SellerProfile,
			attributes: ['userId'],
			required: true,
		}],
	});

	return matchingStores
		.map((s: any) => s.SellerProfile?.userId || s.sellerId)
		.filter(Boolean);
}

async function getStoreNameSellerIds(storeName?: string): Promise<number[] | null> {
	if (!storeName || !storeName.trim()) return null;
	const term = storeName.trim();
	const filterProfiles = await SellerProfile.findAll({
		where: {
			[Op.or]: [
				{ businessName: { [Op.like]: `%${term}%` } },
				{ '$Stores.storeName$': { [Op.like]: `%${term}%` } }
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
	return filterProfiles.map((p: any) => p.userId).filter(Boolean);
}

async function getQSellerIds(q?: string): Promise<number[]> {
	if (!q || !q.trim()) return [];
	const term = q.trim();
	const qProfiles = await SellerProfile.findAll({
		where: {
			[Op.or]: [
				{ businessName: { [Op.like]: `%${term}%` } },
				{ '$Stores.storeName$': { [Op.like]: `%${term}%` } }
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
	return qProfiles.map((p: any) => p.userId).filter(Boolean);
}

async function resolveCategoryIds(categoryId?: any, categoryIds?: any): Promise<number[] | null> {
	const catList = parseArrayParam(categoryId || categoryIds);
	if (catList.length === 0) return null;

	const allCategoryIds = new Set<number>();
	for (const catIdStr of catList) {
		const catId = Number(catIdStr);
		if (!isNaN(catId) && catId > 0) {
			const descendantIds = await getCategoryDescendants(catId);
			descendantIds.forEach((id) => allCategoryIds.add(id));
		}
	}

	return allCategoryIds.size > 0 ? Array.from(allCategoryIds) : null;
}

export const listProducts = async (opts: any) => {
	const {
		page = 1,
		limit = 20,
		q,
		categoryId,
		categoryIds,
		brand,
		brandName,
		size,
		sizes,
		color,
		colors,
		minPrice,
		maxPrice,
		priceRange,
		sort,
		storeName,
		storeCategory,
		userId, // Optional: to check wishlist status
		lat,
		lng,
	} = opts;

	const where: any = { isActive: true };

	// 1. Execute all independent pre-filter queries concurrently
	const [
		storeCategorySellerIds,
		qSellerIds,
		storeNameSellerIds,
		nearbySellerIds,
		categoryFilter
	] = await Promise.all([
		getStoreCategorySellerIds(storeCategory),
		getQSellerIds(q),
		getStoreNameSellerIds(storeName),
		getNearbySellerIds(lat, lng),
		resolveCategoryIds(categoryId, categoryIds),
	]);

	// 2. Intersect matching seller IDs from all active seller filters
	let candidateSellerIds: number[] | null = null;
	const applySellerIntersection = (ids: number[]) => {
		if (candidateSellerIds === null) {
			candidateSellerIds = ids;
		} else {
			candidateSellerIds = candidateSellerIds.filter((id) => ids.includes(id));
		}
	};

	if (storeCategorySellerIds !== null) applySellerIntersection(storeCategorySellerIds);
	if (storeNameSellerIds !== null) applySellerIntersection(storeNameSellerIds);
	if (nearbySellerIds !== null) applySellerIntersection(nearbySellerIds);

	if (candidateSellerIds !== null) {
		where.sellerId = { [Op.in]: candidateSellerIds };
	}

	// 5. Variant level filters: price range, size, color
	const sizeList = parseArrayParam(size || sizes);
	const colorList = parseArrayParam(color || colors);
	const { minPrice: finalMinPrice, maxPrice: finalMaxPrice } = parsePriceRange(
		priceRange,
		minPrice,
		maxPrice
	);

	// 3. Search query filters & natural language intent extraction (Fuzzy + Substring + Synonyms)
	let effectiveQ = q;
	let queryMinPrice = finalMinPrice;
	let queryMaxPrice = finalMaxPrice;

	if (q) {
		const expanded = expandSearchQuery(q);
		if (expanded.cleanQuery) {
			effectiveQ = expanded.cleanQuery;
		}
		if (expanded.maxPrice !== undefined && queryMaxPrice === undefined) {
			queryMaxPrice = expanded.maxPrice;
		}
		if (expanded.minPrice !== undefined && queryMinPrice === undefined) {
			queryMinPrice = expanded.minPrice;
		}
		if (expanded.detectedColors.length > 0 && colorList.length === 0) {
			colorList.push(...expanded.detectedColors);
		}

		// Collect terms for substring search:
		// 1) Primary query terms
		const primaryTerms = [effectiveQ];
		if (expanded.isFuzzyCorrected && expanded.correctedQuery && !primaryTerms.includes(expanded.correctedQuery)) {
			primaryTerms.push(expanded.correctedQuery);
		}
		for (const t of expanded.correctedTokens) {
			if (t.length >= 3 && !primaryTerms.includes(t)) {
				primaryTerms.push(t);
			}
		}

		// 2) Top product synonyms (up to 4 synonyms)
		const searchTerms = Array.from(new Set([...primaryTerms, ...expanded.synonyms.slice(0, 4)]));

		const orConditions: any[] = [];
		for (const term of searchTerms) {
			orConditions.push({ name: { [Op.like]: `%${term}%` } });
			orConditions.push({ description: { [Op.like]: `%${term}%` } });
			orConditions.push({ brand: { [Op.like]: `%${term}%` } });
		}
		if (qSellerIds.length > 0) {
			orConditions.push({ sellerId: { [Op.in]: qSellerIds } });
		}
		where[Op.or] = orConditions;
	}

	// 4. Brand filter
	const brandList = parseArrayParam(brandName || brand);
	if (brandList.length > 0) {
		where.brand = {
			[Op.or]: brandList.map((b) => ({ [Op.like]: `%${b}%` })),
		};
	}

	const variantWhere: any = { isActive: true };
	let hasVariantFilter = false;

	if (queryMinPrice !== undefined || queryMaxPrice !== undefined) {
		variantWhere.price = {};
		if (queryMinPrice !== undefined) variantWhere.price[Op.gte] = queryMinPrice;
		if (queryMaxPrice !== undefined) variantWhere.price[Op.lte] = queryMaxPrice;
		hasVariantFilter = true;
	}

	if (sizeList.length > 0) {
		variantWhere.size = { [Op.in]: sizeList };
		hasVariantFilter = true;
	}

	if (colorList.length > 0) {
		variantWhere.color = {
			[Op.or]: colorList.map((c) => ({ [Op.like]: `%${c}%` })),
		};
		hasVariantFilter = true;
	}

	// 6. Lean association graph (no heavy redundant 3-level category joins)
	const include: any = [
		{
			association: "variants",
			where: hasVariantFilter ? variantWhere : { isActive: true },
			required: hasVariantFilter,
			attributes: [
				"id", "productId", "sku", "size", "color", "price", "mrp",
				"stock", "isStock", "isActive", "isDefault", "images"
			],
		},
		{
			association: "categories",
			where: categoryFilter ? { id: { [Op.in]: categoryFilter } } : undefined,
			required: Boolean(categoryFilter),
			attributes: ["id", "name", "slug", "level", "parentId"],
			through: { attributes: [] },
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
						"pickup_address_id",
					],
					include: [
						{
							model: Store,
							required: false,
							attributes: ["storeName", "isSellerOpen", "openingDays", "openingTime", "closingTime"],
						},
						{
							model: VerifiedSellers,
							where: { is_active: true, status: "approved" },
							required: true,
							attributes: ["id", "status", "is_active"],
						}
					],
				},
			],
		},
	];

	// 7. Sort handling
	const order = buildProductSortOrder(sort, q);

	const products = await Product.findAndCountAll({
		where,
		include,
		limit: parseInt(limit),
		offset: (parseInt(page) - 1) * parseInt(limit),
		order,
		distinct: true,
	});

	// 8. Parallel wishlist and cart lookups
	let wishlistProductIds = new Set<number>();
	let cartVariantQtyMap = new Map<number, number>();

	if (userId && products.rows.length > 0) {
		const productIds = products.rows.map((p: any) => p.id);

		const [wishlistItems, cartItems] = await Promise.all([
			Wishlist.findAll({
				where: {
					userId,
					productId: { [Op.in]: productIds },
				},
				attributes: ["productId"],
				raw: true,
			}),
			(async () => {
				const cart = await Cart.findOne({ where: { userId }, attributes: ["id"], raw: true });
				if (!cart) return [];
				return CartItem.findAll({
					where: { cartId: cart.id },
					attributes: ["variantId", "qty"],
					raw: true,
				});
			})(),
		]);

		wishlistProductIds = new Set(wishlistItems.map((item: any) => item.productId));
		for (const item of cartItems as any[]) {
			if (item.variantId) {
				cartVariantQtyMap.set(item.variantId, item.qty);
			}
		}
	}

	// 9. Transform products to format expected by frontend
	const transformedProducts = products.rows.map((product: any) => {
		const variants = product.variants || [];
		const prices = variants.map((v: any) => v.price).filter((p: any) => p != null && !isNaN(p));
		const minPrice = prices.length > 0 ? Math.min(...prices) : null;
		const maxPrice = prices.length > 0 ? Math.max(...prices) : null;

		// Calculate maximum discount percentage across variants
		const discounts = variants.map((v: any) => {
			const mrp = Number(v.mrp);
			const price = Number(v.price);
			if (mrp && price && mrp > price) {
				return Math.round(((mrp - price) / mrp) * 100);
			}
			return 0;
		});
		const maxDiscount = discounts.length > 0 ? Math.max(...discounts) : 0;

		const sellerStores = product.seller?.SellerProfile?.Stores || [];
		const isSellerOpen = sellerStores.length > 0 ? sellerStores[0].isSellerOpen : true;
		let openingDays = sellerStores.length > 0 ? sellerStores[0].openingDays : [];
		if (typeof openingDays === "string") {
			try {
				openingDays = JSON.parse(openingDays);
			} catch {
				openingDays = [openingDays];
			}
		}
		if (!Array.isArray(openingDays)) {
			openingDays = openingDays ? [openingDays] : [];
		}
		const openingTime = sellerStores.length > 0 ? (sellerStores[0].openingTime ?? null) : null;
		const closingTime = sellerStores.length > 0 ? (sellerStores[0].closingTime ?? null) : null;

		const rawProduct = product.toJSON();
		const mappedVariants = (rawProduct.variants || []).map((v: any) => {
			const mrp = Number(v.mrp);
			const price = Number(v.price);
			const discountPercentage = mrp && price && mrp > price
				? Math.round(((mrp - price) / mrp) * 100)
				: 0;
			return {
				...v,
				discountPercentage,
				qty: cartVariantQtyMap.get(v.id) || 0,
			};
		});

		const allImages = mappedVariants.flatMap((v: any) => (Array.isArray(v.images) ? v.images : [])).filter(Boolean);

		return {
			...rawProduct,
			images: allImages,
			variants: mappedVariants,
			priceRange: {
				min: minPrice,
				max: maxPrice,
				maxDiscount,
			},
			discountPercentage: maxDiscount,
			isWishlisted: userId ? wishlistProductIds.has(product.id) : false,
			isSellerOpen,
			openingDays,
			openingTime,
			closingTime,
			seller: product.seller
				? {
					id: product.seller.id,
					phone_number: product.seller.phone_number,
					email: product.seller.email,
					isSellerOpen,
					openingDays,
					openingTime,
					closingTime,
					profile: (product.seller as any).SellerProfile
						? {
							businessName: (product.seller as any).SellerProfile.businessName,
							city: (product.seller as any).SellerProfile.city,
							state: (product.seller as any).SellerProfile.state,
							pickup_address_id: (product.seller as any).SellerProfile.pickup_address_id || null,
							isSellerOpen,
							openingDays,
							openingTime,
							closingTime,
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
			"pickup_address_id",
		],
		include: [
			{
				model: Store,
				required: false,
				attributes: ["storeName", "isSellerOpen", "openingDays", "openingTime", "closingTime"],
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
	let openingDays = sellerStores.length > 0 ? sellerStores[0].openingDays : [];
	if (typeof openingDays === "string") {
		try {
			openingDays = JSON.parse(openingDays);
		} catch {
			openingDays = [openingDays];
		}
	}
	if (!Array.isArray(openingDays)) {
		openingDays = openingDays ? [openingDays] : [];
	}
	const openingTime = sellerStores.length > 0 ? (sellerStores[0].openingTime ?? null) : null;
	const closingTime = sellerStores.length > 0 ? (sellerStores[0].closingTime ?? null) : null;

	const rawProduct = product.toJSON() as any;
	const mappedVariants = (rawProduct.variants || []).map((v: any) => ({
		...v,
		qty: cartVariantQtyMap.get(v.id) || 0,
	}));

	const allImages = mappedVariants.flatMap((v: any) => (Array.isArray(v.images) ? v.images : [])).filter(Boolean);

	return {
		...rawProduct,
		images: allImages,
		variants: mappedVariants,
		priceRange: {
			min: minPrice,
			max: maxPrice,
		},
		isWishlisted,
		isSellerOpen,
		openingDays,
		openingTime,
		closingTime,
		seller: (product as any).seller
			? {
				id: (product as any).seller.id,
				phone_number: (product as any).seller.phone_number,
				email: (product as any).seller.email,
				isSellerOpen,
				openingDays,
				openingTime,
				closingTime,
				profile: (product as any).seller?.SellerProfile
					? {
						businessName: (product as any).seller.SellerProfile.businessName,
						gstNumber: (product as any).seller.SellerProfile.gstNumber,
						address: (product as any).seller.SellerProfile.address,
						city: (product as any).seller.SellerProfile.city,
						state: (product as any).seller.SellerProfile.state,
						zipCode: (product as any).seller.SellerProfile.zipCode,
						phone: (product as any).seller.SellerProfile.phone,
						pickup_address_id: (product as any).seller.SellerProfile.pickup_address_id || null,
						isSellerOpen,
						openingDays,
						openingTime,
						closingTime,
					}
					: null,
			}
			: null,
	};
};
// Update product with seller ownership check
export const updateProduct = async (id: number, sellerId: number, payload: any) => {
	const t = await jiffy.transaction();
	try {
		if (payload.name) {
			payload.slug = await generateUniqueSlug(payload.name, t, id);
		}

		const {
			categories,
			variants,
			tags,
			isReturnable,
			isExchangeable,
			...rest
		} = payload;

		const updateData: any = { ...rest };
		if (tags !== undefined) updateData.tags = tags;
		if (isReturnable !== undefined) {
			updateData.isReturnable = typeof isReturnable === "string" ? isReturnable === "true" : Boolean(isReturnable);
		} else if (payload.is_returnable !== undefined) {
			updateData.isReturnable = typeof payload.is_returnable === "string" ? payload.is_returnable === "true" : Boolean(payload.is_returnable);
		}

		if (isExchangeable !== undefined) {
			updateData.isExchangeable = typeof isExchangeable === "string" ? isExchangeable === "true" : Boolean(isExchangeable);
		} else if (payload.is_exchangeable !== undefined) {
			updateData.isExchangeable = typeof payload.is_exchangeable === "string" ? payload.is_exchangeable === "true" : Boolean(payload.is_exchangeable);
		}

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
				if (variants.length > 0) {
					let hasDefault = false;
					for (const v of variants) {
						if (v.isDefault && !hasDefault) {
							hasDefault = true;
						} else {
							v.isDefault = false;
						}
					}
					if (!hasDefault) {
						variants[0].isDefault = true;
					}
				}

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

// Update product return and exchange flags
export const updateProductReturnExchange = async (
	id: number,
	sellerId: number,
	policy: {
		isReturnable?: boolean | string;
		isExchangeable?: boolean | string;
		is_returnable?: boolean | string;
		is_exchangeable?: boolean | string;
		isReturnExchangeable?: boolean | string;
		is_return_exchangeable?: boolean | string;
	}
) => {
	const product = await Product.findOne({ where: { id, sellerId } });
	if (!product) return null;

	const updateData: any = {};

	if (policy.isReturnExchangeable !== undefined) {
		const val = typeof policy.isReturnExchangeable === "string" ? policy.isReturnExchangeable === "true" : Boolean(policy.isReturnExchangeable);
		updateData.isReturnable = val;
		updateData.isExchangeable = val;
	} else if (policy.is_return_exchangeable !== undefined) {
		const val = typeof policy.is_return_exchangeable === "string" ? policy.is_return_exchangeable === "true" : Boolean(policy.is_return_exchangeable);
		updateData.isReturnable = val;
		updateData.isExchangeable = val;
	}

	if (policy.isReturnable !== undefined) {
		updateData.isReturnable = typeof policy.isReturnable === "string" ? policy.isReturnable === "true" : Boolean(policy.isReturnable);
	} else if (policy.is_returnable !== undefined) {
		updateData.isReturnable = typeof policy.is_returnable === "string" ? policy.is_returnable === "true" : Boolean(policy.is_returnable);
	}

	if (policy.isExchangeable !== undefined) {
		updateData.isExchangeable = typeof policy.isExchangeable === "string" ? policy.isExchangeable === "true" : Boolean(policy.isExchangeable);
	} else if (policy.is_exchangeable !== undefined) {
		updateData.isExchangeable = typeof policy.is_exchangeable === "string" ? policy.is_exchangeable === "true" : Boolean(policy.is_exchangeable);
	}

	await product.update(updateData);
	return await getProductById(id);
};

export const listSellerProducts = async (sellerId: number, opts: any) => {
	const {
		page = 1,
		limit = 20,
		q,
		categoryId,
		categoryIds,
		brand,
		brandName,
		size,
		sizes,
		color,
		colors,
		minPrice,
		maxPrice,
		priceRange,
		sort,
	} = opts;

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

	// Brand filter (supports brand, brandName, array, comma-separated, or JSON array)
	const brandList = parseArrayParam(brandName || brand);
	if (brandList.length > 0) {
		where.brand = {
			[Op.or]: brandList.map((b) => ({ [Op.like]: `%${b}%` })),
		};
	}

	// Category filtering - handle hierarchical categories (supports single or multiple IDs)
	let categoryFilter: any = null;
	const catList = parseArrayParam(categoryId || categoryIds);
	if (catList.length > 0) {
		const allCategoryIds = new Set<number>();
		for (const catIdStr of catList) {
			const catId = Number(catIdStr);
			if (!isNaN(catId) && catId > 0) {
				const descendantIds = await getCategoryDescendants(catId);
				descendantIds.forEach((id) => allCategoryIds.add(id));
			}
		}
		if (allCategoryIds.size > 0) {
			categoryFilter = Array.from(allCategoryIds);
		}
	}

	// Variant level filters: price range, size, color
	const sizeList = parseArrayParam(size || sizes);
	const colorList = parseArrayParam(color || colors);
	const { minPrice: finalMinPrice, maxPrice: finalMaxPrice } = parsePriceRange(
		priceRange,
		minPrice,
		maxPrice
	);

	const variantWhere: any = {};
	if (finalMinPrice !== undefined || finalMaxPrice !== undefined) {
		variantWhere.price = {};
		if (finalMinPrice !== undefined) variantWhere.price[Op.gte] = finalMinPrice;
		if (finalMaxPrice !== undefined) variantWhere.price[Op.lte] = finalMaxPrice;
	}

	if (sizeList.length > 0) {
		variantWhere.size = { [Op.in]: sizeList };
	}

	if (colorList.length > 0) {
		variantWhere.color = {
			[Op.or]: colorList.map((c) => ({ [Op.like]: `%${c}%` })),
		};
	}

	const hasVariantFilter = Object.keys(variantWhere).length > 0;

	// Include array
	const include: any = [
		{
			association: "variants",
			where: hasVariantFilter ? variantWhere : undefined,
			required: hasVariantFilter ? true : false,
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
	const order = buildProductSortOrder(sort, q);

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

		const allImages = variants.flatMap((v: any) => (Array.isArray(v.images) ? v.images : [])).filter(Boolean);

		return {
			...product.toJSON(),
			images: allImages,
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

export const setDefaultVariant = async (productId: number, variantId: number, sellerId: number) => {
	// Verify the product belongs to the seller
	const product = await Product.findOne({ where: { id: productId, sellerId } });
	if (!product) {
		return null;
	}

	const variant = await ProductVariant.findOne({ where: { id: variantId, productId } });
	if (!variant) {
		return null;
	}

	const t = await jiffy.transaction();
	try {
		// Set all variants to non-default
		await ProductVariant.update(
			{ isDefault: false },
			{ where: { productId }, transaction: t }
		);

		// Set the specified variant to default
		await variant.update({ isDefault: true }, { transaction: t });

		await t.commit();
		return await getProductById(productId);
	} catch (err) {
		await t.rollback();
		throw err;
	}
};

export interface SearchSuggestionItem {
	id: string | number;
	name: string;
	keyword: string;
	subtitle?: string | null;
	type: "product";
	image: string | null;
	targetQuery: string;
	categoryId?: number | null;
	categoryName?: string | null;
	minPrice?: number | null;
	maxPrice?: number | null;
	isSellerOpen?: boolean | null;
}

// OPTIMIZATION: In-memory TTL cache for auto-suggest (60s TTL, max 500 entries)
interface SuggestionCacheEntry {
	timestamp: number;
	data: SearchSuggestionItem[];
}
const SUGGESTIONS_CACHE_TTL_MS = 60_000;
const MAX_SUGGESTIONS_CACHE_SIZE = 500;
const suggestionsCache = new Map<string, SuggestionCacheEntry>();

function setSuggestionsCache(key: string, data: SearchSuggestionItem[]) {
	if (suggestionsCache.size >= MAX_SUGGESTIONS_CACHE_SIZE) {
		const oldest = suggestionsCache.keys().next().value;
		if (oldest !== undefined) suggestionsCache.delete(oldest);
	}
	suggestionsCache.set(key, { timestamp: Date.now(), data });
}

export const searchAll = async (q: string, lat?: number, lng?: number): Promise<SearchSuggestionItem[]> => {
	const rawQuery = String(q || '').trim();
	if (!rawQuery) {
		return [];
	}

	const hasGeo = lat != null && lng != null && !isNaN(lat) && !isNaN(lng);
	const cacheKey = `${rawQuery.toLowerCase()}#${hasGeo ? `${lat.toFixed(3)},${lng.toFixed(3)}` : 'global'}`;
	const cached = suggestionsCache.get(cacheKey);
	const now = Date.now();
	if (cached && (now - cached.timestamp) < SUGGESTIONS_CACHE_TTL_MS) {
		return cached.data;
	}

	// 1. Fully expand query with memoized fuzzy correction, synonyms, and intent
	const expanded = expandSearchQuery(rawQuery);
	const cleanQ = expanded.cleanQuery;
	const isFuzzyCorrected = expanded.isFuzzyCorrected;
	const correctedQuery = expanded.correctedQuery;
	const effectiveTerm = isFuzzyCorrected ? correctedQuery : cleanQ;
	const substringTerms = expanded.substringTerms;
	const synonyms = expanded.synonyms;

	const radiusKm = Number(process.env.DEFAULT_SEARCH_RADIUS_KM) || 10;
	const radiusM = radiusKm * 1000;

	// 2. OPTIMIZATION: Concurrently run nearby seller search & category matching in parallel
	const nearbyStoresPromise: Promise<number[] | null> = hasGeo
		? Store.findAll({
			attributes: ['id'],
			include: [{
				model: SellerProfile,
				attributes: ['userId'],
				required: true,
				include: [{
					model: VerifiedSellers,
					where: { is_active: true, status: "approved" },
					attributes: ['id'],
					required: true,
				}]
			}],
			where: Sequelize.where(
				Sequelize.literal(`ST_Distance_Sphere(POINT(longitude, latitude), POINT(${lng}, ${lat}))`),
				{ [Op.lte]: radiusM }
			),
			raw: true,
		}).then((stores: any[]) => stores.map((s: any) => s['SellerProfile.userId'] || s.SellerProfile?.userId).filter(Boolean))
		: Promise.resolve(null);

	const categoryWhere: any = {
		isActive: true,
		[Op.or]: substringTerms.map(term => ({ name: { [Op.like]: `%${term}%` } }))
	};

	const matchingCategoriesPromise = Category.findAll({
		where: categoryWhere,
		attributes: ['id', 'name'],
		limit: 6,
		raw: true,
	});

	const [nearbySellerIds, matchingCategories] = await Promise.all([
		nearbyStoresPromise,
		matchingCategoriesPromise
	]);

	// 3. OPTIMIZATION: Fast, index-friendly candidate product query
	// Exclude heavy 'description' TEXT column on auto-suggest keystrokes (searches 'name' & 'brand' only).
	const productWhere: any = { isActive: true };
	if (nearbySellerIds !== null) {
		productWhere.sellerId = { [Op.in]: nearbySellerIds };
	}

	const productOrConditions: any[] = [];
	for (let i = 0; i < substringTerms.length; i++) {
		const term = substringTerms[i];
		productOrConditions.push({ name: { [Op.like]: `%${term}%` } });
		productOrConditions.push({ brand: { [Op.like]: `%${term}%` } });
	}
	productWhere[Op.or] = productOrConditions;

	// If nearbySellerIds is already supplied, seller verification is already guaranteed by nearbyStores query!
	// If not supplied, use minimal lean seller inclusion
	const sellerInclude: any[] = nearbySellerIds !== null
		? []
		: [{
			association: "seller",
			required: true,
			attributes: ['id'],
			include: [{
				model: SellerProfile,
				required: true,
				attributes: ['userId'],
				include: [{
					model: VerifiedSellers,
					where: { is_active: true, status: "approved" },
					attributes: ['id'],
					required: true,
				}]
			}]
		}];

	const candidateProducts = await Product.findAll({
		where: productWhere,
		attributes: ['id', 'name', 'brand', 'tags', 'sellerId'],
		include: [
			...sellerInclude,
			{
				association: "categories",
				attributes: ['id', 'name'],
				through: { attributes: [] },
				required: false
			},
			{
				association: "variants",
				attributes: ['id', 'productId', 'price', 'images', 'isDefault'],
				where: { isActive: true },
				required: false
			}
		],
		limit: 25
	});

	// Helper to extract best display image from product
	const getProductImage = (p: any): string | null => {
		const variants = p.variants || [];
		const defVariant = variants.find((v: any) => v.isDefault && v.images && v.images.length > 0);
		if (defVariant && defVariant.images[0]) return defVariant.images[0];
		const anyVariantWithImg = variants.find((v: any) => v.images && v.images.length > 0);
		return anyVariantWithImg?.images?.[0] || null;
	};

	// Relevance ranker:
	// Exact/prefix match on clean query > corrected query > synonym match > others
	const lowerClean = cleanQ.toLowerCase();
	const lowerCorrected = correctedQuery.toLowerCase();
	const lowerSynonyms = synonyms.map(s => s.toLowerCase());

	const scoreProductRelevance = (p: any): number => {
		const name = (p.name || '').toLowerCase();
		const brand = (p.brand || '').toLowerCase();

		if (name === lowerClean || brand === lowerClean) return 100;
		if (name.startsWith(lowerClean) || brand.startsWith(lowerClean)) return 90;
		if (name.includes(lowerClean) || brand.includes(lowerClean)) return 80;

		if (isFuzzyCorrected) {
			if (name === lowerCorrected || brand === lowerCorrected) return 75;
			if (name.startsWith(lowerCorrected) || brand.startsWith(lowerCorrected)) return 70;
			if (name.includes(lowerCorrected) || brand.includes(lowerCorrected)) return 60;
		}

		for (let i = 0; i < lowerSynonyms.length; i++) {
			const syn = lowerSynonyms[i];
			if (name.includes(syn) || brand.includes(syn)) return 40;
		}

		return 10;
	};

	candidateProducts.sort((a, b) => scoreProductRelevance(b) - scoreProductRelevance(a));

	const suggestionsMap = new Map<string, SearchSuggestionItem>();

	const addSuggestion = (item: {
		keyword: string;
		subtitle?: string | null;
		image?: string | null;
		targetQuery?: string;
		categoryId?: number | null;
		categoryName?: string | null;
		minPrice?: number | null;
		maxPrice?: number | null;
	}) => {
		const cleanKeyword = item.keyword.trim();
		const key = cleanKeyword.toLowerCase();
		if (!key || suggestionsMap.has(key)) return;

		suggestionsMap.set(key, {
			id: `sug_${suggestionsMap.size + 1}`,
			name: cleanKeyword,
			keyword: cleanKeyword,
			subtitle: item.subtitle || null,
			type: "product",
			image: item.image || null,
			targetQuery: item.targetQuery || cleanKeyword,
			categoryId: item.categoryId ?? null,
			categoryName: item.categoryName ?? null,
			minPrice: item.minPrice ?? null,
			maxPrice: item.maxPrice ?? null,
			isSellerOpen: true
		});
	};

	const topFallbackImage = candidateProducts.length > 0 ? getProductImage(candidateProducts[0]) : null;

	// A. FUZZY SPELLING / "DID YOU MEAN" SUGGESTION (Placed at top if user made a typo!)
	if (isFuzzyCorrected) {
		addSuggestion({
			keyword: correctedQuery,
			subtitle: `Did you mean: "${correctedQuery}"?`,
			image: topFallbackImage,
			targetQuery: correctedQuery
		});
	}

	// B. CATEGORY CONTEXT SUGGESTIONS (Flipkart Top Row: e.g. "heel in Women's Footwear")
	for (let i = 0; i < matchingCategories.length; i++) {
		const cat = matchingCategories[i];
		const relatedProd = candidateProducts.find((p: any) =>
			(p.categories || []).some((c: any) => c.id === cat.id)
		);
		const catImage = relatedProd ? getProductImage(relatedProd) : topFallbackImage;

		addSuggestion({
			keyword: `${effectiveTerm} in ${cat.name}`,
			subtitle: `in ${cat.name}`,
			image: catImage,
			targetQuery: effectiveTerm,
			categoryId: cat.id,
			categoryName: cat.name
		});
	}

	// Also check categories attached to candidate products
	for (let i = 0; i < candidateProducts.length; i++) {
		const p = candidateProducts[i];
		const cats = (p as any).categories || [];
		for (let j = 0; j < cats.length; j++) {
			const cat = cats[j];
			const sugKey = `${effectiveTerm} in ${cat.name}`.toLowerCase();
			if (!suggestionsMap.has(sugKey)) {
				addSuggestion({
					keyword: `${effectiveTerm} in ${cat.name}`,
					subtitle: `in ${cat.name}`,
					image: getProductImage(p) || topFallbackImage,
					targetQuery: effectiveTerm,
					categoryId: cat.id,
					categoryName: cat.name
				});
			}
		}
	}

	// C. AUDIENCE & INTENT SUGGESTIONS (e.g. "heel for women", "shoes for men")
	const audienceTerms = [
		{ term: "women", label: "for women", subtitle: "Popular in Women" },
		{ term: "men", label: "for men", subtitle: "Popular in Men" },
		{ term: "kids", label: "for kids", subtitle: "Kids Collection" },
		{ term: "girls", label: "for girls", subtitle: "Girls Collection" },
		{ term: "boys", label: "for boys", subtitle: "Boys Collection" },
	];

	for (let i = 0; i < audienceTerms.length; i++) {
		const audience = audienceTerms[i];
		const matchedAudienceProd = candidateProducts.find((p: any) => {
			const pName = (p.name || '').toLowerCase();
			const pTags = Array.isArray(p.tags) ? p.tags.map((t: string) => String(t).toLowerCase()) : [];
			const pCatNames = ((p as any).categories || []).map((c: any) => (c.name || '').toLowerCase());
			return pName.includes(audience.term) || pTags.includes(audience.term) || pCatNames.some((cn: string) => cn.includes(audience.term));
		});

		if (matchedAudienceProd) {
			addSuggestion({
				keyword: `${effectiveTerm} ${audience.label}`,
				subtitle: audience.subtitle,
				image: getProductImage(matchedAudienceProd) || topFallbackImage,
				targetQuery: `${effectiveTerm} ${audience.label}`
			});
		}
	}

	// D. PRODUCT SYNONYMS SUGGESTIONS (Flipkart related keyword discovery)
	const topSynonyms = synonyms.slice(0, 3);
	for (let i = 0; i < topSynonyms.length; i++) {
		const syn = topSynonyms[i];
		const matchedSynProd = candidateProducts.find((p: any) => {
			const pName = (p.name || '').toLowerCase();
			return pName.includes(syn);
		});

		addSuggestion({
			keyword: syn,
			subtitle: `Related to "${cleanQ}"`,
			image: matchedSynProd ? getProductImage(matchedSynProd) : topFallbackImage,
			targetQuery: syn
		});
	}

	// E. BRAND-COMBINED SUGGESTIONS (e.g. "shoes puma", "heel bata")
	for (let i = 0; i < candidateProducts.length; i++) {
		const p = candidateProducts[i];
		const brandName = p.brand?.trim();
		if (brandName && brandName.toLowerCase() !== effectiveTerm.toLowerCase()) {
			const brandKeyword = `${effectiveTerm} ${brandName.toLowerCase()}`;
			addSuggestion({
				keyword: brandKeyword,
				subtitle: brandName,
				image: getProductImage(p) || topFallbackImage,
				targetQuery: brandKeyword
			});
		}
	}

	// F. DISTINCT PRODUCT TITLE / STYLE SUBSTRING SUGGESTIONS (e.g. "pencil heel", "block heel")
	for (let i = 0; i < candidateProducts.length; i++) {
		const p = candidateProducts[i];
		const rawName = p.name?.trim();
		if (rawName) {
			const pImage = getProductImage(p) || topFallbackImage;
			const pCatName = (p as any).categories?.[0]?.name;
			const subtitle = p.brand ? p.brand : (pCatName ? `in ${pCatName}` : "Trending Now");

			if (rawName.split(/\s+/).length <= 5) {
				addSuggestion({
					keyword: rawName,
					subtitle,
					image: pImage,
					targetQuery: rawName
				});
			} else {
				const words = rawName.split(/\s+/);
				const shortName = words.slice(0, 4).join(" ");
				addSuggestion({
					keyword: shortName,
					subtitle,
					image: pImage,
					targetQuery: shortName
				});
			}
		}
	}

	// G. PRICE INTENT SUGGESTIONS (e.g. "heel under 500", "heel under 1000")
	if (expanded.maxPrice !== undefined) {
		addSuggestion({
			keyword: `${effectiveTerm} under ${expanded.maxPrice}`,
			subtitle: `Under ₹${expanded.maxPrice}`,
			image: topFallbackImage,
			targetQuery: `${effectiveTerm} under ${expanded.maxPrice}`,
			maxPrice: expanded.maxPrice
		});
	} else {
		let hasUnder500 = false;
		let hasUnder1000 = false;
		let under500Image: string | null = null;
		let under1000Image: string | null = null;

		for (let i = 0; i < candidateProducts.length; i++) {
			const p = candidateProducts[i];
			const pVars = (p as any).variants || [];
			for (let j = 0; j < pVars.length; j++) {
				const price = Number(pVars[j].price);
				if (!isNaN(price)) {
					if (price <= 500 && !hasUnder500) {
						hasUnder500 = true;
						under500Image = getProductImage(p);
					}
					if (price <= 1000 && !hasUnder1000) {
						hasUnder1000 = true;
						under1000Image = getProductImage(p);
					}
				}
			}
		}

		if (hasUnder500) {
			addSuggestion({
				keyword: `${effectiveTerm} under 500`,
				subtitle: "Budget Friendly (Under ₹500)",
				image: under500Image || topFallbackImage,
				targetQuery: `${effectiveTerm} under 500`,
				maxPrice: 500
			});
		}
		if (hasUnder1000) {
			addSuggestion({
				keyword: `${effectiveTerm} under 1000`,
				subtitle: "Popular Choices Under ₹1000",
				image: under1000Image || topFallbackImage,
				targetQuery: `${effectiveTerm} under 1000`,
				maxPrice: 1000
			});
		}
	}

	// H. ALWAYS ENSURE DIRECT QUERY KEYWORD IS PRESENT
	if (!isFuzzyCorrected && !suggestionsMap.has(cleanQ.toLowerCase())) {
		addSuggestion({
			keyword: cleanQ,
			subtitle: "Search in all products",
			image: topFallbackImage,
			targetQuery: cleanQ
		});
	}

	// Cap at 12 high-quality suggestions
	const finalResults = Array.from(suggestionsMap.values()).slice(0, 12);

	// Cache the result
	setSuggestionsCache(cacheKey, finalResults);

	return finalResults;
};

