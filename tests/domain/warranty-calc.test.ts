import { describe, it, expect } from "vitest";
import { calculateWarrantyExpiryDate } from "@/lib/domain/warranty";

describe("calculateWarrantyExpiryDate", () => {
  it("calculates expiry date correctly for standard 12-month warranty", () => {
    const result = calculateWarrantyExpiryDate("2024-01-15", 12);
    expect(result).toBe("2025-01-15");
  });

  it("calculates expiry date across year boundary for 6 months", () => {
    const result = calculateWarrantyExpiryDate("2024-08-10", 6);
    expect(result).toBe("2025-02-10");
  });

  it("handles month overflow correctly when target month has fewer days", () => {
    // 2023-08-31 + 6 months -> February 2024 (leap year -> Feb 29)
    const result = calculateWarrantyExpiryDate("2023-08-31", 6);
    expect(result).toBe("2024-02-29");
  });

  it("returns null if purchase date is invalid", () => {
    const result = calculateWarrantyExpiryDate("invalid-date", 12);
    expect(result).toBeNull();
  });

  it("returns null if warranty months is negative or zero", () => {
    expect(calculateWarrantyExpiryDate("2024-01-15", 0)).toBeNull();
    expect(calculateWarrantyExpiryDate("2024-01-15", -5)).toBeNull();
  });
});
