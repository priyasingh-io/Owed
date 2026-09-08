import { z } from "zod";
import { getDefaultWarrantyMonths } from "@/lib/domain/categories";
import { calculateWarrantyExpiryDate } from "@/lib/domain/warranty";

/**
 * Structured schema for AI vision receipt extraction (TRD §4.1).
 */
export const receiptExtractionSchema = z.object({
  product_name: z.string().describe("Name of the purchased product or appliance"),
  brand: z.string().nullable().describe("Brand or manufacturer (e.g. Apple, Sony, Samsung)"),
  category: z.string().describe("Product category (e.g. Electronics, Appliances, Footwear)"),
  seller: z.string().nullable().describe("Store or retailer where item was bought (e.g. Amazon, Croma, Apple Store)"),
  purchase_date: z
    .string()
    .nullable()
    .describe("Purchase date formatted strictly as YYYY-MM-DD, or null if unreadable"),
  price: z.number().nullable().describe("Total purchase price paid"),
  currency: z.string().default("INR").describe("Currency symbol or code (e.g. INR, USD)"),
  warranty_months: z
    .number()
    .int()
    .nullable()
    .describe("Explicit warranty period in months stated on receipt, or null if not stated"),
  confidence: z
    .number()
    .min(0)
    .max(1)
    .describe("Model confidence score between 0.0 and 1.0 for extraction accuracy"),
});

export type ReceiptExtractionData = z.infer<typeof receiptExtractionSchema>;

export interface EnrichedExtractionResult extends ReceiptExtractionData {
  warranty_inferred: boolean;
  warranty_expiry_date: string | null;
  requires_user_review: boolean;
}

export const EXTRACTION_SYSTEM_PROMPT = `You are an expert financial and receipt audit assistant.
Your job is to analyze the provided image or PDF receipt and extract purchase and warranty metadata.
Rules:
1. Extract the product name, brand, store/seller, and purchase date (YYYY-MM-DD).
2. If warranty months are explicitly mentioned (e.g., "1 Year Warranty" -> 12, "2 Years" -> 24), extract it.
3. If warranty is NOT mentioned, set warranty_months to null.
4. Estimate your overall extraction confidence from 0.0 to 1.0 based on image legibility.`;

/**
 * Post-processes raw extraction output according to TRD §4.1:
 * - If warranty_months is null, applies category fallback lookup and marks inferred.
 * - Computes warranty_expiry_date = purchase_date + warranty_months.
 * - Flags confidence < 0.7 for user review.
 */
export function processExtractionResult(
  raw: ReceiptExtractionData
): EnrichedExtractionResult {
  let warrantyMonths = raw.warranty_months;
  let warrantyInferred = false;

  if (warrantyMonths === null || warrantyMonths === undefined || warrantyMonths <= 0) {
    warrantyMonths = getDefaultWarrantyMonths(raw.category);
    warrantyInferred = true;
  }

  let expiryDate: string | null = null;
  if (raw.purchase_date && warrantyMonths) {
    expiryDate = calculateWarrantyExpiryDate(raw.purchase_date, warrantyMonths);
  }

  const requiresUserReview = raw.confidence < 0.7;

  return {
    ...raw,
    warranty_months: warrantyMonths,
    warranty_inferred: warrantyInferred,
    warranty_expiry_date: expiryDate,
    requires_user_review: requiresUserReview,
  };
}
