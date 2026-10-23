/**
 * Search Query Parser Utility
 * 
 * Extracts search intent from user queries:
 * - Price bounds: "under 500", "below 500", "user 500" (speech-to-text typo for under),
 *   "less than 500", "upto 500", "sub 500", "above 500", "500 to 1000", etc.
 * - Color terms: "red", "blue", "black", etc.
 * - Clean tokens: normalized keywords for cross-field permutation matching.
 */

export interface ParsedSearchQuery {
  raw: string;
  cleanText: string;
  tokens: string[];
  minPrice?: number;
  maxPrice?: number;
  detectedColors: string[];
}

const COMMON_COLORS = new Set([
  "red", "blue", "green", "black", "white", "yellow", "pink", "orange",
  "purple", "grey", "gray", "brown", "beige", "maroon", "navy", "olive",
  "teal", "gold", "silver", "violet", "cyan", "magenta", "multicolor", "cream",
  "khaki", "burgundy", "charcoal", "coral", "peach", "lavender", "rust", "mustard"
]);

const STOP_WORDS = new Set([
  "in", "for", "at", "of", "the", "a", "an", "with", "from", "on", "by", "to", "and", "or"
]);

export function parseSearchQuery(query: string): ParsedSearchQuery {
  if (!query || typeof query !== "string") {
    return {
      raw: "",
      cleanText: "",
      tokens: [],
      detectedColors: []
    };
  }

  const raw = query.trim();
  let workingText = raw.toLowerCase();
  let minPrice: number | undefined;
  let maxPrice: number | undefined;

  // 1. Price Range: "500 to 1000", "500 - 1000", "between 500 and 1000"
  const rangeRegex = /(?:between\s+)?(?:rs\.?|inr\s*)?(\d+(?:\.\d+)?)\s*(?:-|to|and)\s*(?:rs\.?|inr\s*)?(\d+(?:\.\d+)?)(?:\s*(?:rs\.?|inr|bucks|\/-))?/i;
  const rangeMatch = workingText.match(rangeRegex);
  if (rangeMatch) {
    const val1 = parseFloat(rangeMatch[1]);
    const val2 = parseFloat(rangeMatch[2]);
    if (!isNaN(val1) && !isNaN(val2)) {
      minPrice = Math.min(val1, val2);
      maxPrice = Math.max(val1, val2);
      workingText = workingText.replace(rangeMatch[0], " ");
    }
  }

  // 2. Max Price: "under 500", "below 500", "user 500", "less than 500", "upto 500", "up to 500", "sub 500", "budget 500", "<= 500", "< 500", "within 500"
  // Note: "user 500" is a very common speech-to-text / autocorrect slip for "under 500" in mobile e-commerce
  const maxPriceRegex = /(?:under|below|less\s+than|user|upto|up\s+to|sub|budget|within|<=?)\s*(?:rs\.?|inr\s*)?(\d+(?:\.\d+)?)(?:\s*(?:rs\.?|inr|bucks|\/-))?/i;
  const maxMatch = workingText.match(maxPriceRegex);
  if (maxMatch) {
    const val = parseFloat(maxMatch[1]);
    if (!isNaN(val)) {
      maxPrice = val;
      workingText = workingText.replace(maxMatch[0], " ");
    }
  }

  // 2b. Reverse Max Price: "500 under", "500 se kam", "500 rs under", "500 below"
  const revMaxRegex = /(\d+(?:\.\d+)?)\s*(?:rs\.?|inr|bucks|\/-)?\s*(?:under|below|se\s+kam)/i;
  const revMaxMatch = workingText.match(revMaxRegex);
  if (revMaxMatch && maxPrice === undefined) {
    const val = parseFloat(revMaxMatch[1]);
    if (!isNaN(val)) {
      maxPrice = val;
      workingText = workingText.replace(revMaxMatch[0], " ");
    }
  }

  // 3. Min Price: "above 500", "over 500", "more than 500", ">= 500", "> 500"
  const minPriceRegex = /(?:above|over|more\s+than|>=?)\s*(?:rs\.?|inr\s*)?(\d+(?:\.\d+)?)(?:\s*(?:rs\.?|inr|bucks|\/-))?/i;
  const minMatch = workingText.match(minPriceRegex);
  if (minMatch) {
    const val = parseFloat(minMatch[1]);
    if (!isNaN(val)) {
      minPrice = val;
      workingText = workingText.replace(minMatch[0], " ");
    }
  }

  // 3b. Reverse Min Price: "500 above", "500 over", "500 se zyada"
  const revMinRegex = /(\d+(?:\.\d+)?)\s*(?:rs\.?|inr|bucks|\/-)?\s*(?:above|over|se\s+zyada|se\s+jyada)/i;
  const revMinMatch = workingText.match(revMinRegex);
  if (revMinMatch && minPrice === undefined) {
    const val = parseFloat(revMinMatch[1]);
    if (!isNaN(val)) {
      minPrice = val;
      workingText = workingText.replace(revMinMatch[0], " ");
    }
  }

  // Clean remaining text
  // Remove special symbols except alphanumeric, spaces, and hyphens (to preserve items like "t-shirt")
  const sanitized = workingText
    .replace(/[^\w\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  // Split into raw tokens
  const rawTokens = sanitized.split(" ").filter(t => t.length > 0);

  // Extract detected colors and meaningful search tokens
  const detectedColors: string[] = [];
  const tokens: string[] = [];

  for (const token of rawTokens) {
    if (COMMON_COLORS.has(token)) {
      detectedColors.push(token);
    }
    // Filter common stopwords unless it is the only token in the query
    if (!STOP_WORDS.has(token) || rawTokens.length === 1) {
      tokens.push(token);
    }
  }

  return {
    raw,
    cleanText: sanitized,
    tokens: tokens.length > 0 ? tokens : rawTokens,
    minPrice,
    maxPrice,
    detectedColors
  };
}
