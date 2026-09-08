import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { UploadReceiptModal } from "@/components/items/upload-receipt-modal";

const mockUploadAndExtractReceipt = vi.fn();

vi.mock("@/app/items/upload-action", () => ({
  uploadAndExtractReceipt: (...args: unknown[]) =>
    mockUploadAndExtractReceipt(...args),
}));

describe("UploadReceiptModal Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not render when isOpen is false", () => {
    render(
      <UploadReceiptModal
        isOpen={false}
        onClose={vi.fn()}
        onExtracted={vi.fn()}
      />
    );

    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("renders dropzone and title when isOpen is true", () => {
    render(
      <UploadReceiptModal
        isOpen={true}
        onClose={vi.fn()}
        onExtracted={vi.fn()}
      />
    );

    expect(screen.getByRole("dialog")).toBeDefined();
    expect(screen.getByText("Upload Receipt")).toBeDefined();
    expect(
      screen.getByText(/Click to browse or drag & drop receipt/i)
    ).toBeDefined();
  });

  it("displays file preview when a file is dropped or selected", () => {
    render(
      <UploadReceiptModal
        isOpen={true}
        onClose={vi.fn()}
        onExtracted={vi.fn()}
      />
    );

    const input = screen.getByLabelText("Upload receipt file") as HTMLInputElement;

    const file = new File(["test-image"], "invoice.png", { type: "image/png" });
    fireEvent.change(input, { target: { files: [file] } });

    expect(screen.getByText("invoice.png")).toBeDefined();
    expect(screen.getByText(/Scan & Extract/i)).toBeDefined();
  });

  it("invokes uploadAndExtractReceipt and calls onExtracted on success", async () => {
    const handleExtracted = vi.fn();
    const handleClose = vi.fn();

    mockUploadAndExtractReceipt.mockResolvedValueOnce({
      success: true,
      data: {
        product_name: "Apple MacBook Pro M3",
        brand: "Apple",
        category: "Electronics",
        seller: "Apple Store",
        purchase_date: "2024-05-15",
        price: 199900,
        currency: "INR",
        warranty_months: 12,
        warranty_expiry_date: "2025-05-15",
        confidence: 0.98,
        warranty_inferred: false,
        requires_user_review: false,
      },
      receiptUrl: "https://example.com/receipt.png",
    });

    render(
      <UploadReceiptModal
        isOpen={true}
        onClose={handleClose}
        onExtracted={handleExtracted}
      />
    );

    const input = screen.getByLabelText("Upload receipt file") as HTMLInputElement;

    const file = new File(["test-image"], "invoice.png", { type: "image/png" });
    fireEvent.change(input, { target: { files: [file] } });

    const scanBtn = screen.getByText(/Scan & Extract/i);
    fireEvent.click(scanBtn);

    await waitFor(() => {
      expect(mockUploadAndExtractReceipt).toHaveBeenCalled();
      expect(handleExtracted).toHaveBeenCalledWith(
        expect.objectContaining({
          product_name: "Apple MacBook Pro M3",
          warranty_months: 12,
        }),
        "https://example.com/receipt.png"
      );
      expect(handleClose).toHaveBeenCalled();
    });
  });

  it("displays error banner when uploadAndExtractReceipt returns error", async () => {
    mockUploadAndExtractReceipt.mockResolvedValueOnce({
      success: false,
      error: "Vision AI model could not identify receipt content",
    });

    render(
      <UploadReceiptModal
        isOpen={true}
        onClose={vi.fn()}
        onExtracted={vi.fn()}
      />
    );

    const input = screen.getByLabelText("Upload receipt file") as HTMLInputElement;

    const file = new File(["test-image"], "invoice.png", { type: "image/png" });
    fireEvent.change(input, { target: { files: [file] } });

    const scanBtn = screen.getByText(/Scan & Extract/i);
    fireEvent.click(scanBtn);

    await waitFor(() => {
      expect(
        screen.getByText(/Vision AI model could not identify receipt content/i)
      ).toBeDefined();
    });
  });
});
