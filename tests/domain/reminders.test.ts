import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  calculateDaysUntilExpiry,
  processExpiryReminders,
} from "@/lib/domain/reminders";
import { SupabaseClient } from "@supabase/supabase-js";
import { Resend } from "resend";

describe("calculateDaysUntilExpiry", () => {
  it("calculates positive days for future dates", () => {
    expect(calculateDaysUntilExpiry("2026-10-09", "2026-09-09")).toBe(30);
    expect(calculateDaysUntilExpiry("2026-09-16", "2026-09-09")).toBe(7);
    expect(calculateDaysUntilExpiry("2026-09-10", "2026-09-09")).toBe(1);
    expect(calculateDaysUntilExpiry("2026-09-09", "2026-09-09")).toBe(0);
  });

  it("calculates negative days for past dates", () => {
    expect(calculateDaysUntilExpiry("2026-09-01", "2026-09-09")).toBe(-8);
  });

  it("handles month and year boundaries correctly", () => {
    expect(calculateDaysUntilExpiry("2027-01-01", "2026-12-31")).toBe(1);
    expect(calculateDaysUntilExpiry("2026-03-01", "2026-02-28")).toBe(1);
  });

  it("returns null for malformed or empty inputs", () => {
    expect(calculateDaysUntilExpiry("", "2026-09-09")).toBeNull();
    expect(calculateDaysUntilExpiry("invalid-date", "2026-09-09")).toBeNull();
    expect(calculateDaysUntilExpiry("2026-09-09", "invalid")).toBeNull();
  });
});

describe("processExpiryReminders", () => {
  let mockResend: Partial<Resend>;
  let sendEmailMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    sendEmailMock = vi.fn().mockResolvedValue({
      data: { id: "msg-123" },
      error: null,
    });
    mockResend = {
      emails: {
        send: sendEmailMock,
      } as unknown as Resend["emails"],
    };
  });

  it("returns cleanly when no items exist", async () => {
    const mockDb = {
      from: vi.fn((table: string) => {
        if (table === "items") {
          return {
            select: vi.fn().mockReturnThis(),
            neq: vi.fn().mockReturnThis(),
            not: vi.fn().mockResolvedValue({ data: [], error: null }),
          };
        }
        return {};
      }),
    } as unknown as SupabaseClient;

    const report = await processExpiryReminders({
      targetDate: "2026-09-09",
      dbClient: mockDb,
      resendClient: mockResend as Resend,
    });

    expect(report.success).toBe(true);
    expect(report.processedItems).toBe(0);
    expect(report.remindersSent).toBe(0);
    expect(sendEmailMock).not.toHaveBeenCalled();
  });

  it("processes reminders for items matching lead days and sends email", async () => {
    const mockItems = [
      {
        id: "item-30d",
        user_id: "user-1",
        product_name: "MacBook Air",
        brand: "Apple",
        category: "Electronics",
        seller: "Apple Store",
        purchaseDate: "2025-10-09",
        price: 99900,
        currency: "INR",
        warranty_expiry_date: "2026-10-09", // 30 days away from 2026-09-09
        status: "active",
      },
    ];

    const mockProfiles = [
      {
        id: "user-1",
        email: "alice@example.com",
        reminder_lead_days: [30, 7, 1],
      },
    ];

    const insertMock = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: { id: "rem-1" }, error: null }),
      }),
    });

    const updateReminderMock = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    });

    const updateItemMock = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    });

    const mockDb = {
      from: vi.fn((table: string) => {
        if (table === "items") {
          return {
            select: vi.fn().mockReturnThis(),
            neq: vi.fn().mockReturnThis(),
            not: vi.fn().mockResolvedValue({ data: mockItems, error: null }),
            update: updateItemMock,
          };
        }
        if (table === "profiles") {
          return {
            select: vi.fn().mockReturnThis(),
            in: vi.fn().mockResolvedValue({ data: mockProfiles, error: null }),
          };
        }
        if (table === "reminders") {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockImplementation(function (this: any) {
              return {
                eq: vi.fn().mockResolvedValue({ data: [], error: null }), // No existing reminder
              };
            }),
            insert: insertMock,
            update: updateReminderMock,
          };
        }
        return {};
      }),
    } as unknown as SupabaseClient;

    const report = await processExpiryReminders({
      targetDate: "2026-09-09",
      dbClient: mockDb,
      resendClient: mockResend as Resend,
    });

    expect(report.success).toBe(true);
    expect(report.processedItems).toBe(1);
    expect(report.remindersSent).toBe(1);
    expect(report.remindersSkipped).toBe(0);
    expect(sendEmailMock).toHaveBeenCalledTimes(1);
    expect(sendEmailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        to: ["alice@example.com"],
        subject: expect.stringContaining("30 days"),
      })
    );
    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        item_id: "item-30d",
        remind_at: "2026-09-09",
        sent: false,
      })
    );
    expect(updateReminderMock).toHaveBeenCalledWith({ sent: true });
  });

  it("skips items that do not match reminder lead days", async () => {
    const mockItems = [
      {
        id: "item-15d",
        user_id: "user-1",
        product_name: "Coffee Machine",
        warranty_expiry_date: "2026-09-24", // 15 days away from 2026-09-09
        status: "expiring_soon",
      },
    ];

    const mockProfiles = [
      {
        id: "user-1",
        email: "alice@example.com",
        reminder_lead_days: [30, 7, 1],
      },
    ];

    const mockDb = {
      from: vi.fn((table: string) => {
        if (table === "items") {
          return {
            select: vi.fn().mockReturnThis(),
            neq: vi.fn().mockReturnThis(),
            not: vi.fn().mockResolvedValue({ data: mockItems, error: null }),
            update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
          };
        }
        if (table === "profiles") {
          return {
            select: vi.fn().mockReturnThis(),
            in: vi.fn().mockResolvedValue({ data: mockProfiles, error: null }),
          };
        }
        return {};
      }),
    } as unknown as SupabaseClient;

    const report = await processExpiryReminders({
      targetDate: "2026-09-09",
      dbClient: mockDb,
      resendClient: mockResend as Resend,
    });

    expect(report.remindersSent).toBe(0);
    expect(report.remindersSkipped).toBe(1);
    expect(report.details[0].action).toBe("skipped_no_lead_match");
    expect(sendEmailMock).not.toHaveBeenCalled();
  });

  it("is idempotent: skips email if already sent for today", async () => {
    const mockItems = [
      {
        id: "item-7d",
        user_id: "user-1",
        product_name: "Smart Watch",
        warranty_expiry_date: "2026-09-16", // 7 days away from 2026-09-09
        status: "expiring_soon",
      },
    ];

    const mockProfiles = [
      {
        id: "user-1",
        email: "alice@example.com",
        reminder_lead_days: [30, 7, 1],
      },
    ];

    const mockDb = {
      from: vi.fn((table: string) => {
        if (table === "items") {
          return {
            select: vi.fn().mockReturnThis(),
            neq: vi.fn().mockReturnThis(),
            not: vi.fn().mockResolvedValue({ data: mockItems, error: null }),
            update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
          };
        }
        if (table === "profiles") {
          return {
            select: vi.fn().mockReturnThis(),
            in: vi.fn().mockResolvedValue({ data: mockProfiles, error: null }),
          };
        }
        if (table === "reminders") {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockImplementation(function (this: any) {
              return {
                eq: vi.fn().mockResolvedValue({
                  data: [{ id: "existing-rem-1", sent: true }], // Already sent today!
                  error: null,
                }),
              };
            }),
          };
        }
        return {};
      }),
    } as unknown as SupabaseClient;

    const report = await processExpiryReminders({
      targetDate: "2026-09-09",
      dbClient: mockDb,
      resendClient: mockResend as Resend,
    });

    expect(report.remindersSent).toBe(0);
    expect(report.remindersSkipped).toBe(1);
    expect(report.details[0].action).toBe("skipped_already_sent");
    expect(sendEmailMock).not.toHaveBeenCalled();
  });

  it("handles Resend email failure without marking reminder sent", async () => {
    sendEmailMock.mockRejectedValue(new Error("Resend API rate limit exceeded"));

    const mockItems = [
      {
        id: "item-1d",
        user_id: "user-1",
        product_name: "Blender",
        warranty_expiry_date: "2026-09-10", // 1 day away
        status: "expiring_soon",
      },
    ];

    const mockProfiles = [
      {
        id: "user-1",
        email: "alice@example.com",
        reminder_lead_days: [30, 7, 1],
      },
    ];

    const updateReminderMock = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    });

    const mockDb = {
      from: vi.fn((table: string) => {
        if (table === "items") {
          return {
            select: vi.fn().mockReturnThis(),
            neq: vi.fn().mockReturnThis(),
            not: vi.fn().mockResolvedValue({ data: mockItems, error: null }),
            update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
          };
        }
        if (table === "profiles") {
          return {
            select: vi.fn().mockReturnThis(),
            in: vi.fn().mockResolvedValue({ data: mockProfiles, error: null }),
          };
        }
        if (table === "reminders") {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockImplementation(function (this: any) {
              return {
                eq: vi.fn().mockResolvedValue({ data: [], error: null }),
              };
            }),
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: { id: "rem-fail" }, error: null }),
              }),
            }),
            update: updateReminderMock,
          };
        }
        return {};
      }),
    } as unknown as SupabaseClient;

    const report = await processExpiryReminders({
      targetDate: "2026-09-09",
      dbClient: mockDb,
      resendClient: mockResend as Resend,
    });

    expect(report.remindersSent).toBe(0);
    expect(report.errors.length).toBe(1);
    expect(report.errors[0].error).toContain("rate limit");
    // sent should NOT be updated to true
    expect(updateReminderMock).not.toHaveBeenCalled();
  });

  it("updates item status to expired when warranty expiry has passed", async () => {
    const mockItems = [
      {
        id: "item-expired",
        user_id: "user-1",
        product_name: "Toaster",
        warranty_expiry_date: "2026-09-01", // -8 days
        status: "expiring_soon",
      },
    ];

    const mockProfiles = [
      {
        id: "user-1",
        email: "alice@example.com",
        reminder_lead_days: [30, 7, 1],
      },
    ];

    const updateItemMock = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    });

    const mockDb = {
      from: vi.fn((table: string) => {
        if (table === "items") {
          return {
            select: vi.fn().mockReturnThis(),
            neq: vi.fn().mockReturnThis(),
            not: vi.fn().mockResolvedValue({ data: mockItems, error: null }),
            update: updateItemMock,
          };
        }
        if (table === "profiles") {
          return {
            select: vi.fn().mockReturnThis(),
            in: vi.fn().mockResolvedValue({ data: mockProfiles, error: null }),
          };
        }
        return {};
      }),
    } as unknown as SupabaseClient;

    const report = await processExpiryReminders({
      targetDate: "2026-09-09",
      dbClient: mockDb,
      resendClient: mockResend as Resend,
    });

    expect(report.statusUpdated).toBe(1);
    expect(updateItemMock).toHaveBeenCalledWith(
      expect.objectContaining({ status: "expired" })
    );
  });

  it("simulates reminders in dryRun mode without calling Resend or mutating DB", async () => {
    const mockItems = [
      {
        id: "item-30d",
        user_id: "user-1",
        product_name: "iPad Air",
        warranty_expiry_date: "2026-10-09", // 30 days away
        status: "active",
      },
    ];

    const mockProfiles = [
      {
        id: "user-1",
        email: "alice@example.com",
        reminder_lead_days: [30, 7, 1],
      },
    ];

    const insertMock = vi.fn();
    const updateItemMock = vi.fn();

    const mockDb = {
      from: vi.fn((table: string) => {
        if (table === "items") {
          return {
            select: vi.fn().mockReturnThis(),
            neq: vi.fn().mockReturnThis(),
            not: vi.fn().mockResolvedValue({ data: mockItems, error: null }),
            update: updateItemMock,
          };
        }
        if (table === "profiles") {
          return {
            select: vi.fn().mockReturnThis(),
            in: vi.fn().mockResolvedValue({ data: mockProfiles, error: null }),
          };
        }
        if (table === "reminders") {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockImplementation(function (this: any) {
              return {
                eq: vi.fn().mockResolvedValue({ data: [], error: null }),
              };
            }),
            insert: insertMock,
          };
        }
        return {};
      }),
    } as unknown as SupabaseClient;

    const report = await processExpiryReminders({
      targetDate: "2026-09-09",
      dryRun: true,
      dbClient: mockDb,
      resendClient: mockResend as Resend,
    });

    expect(report.dryRun).toBe(true);
    expect(report.remindersSent).toBe(1); // counted as matched
    expect(report.details[0].action).toBe("dry_run_matched");
    expect(insertMock).not.toHaveBeenCalled();
    expect(sendEmailMock).not.toHaveBeenCalled();
    expect(updateItemMock).not.toHaveBeenCalled();
  });
});
