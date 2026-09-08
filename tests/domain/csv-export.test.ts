import { describe, it, expect, vi } from "vitest";
import {
  escapeCSVValue,
  generateItemsCSV,
  downloadItemsCSV,
} from "@/lib/domain/csv-export";
import { Item } from "@/lib/types/database";

describe("CSV Export Utilities", () => {
  describe("escapeCSVValue", () => {
    it("returns empty string for null and undefined", () => {
      expect(escapeCSVValue(null)).toBe("");
      expect(escapeCSVValue(undefined)).toBe("");
    });

    it("returns simple strings and numbers without quotes", () => {
      expect(escapeCSVValue("MacBook")).toBe("MacBook");
      expect(escapeCSVValue(1234)).toBe("1234");
    });

    it("escapes values containing commas", () => {
      expect(escapeCSVValue("Apple, Inc.")).toBe('"Apple, Inc."');
    });

    it("escapes values containing quotes by doubling them", () => {
      expect(escapeCSVValue('MacBook Pro 16"')).toBe('"MacBook Pro 16"""');
    });

    it("escapes values containing newlines", () => {
      expect(escapeCSVValue("Line 1\nLine 2")).toBe('"Line 1\nLine 2"');
    });
  });

  describe("generateItemsCSV", () => {
    it("generates correct header row when items list is empty", () => {
      const csv = generateItemsCSV([]);
      expect(csv).toBe(
        "Product Name,Brand,Category,Seller,Purchase Date,Price,Currency,Warranty Months,Warranty Expiry Date,Status,Receipt URL"
      );
    });

    it("formats multiple items correctly into CSV rows", () => {
      const sampleItems: Item[] = [
        {
          id: "item-1",
          user_id: "user-1",
          product_name: 'MacBook Pro 16"',
          brand: "Apple",
          category: "Electronics",
          seller: "Apple Store, NY",
          purchase_date: "2024-03-15",
          price: 2499,
          currency: "USD",
          warranty_months: 12,
          warranty_expiry_date: "2025-03-15",
          status: "expired",
          receipt_file_url: null,
          extraction_confidence: 0.95,
          created_at: "2024-03-15T10:00:00Z",
          updated_at: "2024-03-15T10:00:00Z",
        },
        {
          id: "item-2",
          user_id: "user-1",
          product_name: "Coffee Maker",
          brand: null,
          category: "Appliances",
          seller: null,
          purchase_date: null,
          price: null,
          currency: "INR",
          warranty_months: null,
          warranty_expiry_date: null,
          status: "active",
          receipt_file_url: "https://example.com/receipt.pdf",
          extraction_confidence: null,
          created_at: "2025-01-01T10:00:00Z",
          updated_at: "2025-01-01T10:00:00Z",
        },
      ];

      const csv = generateItemsCSV(sampleItems);
      const lines = csv.split("\r\n");

      expect(lines.length).toBe(3);
      expect(lines[0]).toContain("Product Name,Brand,Category");
      expect(lines[1]).toContain('"MacBook Pro 16""",Apple,Electronics,"Apple Store, NY",2024-03-15,2499,USD,12,2025-03-15,expired,');
      expect(lines[2]).toContain('Coffee Maker,,Appliances,,,,INR,,,active,https://example.com/receipt.pdf');
    });
  });

  describe("downloadItemsCSV", () => {
    it("creates blob and link elements without error", () => {
      const clickSpy = vi
        .spyOn(HTMLAnchorElement.prototype, "click")
        .mockImplementation(() => {});
      const createObjectURLMock = vi
        .spyOn(URL, "createObjectURL")
        .mockReturnValue("blob:mock");
      const revokeObjectURLMock = vi
        .spyOn(URL, "revokeObjectURL")
        .mockReturnValue();

      downloadItemsCSV([], "test.csv");

      expect(clickSpy).toHaveBeenCalled();
      expect(createObjectURLMock).toHaveBeenCalled();
      expect(revokeObjectURLMock).toHaveBeenCalledWith("blob:mock");

      clickSpy.mockRestore();
      createObjectURLMock.mockRestore();
      revokeObjectURLMock.mockRestore();
    });
  });
});
