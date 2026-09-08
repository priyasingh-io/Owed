import { describe, it, expect } from "vitest";
import { itemCreateSchema } from "@/lib/validation/item";

describe("Item Validation Schema", () => {
  it("validates a complete valid item", () => {
    const input = {
      product_name: "MacBook Pro M3",
      brand: "Apple",
      category: "Electronics",
      seller: "Amazon",
      purchase_date: "2024-05-10",
      price: 199900,
      currency: "INR",
      warranty_months: 12,
      warranty_expiry_date: "2025-05-10",
    };

    const parsed = itemCreateSchema.safeParse(input);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.product_name).toBe("MacBook Pro M3");
      expect(parsed.data.currency).toBe("INR");
    }
  });

  it("fails if product_name is empty or missing", () => {
    const invalid = {
      product_name: "",
    };

    const parsed = itemCreateSchema.safeParse(invalid);
    expect(parsed.success).toBe(false);
  });

  it("applies default currency INR when omitted", () => {
    const input = {
      product_name: "Sony Headphones",
    };

    const parsed = itemCreateSchema.safeParse(input);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.currency).toBe("INR");
    }
  });

  it("rejects negative price", () => {
    const invalid = {
      product_name: "Microwave Oven",
      price: -500,
    };

    const parsed = itemCreateSchema.safeParse(invalid);
    expect(parsed.success).toBe(false);
  });

  it("rejects invalid date formats", () => {
    const invalid = {
      product_name: "Office Chair",
      purchase_date: "10/05/2024", // not YYYY-MM-DD
    };

    const parsed = itemCreateSchema.safeParse(invalid);
    expect(parsed.success).toBe(false);
  });
});
