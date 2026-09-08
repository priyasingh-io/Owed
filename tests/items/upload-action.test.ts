import { describe, it, expect, vi, beforeEach } from "vitest";
import { uploadAndExtractReceipt } from "@/app/items/upload-action";

// Mock AI SDK
const mockGenerateObject = vi.fn();
vi.mock("ai", () => ({
  generateObject: (...args: unknown[]) => mockGenerateObject(...args),
}));

vi.mock("@/lib/ai/models", () => ({
  getModel: vi.fn(() => "mock-model"),
}));

// Mock Supabase
const mockGetUser = vi.fn();
const mockUpload = vi.fn();
const mockCreateSignedUrl = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() =>
    Promise.resolve({
      auth: {
        getUser: mockGetUser,
      },
      storage: {
        from: vi.fn(() => ({
          upload: mockUpload,
          createSignedUrl: mockCreateSignedUrl,
        })),
      },
    })
  ),
}));

describe("uploadAndExtractReceipt Server Action", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fails if no file is provided in FormData", async () => {
    const formData = new FormData();
    const result = await uploadAndExtractReceipt(formData);

    expect(result.success).toBeFalsy();
    expect(result.error).toContain("No receipt file provided");
  });

  it("fails if file type is unsupported", async () => {
    const formData = new FormData();
    const invalidFile = new File(["dummy"], "receipt.exe", {
      type: "application/x-msdownload",
    });
    formData.append("file", invalidFile);

    const result = await uploadAndExtractReceipt(formData);

    expect(result.success).toBeFalsy();
    expect(result.error).toContain("Unsupported file type");
  });

  it("successfully extracts metadata from valid receipt image", async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: { id: "user-123" } },
      error: null,
    });

    mockUpload.mockResolvedValueOnce({
      data: { path: "user-123/mock-receipt.jpg" },
      error: null,
    });

    mockCreateSignedUrl.mockResolvedValueOnce({
      data: { signedUrl: "https://supabase.co/storage/v1/receipt.jpg" },
      error: null,
    });

    mockGenerateObject.mockResolvedValueOnce({
      object: {
        product_name: "Dyson V12 Detect Slim",
        brand: "Dyson",
        category: "Appliances",
        seller: "Dyson Store",
        purchase_date: "2024-04-10",
        price: 54900,
        currency: "INR",
        warranty_months: 24,
        confidence: 0.96,
      },
    });

    const formData = new FormData();
    const validFile = new File(["fake-image-bytes"], "receipt.jpg", {
      type: "image/jpeg",
    });
    formData.append("file", validFile);

    const result = await uploadAndExtractReceipt(formData);

    expect(result.success).toBe(true);
    expect(result.data?.product_name).toBe("Dyson V12 Detect Slim");
    expect(result.data?.warranty_months).toBe(24);
    expect(result.data?.warranty_expiry_date).toBe("2026-04-10");
    expect(result.data?.warranty_inferred).toBe(false);
    expect(result.data?.requires_user_review).toBe(false);
    expect(result.receiptUrl).toBe("https://supabase.co/storage/v1/receipt.jpg");
  });

  it("infers category warranty duration when receipt doesn't explicitly state months", async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: { id: "user-123" } },
      error: null,
    });

    mockUpload.mockResolvedValueOnce({ data: {}, error: null });
    mockCreateSignedUrl.mockResolvedValueOnce({
      data: { signedUrl: "https://example.com/receipt.png" },
      error: null,
    });

    mockGenerateObject.mockResolvedValueOnce({
      object: {
        product_name: "Sony Soundbar",
        brand: "Sony",
        category: "Electronics",
        seller: "Amazon",
        purchase_date: "2024-01-01",
        price: 15000,
        currency: "INR",
        warranty_months: null,
        confidence: 0.85,
      },
    });

    const formData = new FormData();
    const validFile = new File(["fake-png"], "receipt.png", {
      type: "image/png",
    });
    formData.append("file", validFile);

    const result = await uploadAndExtractReceipt(formData);

    expect(result.success).toBe(true);
    expect(result.data?.warranty_months).toBe(12); // Category default for Electronics
    expect(result.data?.warranty_inferred).toBe(true);
    expect(result.data?.warranty_expiry_date).toBe("2025-01-01");
  });

  it("returns error message when vision AI model fails", async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: null },
      error: null,
    });

    mockGenerateObject.mockRejectedValueOnce(
      new Error("Vision API rate limit exceeded")
    );

    const formData = new FormData();
    const validFile = new File(["fake-image"], "receipt.jpg", {
      type: "image/jpeg",
    });
    formData.append("file", validFile);

    const result = await uploadAndExtractReceipt(formData);

    expect(result.success).toBeFalsy();
    expect(result.error).toContain("Vision API rate limit exceeded");
  });
});
