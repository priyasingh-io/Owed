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

export interface WarrantyProgress {
  percentageElapsed: number;
  daysRemaining: number;
  daysTotal: number;
  label: string;
}

/**
 * Calculates timeline progress for a warranty item.
 */
export function getWarrantyProgress(
  purchaseDate: string | null,
  expiryDate: string | null,
  referenceDateInput: string | Date = new Date()
): WarrantyProgress {
  if (!expiryDate) {
    return { percentageElapsed: 0, daysRemaining: 0, daysTotal: 0, label: "No expiry date" };
  }

  const expParts = expiryDate.split("-");
  if (expParts.length !== 3) {
    return { percentageElapsed: 0, daysRemaining: 0, daysTotal: 0, label: "Invalid date" };
  }

  const expUtc = Date.UTC(
    parseInt(expParts[0], 10),
    parseInt(expParts[1], 10) - 1,
    parseInt(expParts[2], 10)
  );

  let refUtc: number;
  if (typeof referenceDateInput === "string") {
    const refParts = referenceDateInput.split("-");
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
  const daysRemaining = Math.round((expUtc - refUtc) / msPerDay);

  let daysTotal = 365;
  if (purchaseDate) {
    const purchParts = purchaseDate.split("-");
    if (purchParts.length === 3) {
      const purchUtc = Date.UTC(
        parseInt(purchParts[0], 10),
        parseInt(purchParts[1], 10) - 1,
        parseInt(purchParts[2], 10)
      );
      daysTotal = Math.max(1, Math.round((expUtc - purchUtc) / msPerDay));
    }
  }

  if (daysRemaining < 0) {
    const overdue = Math.abs(daysRemaining);
    return {
      percentageElapsed: 100,
      daysRemaining,
      daysTotal,
      label: overdue === 1 ? "Expired yesterday" : `Expired ${overdue} days ago`,
    };
  }

  const elapsed = Math.max(0, daysTotal - daysRemaining);
  const percentageElapsed = Math.min(100, Math.max(0, Math.round((elapsed / daysTotal) * 100)));

  let label: string;
  if (daysRemaining === 0) {
    label = "Expires today";
  } else if (daysRemaining === 1) {
    label = "Expires tomorrow";
  } else if (daysRemaining <= 30) {
    label = `${daysRemaining} days left`;
  } else {
    const months = Math.round(daysRemaining / 30.4);
    label = `${months} ${months === 1 ? "month" : "months"} left`;
  }

  return {
    percentageElapsed,
    daysRemaining,
    daysTotal,
    label,
  };
}

/**
 * Formats an ISO YYYY-MM-DD date into human-readable e.g. "15 Mar 2025".
 */
export function formatDisplayDate(dateStr: string | null): string {
  if (!dateStr) return "Not specified";
  const parts = dateStr.split("-");
  if (parts.length !== 3) return dateStr;
  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  const mIndex = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  const year = parts[0];
  if (mIndex >= 0 && mIndex < 12) {
    return `${day} ${months[mIndex]} ${year}`;
  }
  return dateStr;
}

