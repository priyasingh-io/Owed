import { describe, it, expect } from "vitest";
import { getDefaultWarrantyMonths, ITEM_CATEGORIES } from "@/lib/domain/categories";

describe("Category Warranty Defaults", () => {
  it("provides standard categories list", () => {
    expect(ITEM_CATEGORIES).toBeInstanceOf(Array);
    expect(ITEM_CATEGORIES).toContain("Electronics");
    expect(ITEM_CATEGORIES).toContain("Appliances");
  });

  it("returns 12 months for electronics", () => {
    expect(getDefaultWarrantyMonths("Electronics")).toBe(12);
    expect(getDefaultWarrantyMonths("electronics")).toBe(12);
  });

  it("returns 24 months for major appliances", () => {
    expect(getDefaultWarrantyMonths("Appliances")).toBe(24);
  });

  it("returns 3 months for apparel and footwear", () => {
    expect(getDefaultWarrantyMonths("Footwear")).toBe(3);
  });

  it("returns 12 months default fallback for unknown or null category", () => {
    expect(getDefaultWarrantyMonths("CustomCategory")).toBe(12);
    expect(getDefaultWarrantyMonths(null)).toBe(12);
    expect(getDefaultWarrantyMonths(undefined)).toBe(12);
  });
});
