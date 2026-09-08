import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ItemFormModal } from "@/components/items/item-form-modal";

// Mock Server Actions
const mockCreateItem = vi.fn();
const mockUpdateItem = vi.fn();

vi.mock("@/app/items/actions", () => ({
  createItem: (...args: unknown[]) => mockCreateItem(...args),
  updateItem: (...args: unknown[]) => mockUpdateItem(...args),
}));

describe("ItemFormModal Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not render when isOpen is false", () => {
    render(
      <ItemFormModal
        isOpen={false}
        onClose={vi.fn()}
      />
    );

    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("renders with default values for new item when isOpen is true", () => {
    render(
      <ItemFormModal
        isOpen={true}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByRole("dialog")).toBeDefined();
    expect(screen.getByText("Add Item Manually")).toBeDefined();
    expect(screen.getByPlaceholderText("e.g. Sony WH-1000XM5")).toBeDefined();

    // Default category is Electronics (12 months)
    const categorySelect = screen.getByLabelText("Category") as HTMLSelectElement;
    expect(categorySelect.value).toBe("Electronics");

    const durationInput = screen.getByPlaceholderText("12") as HTMLInputElement;
    expect(durationInput.value).toBe("12");
  });

  it("updates warranty months when category changes to Appliances (24 months)", () => {
    render(
      <ItemFormModal
        isOpen={true}
        onClose={vi.fn()}
      />
    );

    const categorySelect = screen.getByLabelText("Category");
    fireEvent.change(categorySelect, { target: { value: "Appliances" } });

    const durationInput = screen.getByPlaceholderText("12") as HTMLInputElement;
    expect(durationInput.value).toBe("24");
  });

  it("calls createItem on form submission with valid values", async () => {
    const handleClose = vi.fn();
    const handleSuccess = vi.fn();

    mockCreateItem.mockResolvedValueOnce({
      success: true,
      data: {
        id: "item-new",
        product_name: "LG OLED TV",
      },
    });

    render(
      <ItemFormModal
        isOpen={true}
        onClose={handleClose}
        onSuccess={handleSuccess}
      />
    );

    const nameInput = screen.getByPlaceholderText("e.g. Sony WH-1000XM5");
    fireEvent.change(nameInput, { target: { value: "LG OLED TV" } });

    const brandInput = screen.getByPlaceholderText("e.g. Sony, Apple, Samsung");
    fireEvent.change(brandInput, { target: { value: "LG" } });

    const submitBtn = screen.getByText("Add Item");
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockCreateItem).toHaveBeenCalledWith(
        expect.objectContaining({
          product_name: "LG OLED TV",
          brand: "LG",
        })
      );
      expect(handleSuccess).toHaveBeenCalled();
      expect(handleClose).toHaveBeenCalled();
    });
  });

  it("renders in edit mode with initialData pre-populated", () => {
    const mockItem = {
      id: "item-123",
      user_id: "user-1",
      product_name: "iPad Air M2",
      brand: "Apple",
      category: "Mobile & Computing",
      seller: "Apple Store",
      purchase_date: "2024-06-15",
      price: 59900,
      currency: "INR",
      warranty_months: 12,
      warranty_expiry_date: "2025-06-15",
      receipt_file_url: null,
      extraction_confidence: null,
      status: "active" as const,
      created_at: "2024-06-15T00:00:00Z",
      updated_at: "2024-06-15T00:00:00Z",
    };

    render(
      <ItemFormModal
        isOpen={true}
        onClose={vi.fn()}
        initialData={mockItem}
      />
    );

    expect(screen.getByText("Edit Tracked Item")).toBeDefined();
    const nameInput = screen.getByPlaceholderText("e.g. Sony WH-1000XM5") as HTMLInputElement;
    expect(nameInput.value).toBe("iPad Air M2");
    expect(screen.getByText("Save Changes")).toBeDefined();
  });
});
