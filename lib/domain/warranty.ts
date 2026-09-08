import { ItemStatus } from "@/lib/types/database";

/**
 * Calculate the warranty expiry date given a purchase date and warranty duration in months.
 * Formats as ISO date string (YYYY-MM-DD).
 */
export function calculateWarrantyExpiryDate(
  purchaseDate: string,
  warrantyMonths: number
): string | null {
  if (!purchaseDate || typeof purchaseDate !== "string") return null;
  if (!Number.isInteger(warrantyMonths) || warrantyMonths <= 0) return null;

  const parts = purchaseDate.split("-");
  if (parts.length !== 3) return null;

  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10); // 1-12
  const day = parseInt(parts[2], 10);

  if (isNaN(year) || isNaN(month) || isNaN(day) || month < 1 || month > 12 || day < 1 || day > 31) {
    return null;
  }

  // Validate the purchase date actually exists
  const origDate = new Date(Date.UTC(year, month - 1, day));
  if (
    origDate.getUTCFullYear() !== year ||
    origDate.getUTCMonth() !== month - 1 ||
    origDate.getUTCDate() !== day
  ) {
    return null;
  }

  // Calculate target month and year
  const totalMonths = (month - 1) + warrantyMonths;
  const targetYear = year + Math.floor(totalMonths / 12);
  const targetMonth = totalMonths % 12; // 0-11

  // Find max days in target month
  const maxDay = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate();
  const targetDay = Math.min(day, maxDay);

  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${targetYear}-${pad(targetMonth + 1)}-${pad(targetDay)}`;
}

/**
 * Determine the status of an item based on its warranty expiry date.
 * - 'expired': Expiry date is before today
 * - 'expiring_soon': Expiry date is within 30 days (inclusive of today)
 * - 'active': Expiry date is greater than 30 days away
 */
export function getItemStatus(
  expiryDate: string | null,
  referenceDateInput: string | Date = new Date()
): ItemStatus {
  if (!expiryDate || typeof expiryDate !== "string") {
    return "active";
  }

  const expiryParts = expiryDate.split("-");
  if (expiryParts.length !== 3) return "active";

  const expYear = parseInt(expiryParts[0], 10);
  const expMonth = parseInt(expiryParts[1], 10);
  const expDay = parseInt(expiryParts[2], 10);

  if (isNaN(expYear) || isNaN(expMonth) || isNaN(expDay)) return "active";

  const expiryUtc = Date.UTC(expYear, expMonth - 1, expDay);

  let refUtc: number;
  if (typeof referenceDateInput === "string") {
    const refParts = referenceDateInput.split("-");
    if (refParts.length !== 3) return "active";
    refUtc = Date.UTC(
      parseInt(refParts[0], 10),
      parseInt(refParts[1], 10) - 1,
      parseInt(refParts[2], 10)
    );
  } else {
    refUtc = Date.UTC(
      referenceDateInput.getUTCFullYear(),
      referenceDateInput.getUTCMonth(),
      referenceDateInput.getUTCDate()
    );
  }

  const msPerDay = 1000 * 60 * 60 * 24;
  const diffDays = Math.round((expiryUtc - refUtc) / msPerDay);

  if (diffDays < 0) {
    return "expired";
  } else if (diffDays <= 30) {
    return "expiring_soon";
  } else {
    return "active";
  }
}
