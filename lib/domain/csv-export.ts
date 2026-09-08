import { Item } from "@/lib/types/database";

/**
 * Escapes a single CSV value following RFC 4180.
 * Wraps values containing commas, double quotes, or newlines in double quotes,
 * and escapes internal double quotes by doubling them ("").
 */
export function escapeCSVValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }

  const stringValue = String(value);

  if (
    stringValue.includes(",") ||
    stringValue.includes('"') ||
    stringValue.includes("\n") ||
    stringValue.includes("\r")
  ) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }

  return stringValue;
}

/**
 * Generates an RFC 4180 compliant CSV string from an array of Item objects.
 */
export function generateItemsCSV(items: Item[]): string {
  const headers = [
    "Product Name",
    "Brand",
    "Category",
    "Seller",
    "Purchase Date",
    "Price",
    "Currency",
    "Warranty Months",
    "Warranty Expiry Date",
    "Status",
    "Receipt URL",
  ];

  const rows = items.map((item) => [
    escapeCSVValue(item.product_name),
    escapeCSVValue(item.brand || ""),
    escapeCSVValue(item.category || ""),
    escapeCSVValue(item.seller || ""),
    escapeCSVValue(item.purchase_date || ""),
    escapeCSVValue(
      item.price !== null && item.price !== undefined ? item.price : ""
    ),
    escapeCSVValue(item.currency || "INR"),
    escapeCSVValue(
      item.warranty_months !== null && item.warranty_months !== undefined
        ? item.warranty_months
        : ""
    ),
    escapeCSVValue(item.warranty_expiry_date || ""),
    escapeCSVValue(item.status || ""),
    escapeCSVValue(item.receipt_file_url || ""),
  ]);

  return [headers.join(","), ...rows.map((row) => row.join(","))].join("\r\n");
}

/**
 * Triggers a client-side browser download of the items as a CSV file.
 * Adds UTF-8 BOM so Excel opens non-ASCII characters without encoding issues.
 */
export function downloadItemsCSV(items: Item[], filename?: string): void {
  if (typeof window === "undefined") return;

  const csvContent = generateItemsCSV(items);
  const blob = new Blob(["\uFEFF" + csvContent], {
    type: "text/csv;charset=utf-8;",
  });

  const dateStr = new Date().toISOString().split("T")[0];
  const downloadName = filename || `owed-warranties-${dateStr}.csv`;

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", downloadName);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
