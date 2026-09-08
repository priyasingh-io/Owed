/**
 * Standard item categories and fallback warranty durations.
 * Defined in accordance with TRD §4.1 and §6.
 */

export const CATEGORY_WARRANTY_DEFAULTS: Record<string, number> = {
  electronics: 12,
  appliances: 24,
  "mobile & computing": 12,
  furniture: 12,
  "watches & jewelry": 24,
  footwear: 3,
  apparel: 3,
  automotive: 12,
  "tools & hardware": 12,
  fitness: 12,
};

export const ITEM_CATEGORIES = [
  "Electronics",
  "Appliances",
  "Mobile & Computing",
  "Furniture",
  "Watches & Jewelry",
  "Footwear",
  "Apparel",
  "Automotive",
  "Tools & Hardware",
  "Fitness",
  "Other",
] as const;

export type ItemCategory = (typeof ITEM_CATEGORIES)[number];

const DEFAULT_FALLBACK_MONTHS = 12;

/**
 * Returns default warranty duration in months for a given category name.
 * Performs case-insensitive matching and falls back to 12 months.
 */
export function getDefaultWarrantyMonths(category?: string | null): number {
  if (!category || typeof category !== "string") {
    return DEFAULT_FALLBACK_MONTHS;
  }

  const normalized = category.trim().toLowerCase();
  return CATEGORY_WARRANTY_DEFAULTS[normalized] ?? DEFAULT_FALLBACK_MONTHS;
}
