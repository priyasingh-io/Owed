import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  generateClaimDraft,
  updateClaimStatus,
} from "@/app/claims/actions";

// Mock next/cache
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

// Mock ai
const mockGenerateObject = vi.fn();
vi.mock("ai", () => ({
  generateObject: (...args: unknown[]) => mockGenerateObject(...args),
  gateway: vi.fn(),
}));

// Mock Supabase Server Client
const mockGetUser = vi.fn();
const mockInsert = vi.fn();
const mockSelect = vi.fn();
const mockUpdate = vi.fn();
const mockEq = vi.fn();
const mockSingle = vi.fn();

const createQueryBuilder = () => {
  const builder: Record<string, unknown> = {};
  builder.insert = mockInsert.mockReturnValue(builder);
  builder.select = mockSelect.mockReturnValue(builder);
  builder.update = mockUpdate.mockReturnValue(builder);
  builder.eq = mockEq.mockReturnValue(builder);
  builder.single = mockSingle.mockReturnValue(builder);
  return builder;
};

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() =>
    Promise.resolve({
      auth: {
        getUser: mockGetUser,
      },
      from: vi.fn(() => createQueryBuilder()),
    })
  ),
}));

describe("Claim Server Actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("generateClaimDraft", () => {
    it("validates input and returns error if description is too short", async () => {
      const result = await generateClaimDraft({
        itemId: "item-123",
        issueDescription: "short",
        desiredResolution: "repair",
      });

      expect(result.error).toBeDefined();
      expect(result.success).toBeFalsy();
    });

    it("generates a claim draft with AI using provided itemContext", async () => {
      mockGetUser.mockResolvedValue({ data: { user: null } });

      mockGenerateObject.mockResolvedValueOnce({
        object: {
          subject: "[Warranty Claim] MacBook Pro 16 - Screen Display Malfunction",
          recipient_suggestion: "Apple Customer Support",
          body: "Dear Apple Support Team,\n\nI am writing to formally submit a warranty claim...",
          summary: "Requesting warranty repair for display failure.",
          suggested_attachments: ["Purchase receipt", "Photo of defect"],
        },
      });

      const result = await generateClaimDraft(
        {
          itemId: "demo-item-1",
          issueDescription: "The screen suddenly stopped displaying video output and shows only vertical stripes.",
          desiredResolution: "repair",
        },
        {
          product_name: "MacBook Pro 16",
          brand: "Apple",
          seller: "Best Buy",
          purchase_date: "2026-01-15",
          warranty_expiry_date: "2027-01-15",
          price: 2499,
          currency: "USD",
        }
      );

      expect(result.success).toBe(true);
      expect(result.data?.subject).toContain("MacBook Pro 16");
      expect(result.data?.recipient_suggestion).toBe("Apple Customer Support");
      expect(result.data?.suggested_attachments).toHaveLength(2);
    });

    it("persists claim to Supabase claims table when user is authenticated", async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: "user-abc" } },
      });

      // Item lookup in items table
      mockSingle.mockResolvedValueOnce({
        data: {
          id: "item-456",
          user_id: "user-abc",
          product_name: "Sony WH-1000XM5",
          brand: "Sony",
          seller: "Amazon",
          purchase_date: "2026-03-01",
          warranty_expiry_date: "2027-03-01",
          price: 399,
          currency: "USD",
        },
        error: null,
      });

      mockGenerateObject.mockResolvedValueOnce({
        object: {
          subject: "[Warranty Claim] Sony WH-1000XM5 - Left Driver Buzzing",
          recipient_suggestion: "Sony Electronics Support",
          body: "To whom it may concern at Sony,\n\nI am claiming warranty for audio distortion...",
          summary: "Audio defect claim under active warranty.",
          suggested_attachments: ["Amazon invoice", "Serial number label"],
        },
      });

      // Claims table insert
      mockSingle.mockResolvedValueOnce({
        data: { id: "claim-789" },
        error: null,
      });

      const result = await generateClaimDraft({
        itemId: "item-456",
        issueDescription: "Left earcup makes loud crackling buzzing noise during playback.",
        desiredResolution: "replacement",
      });

      expect(result.success).toBe(true);
      expect(result.data?.subject).toContain("Sony WH-1000XM5");
      expect(mockInsert).toHaveBeenCalled();
    });

    it("handles AI model generation errors gracefully", async () => {
      mockGetUser.mockResolvedValue({ data: { user: null } });
      mockGenerateObject.mockRejectedValueOnce(new Error("AI Gateway rate limit"));

      const result = await generateClaimDraft(
        {
          itemId: "demo-item",
          issueDescription: "Appliance motor seized and stopped spinning completely.",
          desiredResolution: "repair",
        },
        { product_name: "Blender" }
      );

      expect(result.success).toBeFalsy();
      expect(result.error).toContain("AI Gateway rate limit");
    });
  });

  describe("updateClaimStatus", () => {
    it("updates status in claims table", async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: "user-abc" } },
      });

      mockEq.mockReturnValue({
        select: vi.fn().mockResolvedValue({ error: null }),
      });

      const res = await updateClaimStatus("claim-123", "sent");
      expect(res.success).toBe(true);
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ status: "sent" })
      );
    });
  });
});
