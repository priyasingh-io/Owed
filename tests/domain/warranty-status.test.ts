import { describe, it, expect } from "vitest";
import { getItemStatus } from "@/lib/domain/warranty";

describe("getItemStatus", () => {
  const referenceDate = "2026-09-08";

  it("returns 'expired' when expiry date is before reference date", () => {
    expect(getItemStatus("2026-09-07", referenceDate)).toBe("expired");
    expect(getItemStatus("2025-12-31", referenceDate)).toBe("expired");
  });

  it("returns 'expiring_soon' when expiry date is today", () => {
    expect(getItemStatus("2026-09-08", referenceDate)).toBe("expiring_soon");
  });

  it("returns 'expiring_soon' when expiry date is within 30 days", () => {
    // 30 days from 2026-09-08 is 2026-10-08
    expect(getItemStatus("2026-09-15", referenceDate)).toBe("expiring_soon");
    expect(getItemStatus("2026-10-08", referenceDate)).toBe("expiring_soon");
  });

  it("returns 'active' when expiry date is more than 30 days away", () => {
    // 31 days from 2026-09-08 is 2026-10-09
    expect(getItemStatus("2026-10-09", referenceDate)).toBe("active");
    expect(getItemStatus("2027-01-01", referenceDate)).toBe("active");
  });

  it("returns 'active' if expiry date is null or invalid", () => {
    expect(getItemStatus(null, referenceDate)).toBe("active");
    expect(getItemStatus("invalid", referenceDate)).toBe("active");
  });
});
