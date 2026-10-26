import { parseSearchQuery, ParsedSearchQuery } from "./searchQueryParser.js";

// ---------------------------------------------------------------------------
// OPTIMIZATION: High-performance Damerau-Levenshtein using flat Int32 buffers
// Eliminates 2D array allocations and avoids garbage collector churn in V8.
// ---------------------------------------------------------------------------

const MAX_WORD_BUFFER = 64;
const row0 = new Int32Array(MAX_WORD_BUFFER);
const row1 = new Int32Array(MAX_WORD_BUFFER);
const row2 = new Int32Array(MAX_WORD_BUFFER);

export function damerauLevenshteinDistance(source: string, target: string): number {
	const src = (source || "").toLowerCase().trim();
	const tgt = (target || "").toLowerCase().trim();
	const m = src.length;
	const n = tgt.length;

	if (m === 0) return n;
	if (n === 0) return m;

	// Fallback to dynamic allocation only for abnormally long inputs
	if (n >= MAX_WORD_BUFFER || m >= MAX_WORD_BUFFER) {
		return fallbackDamerauLevenshtein(src, tgt);
	}

	for (let j = 0; j <= n; j++) {
		row1[j] = j;
	}

	for (let i = 1; i <= m; i++) {
		row2[0] = i;
		const srcChar = src.charCodeAt(i - 1);

		for (let j = 1; j <= n; j++) {
			const cost = srcChar === tgt.charCodeAt(j - 1) ? 0 : 1;
			let minVal = Math.min(
				row1[j] + 1,        // deletion
				row2[j - 1] + 1,    // insertion
				row1[j - 1] + cost  // substitution
			);

			// Transposition check
			if (
				i > 1 &&
				j > 1 &&
				srcChar === tgt.charCodeAt(j - 2) &&
				src.charCodeAt(i - 2) === tgt.charCodeAt(j - 1)
			) {
				minVal = Math.min(minVal, row0[j - 2] + cost);
			}

			row2[j] = minVal;
		}

		// Rotate rows: row0 <- row1, row1 <- row2
		row0.set(row1);
		row1.set(row2);
	}

	return row1[n];
}

function fallbackDamerauLevenshtein(src: string, tgt: string): number {
	const m = src.length;
	const n = tgt.length;
	const d: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));

	for (let i = 0; i <= m; i++) d[i][0] = i;
	for (let j = 0; j <= n; j++) d[0][j] = j;

	for (let i = 1; i <= m; i++) {
		for (let j = 1; j <= n; j++) {
			const cost = src[i - 1] === tgt[j - 1] ? 0 : 1;
			d[i][j] = Math.min(
				d[i - 1][j] + 1,
				d[i][j - 1] + 1,
				d[i - 1][j - 1] + cost
			);
			if (i > 1 && j > 1 && src[i - 1] === tgt[j - 2] && src[i - 2] === tgt[j - 1]) {
				d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + cost);
			}
		}
	}
	return d[m][n];
}

export function stringSimilarity(a: string, b: string): number {
	const maxLen = Math.max(a.length, b.length);
	if (maxLen === 0) return 1.0;
	const distance = damerauLevenshteinDistance(a, b);
	return Math.max(0, (maxLen - distance) / maxLen);
}

// ---------------------------------------------------------------------------
// E-COMMERCE PRODUCT SYNONYMS DICTIONARY
// ---------------------------------------------------------------------------

const SYNONYM_GROUPS: string[][] = [
	// Footwear & Heels
	["heel", "heels", "high heel", "high heels", "pencil heel", "block heel", "kitten heel", "pumps", "stilettos", "wedges"],
	["shoe", "shoes", "sneaker", "sneakers", "footwear", "kicks", "loafers", "boots", "running shoes", "trainer", "trainers"],
	["sandal", "sandals", "slipper", "slippers", "chappal", "chappals", "flip flop", "flip flops", "slides", "flats", "kolhapuri"],
	["formal shoes", "derby", "oxford", "brogues", "monk strap"],
	["boots", "ankle boots", "leather boots"],

	// Tops & Shirts
	["shirt", "shirts", "formal shirt", "casual shirt", "button down", "polo", "polo shirt"],
	["tshirt", "t-shirt", "tshirts", "t-shirts", "tee", "tees", "top", "tops", "crop top", "tunic"],
	["hoodie", "hoodies", "sweatshirt", "sweatshirts", "sweater", "sweaters", "pullover", "cardigan", "jacket", "coat", "blazer"],
	["jacket", "jackets", "bomber jacket", "denim jacket", "leather jacket", "windcheater", "coat", "blazer"],

	// Bottoms & Pants
	["jeans", "jean", "denim", "denims", "skinny jeans", "wide leg jeans"],
	["pants", "pant", "trousers", "trouser", "chinos", "bottoms", "slacks"],
	["shorts", "bermudas", "half pant"],
	["trackpants", "track pants", "joggers", "sweatpants", "cargo", "cargos", "cargo pants"],
	["leggings", "jeggings", "tights"],

	// Dresses & Women's Ethnic
	["dress", "dresses", "frock", "gown", "one piece", "maxi dress", "bodycon"],
	["kurti", "kurtis", "kurta", "kurtas", "tunic", "ethnic wear"],
	["saree", "sari", "sarees", "saris"],
	["lehenga", "ghagra", "chaniya choli"],
	["suit", "salwar", "salwar suit", "anarkali"],
	["skirt", "mini skirt", "midi skirt", "pleated skirt"],

	// Bags & Accessories
	["bag", "bags", "handbag", "handbags", "purse", "purses", "tote", "tote bag", "shoulder bag", "clutch", "sling bag"],
	["backpack", "backpacks", "rucksack", "school bag", "college bag", "laptop bag"],
	["wallet", "wallets", "money clip", "card holder"],
	["watch", "watches", "smartwatch", "smart watch", "wrist watch", "timepiece"],
	["sunglasses", "shades", "goggles", "glasses", "eyewear", "specs", "spectacles"],
	["belt", "belts", "leather belt"],
	["cap", "hat", "caps", "hats", "beanie"],

	// Jewelry
	["earrings", "ear rings", "jhumka", "jhumkas", "studs", "hoops", "danglers"],
	["necklace", "necklaces", "chain", "chains", "pendant", "choker", "mangalsutra"],
	["bracelet", "bracelets", "bangle", "bangles", "kada"],
	["ring", "rings", "finger ring"],

	// Electronics & Gadgets
	["phone", "mobile", "smartphone", "cellphone"],
	["earphones", "headphones", "earbuds", "airpods", "tws", "headset", "neckband"],
	["charger", "adapter", "charging cable", "cable", "type-c cable", "lightning cable"],
	["powerbank", "power bank", "portable charger"],

	// Beauty & Fragrance
	["perfume", "perfumes", "deodorant", "deo", "fragrance", "cologne", "body spray", "attar", "scent"],
	["lipstick", "lip stick", "lip gloss", "lip balm", "lip shade", "liquid lipstick"],
	["kajal", "kohl", "eyeliner", "mascara"],
	["shampoo", "hair cleanser", "conditioner"],
	["face wash", "facewash", "cleanser", "face scrub"]
];

const SYNONYM_MAP = new Map<string, string[]>();
const VOCABULARY = new Set<string>();
// OPTIMIZATION: Index vocabulary by string length for O(1) candidate filtering
const VOCABULARY_BY_LENGTH = new Map<number, string[]>();

for (const group of SYNONYM_GROUPS) {
	for (const term of group) {
		const lower = term.toLowerCase().trim();
		VOCABULARY.add(lower);

		for (const sub of lower.split(/\s+/)) {
			if (sub.length > 2) VOCABULARY.add(sub);
		}

		const existing = SYNONYM_MAP.get(lower) || [];
		const others = group.map(g => g.toLowerCase().trim()).filter(g => g !== lower);
		SYNONYM_MAP.set(lower, Array.from(new Set([...existing, ...others])));
	}
}

const EXTRA_VOCABULARY = [
	"men", "women", "kids", "boys", "girls", "unisex", "baby", "infant",
	"cotton", "silk", "denim", "leather", "linen", "polyester", "wool",
	"black", "white", "blue", "red", "yellow", "green", "pink", "grey", "gray",
	"casual", "formal", "party", "sports", "running", "walking", "gym",
	"nike", "puma", "adidas", "bata", "woodland", "reebok", "levis", "zara",
	"sparkx", "campus", "crocs", "catwalk", "metro", "allen solly", "roadster"
];
for (const word of EXTRA_VOCABULARY) {
	VOCABULARY.add(word.toLowerCase());
}

// Populate length index
for (const word of VOCABULARY) {
	const len = word.length;
	const list = VOCABULARY_BY_LENGTH.get(len) || [];
	list.push(word);
	VOCABULARY_BY_LENGTH.set(len, list);
}

// OPTIMIZATION: In-memory bounded LRU memoization caches
const MAX_CACHE_SIZE = 1000;
const fuzzyCache = new Map<string, { corrected: string; distance: number } | null>();
const expandCache = new Map<string, ExpandedSearchContext>();

function setCacheEntry<K, V>(map: Map<K, V>, key: K, val: V) {
	if (map.size >= MAX_CACHE_SIZE) {
		// Evict oldest entry (first key in map iterator)
		const oldest = map.keys().next().value;
		if (oldest !== undefined) map.delete(oldest);
	}
	map.set(key, val);
}

export function getProductSynonyms(term: string): string[] {
	if (!term) return [];
	return SYNONYM_MAP.get(term.toLowerCase().trim()) || [];
}

/**
 * Finds the closest vocabulary term for a typo using indexed length pruning.
 */
export function fuzzyCorrectToken(token: string): { corrected: string; distance: number } | null {
	const word = token.toLowerCase().trim();
	if (!word || word.length < 3) return null;

	if (VOCABULARY.has(word)) {
		return { corrected: word, distance: 0 };
	}

	if (fuzzyCache.has(word)) {
		return fuzzyCache.get(word)!;
	}

	let maxAllowedDistance = 1;
	if (word.length >= 6) {
		maxAllowedDistance = 2;
	} else if (word.length <= 3) {
		maxAllowedDistance = 0;
	}

	if (maxAllowedDistance === 0) {
		setCacheEntry(fuzzyCache, word, null);
		return null;
	}

	let bestMatch: string | null = null;
	let lowestDistance = Infinity;

	// OPTIMIZATION: Only search candidates within [len - maxAllowedDistance, len + maxAllowedDistance]
	const minLen = Math.max(3, word.length - maxAllowedDistance);
	const maxLen = word.length + maxAllowedDistance;

	for (let l = minLen; l <= maxLen; l++) {
		const candidates = VOCABULARY_BY_LENGTH.get(l);
		if (!candidates) continue;

		for (let i = 0; i < candidates.length; i++) {
			const candidate = candidates[i];
			const distance = damerauLevenshteinDistance(word, candidate);
			if (distance <= maxAllowedDistance && distance < lowestDistance) {
				lowestDistance = distance;
				bestMatch = candidate;
				if (distance === 1) break;
			}
		}
		if (lowestDistance === 1) break;
	}

	const result = (bestMatch && lowestDistance <= maxAllowedDistance)
		? { corrected: bestMatch, distance: lowestDistance }
		: null;

	setCacheEntry(fuzzyCache, word, result);
	return result;
}

// ---------------------------------------------------------------------------
// EXPANDED SEARCH QUERY
// ---------------------------------------------------------------------------

export interface ExpandedSearchContext {
	rawQuery: string;
	cleanQuery: string;
	correctedQuery: string;
	isFuzzyCorrected: boolean;
	originalTokens: string[];
	correctedTokens: string[];
	synonyms: string[];
	allSearchTerms: string[];
	substringTerms: string[];
	minPrice?: number;
	maxPrice?: number;
	detectedColors: string[];
}

export function expandSearchQuery(rawQuery: string): ExpandedSearchContext {
	const raw = String(rawQuery || "").trim();
	if (!raw) {
		return {
			rawQuery: "",
			cleanQuery: "",
			correctedQuery: "",
			isFuzzyCorrected: false,
			originalTokens: [],
			correctedTokens: [],
			synonyms: [],
			allSearchTerms: [],
			substringTerms: [],
			detectedColors: []
		};
	}

	const cacheKey = raw.toLowerCase();
	if (expandCache.has(cacheKey)) {
		return expandCache.get(cacheKey)!;
	}

	const parsed: ParsedSearchQuery = parseSearchQuery(raw);
	const cleanQuery = parsed.cleanText || raw;
	const originalTokens = (parsed.tokens && parsed.tokens.length > 0)
		? parsed.tokens
		: cleanQuery.toLowerCase().split(/\s+/).filter(Boolean);

	// 1. Fuzzy token correction
	let isFuzzyCorrected = false;
	const correctedTokens: string[] = [];

	for (const token of originalTokens) {
		const fuzzy = fuzzyCorrectToken(token);
		if (fuzzy && fuzzy.distance > 0) {
			correctedTokens.push(fuzzy.corrected);
			isFuzzyCorrected = true;
		} else {
			correctedTokens.push(token);
		}
	}

	const correctedQuery = correctedTokens.join(" ");

	// 2. Synonym expansion
	const synonymSet = new Set<string>();

	const phraseSynonyms = getProductSynonyms(cleanQuery);
	for (let i = 0; i < phraseSynonyms.length; i++) synonymSet.add(phraseSynonyms[i]);

	if (isFuzzyCorrected) {
		const correctedPhraseSynonyms = getProductSynonyms(correctedQuery);
		for (let i = 0; i < correctedPhraseSynonyms.length; i++) synonymSet.add(correctedPhraseSynonyms[i]);
	}

	for (let i = 0; i < originalTokens.length; i++) {
		const tokenSynonyms = getProductSynonyms(originalTokens[i]);
		for (let j = 0; j < tokenSynonyms.length; j++) synonymSet.add(tokenSynonyms[j]);
	}

	if (isFuzzyCorrected) {
		for (let i = 0; i < correctedTokens.length; i++) {
			const tokenSynonyms = getProductSynonyms(correctedTokens[i]);
			for (let j = 0; j < tokenSynonyms.length; j++) synonymSet.add(tokenSynonyms[j]);
		}
	}

	synonymSet.delete(cleanQuery.toLowerCase());
	synonymSet.delete(correctedQuery.toLowerCase());
	const synonyms = Array.from(synonymSet);

	// 3. Consolidated unique search terms
	const allTermsSet = new Set<string>();
	if (cleanQuery) allTermsSet.add(cleanQuery);
	if (isFuzzyCorrected && correctedQuery) allTermsSet.add(correctedQuery);
	for (let i = 0; i < correctedTokens.length; i++) allTermsSet.add(correctedTokens[i]);
	for (let i = 0; i < synonyms.length; i++) allTermsSet.add(synonyms[i]);

	// 4. Substring patterns for SQL LIKE (%term%)
	// Primary query, corrected query, unique tokens (>=2 chars), and top 3 synonyms
	const substringTermsSet = new Set<string>();
	if (cleanQuery) substringTermsSet.add(cleanQuery);
	if (correctedQuery) substringTermsSet.add(correctedQuery);
	for (let i = 0; i < correctedTokens.length; i++) {
		if (correctedTokens[i].length >= 2) substringTermsSet.add(correctedTokens[i]);
	}
	const topSynonyms = synonyms.slice(0, 3);
	for (let i = 0; i < topSynonyms.length; i++) {
		if (topSynonyms[i].length >= 3) substringTermsSet.add(topSynonyms[i]);
	}

	const result: ExpandedSearchContext = {
		rawQuery: raw,
		cleanQuery,
		correctedQuery: isFuzzyCorrected ? correctedQuery : cleanQuery,
		isFuzzyCorrected,
		originalTokens,
		correctedTokens,
		synonyms,
		allSearchTerms: Array.from(allTermsSet),
		substringTerms: Array.from(substringTermsSet),
		minPrice: parsed.minPrice,
		maxPrice: parsed.maxPrice,
		detectedColors: parsed.detectedColors
	};

	setCacheEntry(expandCache, cacheKey, result);
	return result;
}
