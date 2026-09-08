import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ClaimAssistantModal } from "@/components/claims/claim-assistant-modal";
import { Item } from "@/lib/types/database";

const mockGenerateClaimDraft = vi.fn();

vi.mock("@/app/claims/actions", () => ({
  generateClaimDraft: (...args: unknown[]) => mockGenerateClaimDraft(...args),
}));

const mockItem: Item = {
  id: "test-item-1",
  user_id: "user-1",
  product_name: "MacBook Pro 16",
  brand: "Apple",
  category: "Electronics",
  seller: "Best Buy",
  purchase_date: "2026-01-15",
  warranty_expiry_date: "2027-01-15",
  warranty_months: 12,
  price: 2499,
  currency: "USD",
  receipt_file_url: "https://example.com/receipt.pdf",
  extraction_confidence: 0.95,
  status: "active",
  created_at: "2026-01-15T00:00:00Z",
  updated_at: "2026-01-15T00:00:00Z",
};

describe("ClaimAssistantModal Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not render when isOpen is false", () => {
    render(
      <ClaimAssistantModal
        isOpen={false}
        onClose={vi.fn()}
        item={mockItem}
      />
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("renders item information and input fields when open", () => {
    render(
      <ClaimAssistantModal
        isOpen={true}
        onClose={vi.fn()}
        item={mockItem}
      />
    );

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("MacBook Pro 16")).toBeInTheDocument();
    expect(screen.getByText("Apple")).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/describe what happened/i)).toBeInTheDocument();
  });

  it("populates issue description when clicking a quick chip", () => {
    render(
      <ClaimAssistantModal
        isOpen={true}
        onClose={vi.fn()}
        item={mockItem}
      />
    );

    const quickChip = screen.getByRole("button", { name: /won't turn on/i });
    fireEvent.click(quickChip);

    const textarea = screen.getByPlaceholderText(/describe what happened/i) as HTMLTextAreaElement;
    expect(textarea.value.length).toBeGreaterThan(10);
  });

  it("generates claim draft and transitions to review step", async () => {
    mockGenerateClaimDraft.mockResolvedValueOnce({
      success: true,
      data: {
        subject: "[Warranty Claim] Apple MacBook Pro 16 - Screen Issue",
        recipient_suggestion: "Apple Customer Support",
        body: "Formal warranty claim email body text...",
        summary: "Warranty claim for display repair.",
        suggested_attachments: ["Receipt", "Photo"],
      },
    });

    render(
      <ClaimAssistantModal
        isOpen={true}
        onClose={vi.fn()}
        item={mockItem}
      />
    );

    const textarea = screen.getByPlaceholderText(/describe what happened/i);
    fireEvent.change(textarea, {
      target: { value: "The display has stopped functioning and screen is completely black." },
    });

    const generateBtn = screen.getByRole("button", { name: /generate claim letter/i });
    expect(generateBtn).not.toBeDisabled();
    fireEvent.click(generateBtn);

    await waitFor(() => {
      expect(screen.getByText(/\[Warranty Claim\] Apple MacBook Pro 16 - Screen Issue/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/Apple Customer Support/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /copy letter/i })).toBeInTheDocument();
  });

  it("copies letter to clipboard when clicking copy button", async () => {
    mockGenerateClaimDraft.mockResolvedValueOnce({
      success: true,
      data: {
        subject: "Subject",
        recipient_suggestion: "Support",
        body: "Claim letter content",
        summary: "Summary",
        suggested_attachments: [],
      },
    });

    // Mock navigator.clipboard
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: {
        writeText: writeTextMock,
      },
    });

    render(
      <ClaimAssistantModal
        isOpen={true}
        onClose={vi.fn()}
        item={mockItem}
      />
    );

    const textarea = screen.getByPlaceholderText(/describe what happened/i);
    fireEvent.change(textarea, {
      target: { value: "Hardware component failed after few months of normal usage." },
    });

    fireEvent.click(screen.getByRole("button", { name: /generate claim letter/i }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /copy letter/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /copy letter/i }));
    expect(writeTextMock).toHaveBeenCalled();
  });
});
