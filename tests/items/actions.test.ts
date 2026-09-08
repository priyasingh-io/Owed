import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createItem,
  getUserItems,
  updateItem,
  deleteItem,
  archiveItem,
} from "@/app/items/actions";

// Mock next/cache
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

// Mock Supabase Server Client
const mockGetUser = vi.fn();
const mockInsert = vi.fn();
const mockSelect = vi.fn();
const mockUpdate = vi.fn();
const mockDelete = vi.fn();
const mockEq = vi.fn();
const mockOrder = vi.fn();
const mockSingle = vi.fn();

interface MockQueryBuilder {
  insert: ReturnType<typeof vi.fn>;
  select: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  order: ReturnType<typeof vi.fn>;
  single: ReturnType<typeof vi.fn>;
}

// Mock query builder chain
const createQueryBuilder = (): MockQueryBuilder => {
  const builder: MockQueryBuilder = {
    insert: mockInsert,
    select: mockSelect,
    update: mockUpdate,
    delete: mockDelete,
    eq: mockEq,
    order: mockOrder,
    single: mockSingle,
  };
  mockInsert.mockReturnValue(builder);
  mockSelect.mockReturnValue(builder);
  mockUpdate.mockReturnValue(builder);
  mockDelete.mockReturnValue(builder);
  mockEq.mockReturnValue(builder);
  mockOrder.mockReturnValue(builder);
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

describe("Item Actions - createItem", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fails if the user is not authenticated", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null }, error: null });

    const result = await createItem({
      product_name: "MacBook Pro",
    });

    expect(result.success).toBeFalsy();
    expect(result.error).toContain("signed in");
  });

  it("fails if validation fails (e.g. empty product_name)", async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: { id: "user-123" } },
      error: null,
    });

    const result = await createItem({
      product_name: "",
    });

    expect(result.success).toBeFalsy();
    expect(result.error).toBeDefined();
  });

  it("successfully creates an item, calculates expiry date, and persists to supabase", async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: { id: "user-123" } },
      error: null,
    });

    const mockCreatedItem = {
      id: "item-abc",
      user_id: "user-123",
      product_name: "Sony WH-1000XM5",
      brand: "Sony",
      category: "Electronics",
      seller: "Amazon",
      purchase_date: "2024-05-15",
      price: 29990,
      currency: "INR",
      warranty_months: 12,
      warranty_expiry_date: "2025-05-15",
      status: "expired",
      created_at: "2024-05-15T10:00:00Z",
      updated_at: "2024-05-15T10:00:00Z",
    };

    mockSingle.mockResolvedValueOnce({
      data: mockCreatedItem,
      error: null,
    });

    const result = await createItem({
      product_name: "Sony WH-1000XM5",
      brand: "Sony",
      category: "Electronics",
      seller: "Amazon",
      purchase_date: "2024-05-15",
      price: 29990,
      currency: "INR",
      warranty_months: 12,
    });

    expect(result.success).toBe(true);
    expect(result.data).toEqual(mockCreatedItem);

    // Verify insert payload
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "user-123",
        product_name: "Sony WH-1000XM5",
        warranty_months: 12,
        warranty_expiry_date: "2025-05-15",
      })
    );
  });

  it("applies category warranty fallback when warranty_months is not provided", async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: { id: "user-123" } },
      error: null,
    });

    mockSingle.mockResolvedValueOnce({
      data: { id: "item-xyz" },
      error: null,
    });

    await createItem({
      product_name: "Bosch Washing Machine",
      category: "Appliances", // Default for appliances is 24 months
      purchase_date: "2024-01-01",
    });

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        warranty_months: 24,
        warranty_expiry_date: "2026-01-01",
      })
    );
  });
});

describe("Item Actions - getUserItems", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fails if user is not signed in", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null }, error: null });

    const result = await getUserItems();
    expect(result.success).toBeFalsy();
    expect(result.error).toBeDefined();
  });

  it("returns user items filtered by user_id", async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: { id: "user-123" } },
      error: null,
    });

    const mockItems = [
      { id: "item-1", product_name: "iPhone", user_id: "user-123" },
      { id: "item-2", product_name: "iPad", user_id: "user-123" },
    ];

    mockOrder.mockResolvedValueOnce({
      data: mockItems,
      error: null,
    });

    const result = await getUserItems();
    expect(result.success).toBe(true);
    expect(result.data).toEqual(mockItems);
    expect(mockEq).toHaveBeenCalledWith("user_id", "user-123");
  });
});

describe("Item Actions - updateItem", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fails if user is not signed in", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null }, error: null });

    const result = await updateItem("item-1", { product_name: "Updated" });
    expect(result.success).toBeFalsy();
  });

  it("updates item successfully and recomputes expiry date if purchase_date changed", async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: { id: "user-123" } },
      error: null,
    });

    const mockUpdated = {
      id: "item-1",
      product_name: "MacBook Air M3",
      purchase_date: "2024-06-01",
      warranty_months: 12,
      warranty_expiry_date: "2025-06-01",
    };

    mockSingle.mockResolvedValueOnce({
      data: mockUpdated,
      error: null,
    });

    const result = await updateItem("item-1", {
      product_name: "MacBook Air M3",
      purchase_date: "2024-06-01",
      warranty_months: 12,
    });

    expect(result.success).toBe(true);
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        product_name: "MacBook Air M3",
        warranty_expiry_date: "2025-06-01",
      })
    );
    expect(mockEq).toHaveBeenCalledWith("id", "item-1");
    expect(mockEq).toHaveBeenCalledWith("user_id", "user-123");
  });
});

describe("Item Actions - deleteItem", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deletes item scoped to user_id", async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: { id: "user-123" } },
      error: null,
    });

    // delete().eq().eq()
    mockEq.mockReturnValue({
      eq: vi.fn().mockResolvedValueOnce({ error: null }),
    });

    const result = await deleteItem("item-1");
    expect(result.success).toBe(true);
    expect(mockDelete).toHaveBeenCalled();
  });
});

describe("Item Actions - archiveItem", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sets item status to archived", async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: { id: "user-123" } },
      error: null,
    });

    mockSingle.mockResolvedValueOnce({
      data: { id: "item-1", status: "archived" },
      error: null,
    });

    const result = await archiveItem("item-1");
    expect(result.success).toBe(true);
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "archived",
      })
    );
  });
});
