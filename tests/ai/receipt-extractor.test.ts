import { describe, it, expect } from "vitest";
import {
  receiptExtractionSchema,
  processExtractionResult,
  ReceiptExtractionData,
} from "@/lib/ai/receipt-extractor";

describe("Receipt Extractor Schema & Enrichment", () => {
  it("validates well-formed extraction JSON", () => {
    const rawData = {
      product_name: "iPhone 15 Pro",
      brand: "Apple",
      category: "Electronics",
      seller: "Amazon",
      purchase_date: "2024-06-01",
      price: 134900,
      currency: "INR",
      warranty_months: 12,
      confidence: 0.95,
    };

    const parsed = receiptExtractionSchema.safeParse(rawData);
    expect(parsed.success).toBe(true);
  });

  it("enriches extraction with explicit warranty without inferring", () => {
    const raw: ReceiptExtractionData = {
      product_name: "LG Washing Machine",
      brand: "LG",
      category: "Appliances",
      seller: "Croma",
      purchase_date: "2024-01-10",
      price: 42000,
      currency: "INR",
      warranty_months: 24,
      confidence: 0.9,
    };

    const result = processExtractionResult(raw);
    expect(result.warranty_months).toBe(24);
    expect(result.warranty_inferred).toBe(false);
    expect(result.warranty_expiry_date).toBe("2026-01-10");
    expect(result.requires_user_review).toBe(false);
  });

  it("infers warranty from category fallback when receipt lacks warranty duration", () => {
    const raw: ReceiptExtractionData = {
      product_name: "Sony Soundbar",
      brand: "Sony",
      category: "Electronics",
      seller: "Reliance Digital",
      purchase_date: "2024-03-15",
      price: 18000,
      currency: "INR",
      warranty_months: null,
      confidence: 0.85,
    };

    const result = processExtractionResult(raw);
    expect(result.warranty_months).toBe(12); // Fallback for Electronics
    expect(result.warranty_inferred).toBe(true);
    expect(result.warranty_expiry_date).toBe("2025-03-15");
    expect(result.requires_user_review).toBe(false);
  });

  it("flags item for user review when confidence is below 0.7", () => {
    const raw: ReceiptExtractionData = {
      product_name: "Blurry Item Receipt",
      brand: null,
      category: "Other",
      seller: null,
      purchase_date: null,
      price: null,
      currency: "INR",
      warranty_months: null,
      confidence: 0.45,
    };

    const result = processExtractionResult(raw);
    expect(result.requires_user_review).toBe(true);
    expect(result.warranty_expiry_date).toBeNull();
  });
});
