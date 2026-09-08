import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST } from "@/app/api/cron/reminders/route";
import * as remindersModule from "@/lib/domain/reminders";

describe("/api/cron/reminders Route Handler", () => {
  const originalEnv = process.env.CRON_SECRET;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env.CRON_SECRET = originalEnv;
    } else {
      delete process.env.CRON_SECRET;
    }
  });

  it("rejects unauthorized requests when CRON_SECRET is configured", async () => {
    process.env.CRON_SECRET = "super-secret-cron-token";

    const req = new NextRequest("http://localhost:3000/api/cron/reminders", {
      headers: {
        authorization: "Bearer wrong-token",
      },
    });

    const res = await GET(req);
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toContain("Unauthorized");
  });

  it("accepts authorized requests when CRON_SECRET matches", async () => {
    process.env.CRON_SECRET = "super-secret-cron-token";

    vi.spyOn(remindersModule, "processExpiryReminders").mockResolvedValue({
      success: true,
      targetDate: "2026-09-09",
      dryRun: false,
      processedItems: 5,
      remindersSent: 2,
      remindersSkipped: 3,
      statusUpdated: 1,
      details: [],
      errors: [],
    });

    const req = new NextRequest("http://localhost:3000/api/cron/reminders", {
      headers: {
        authorization: "Bearer super-secret-cron-token",
      },
    });

    const res = await GET(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.remindersSent).toBe(2);
    expect(json.durationMs).toBeDefined();
  });

  it("allows requests in dev when CRON_SECRET is not configured", async () => {
    delete process.env.CRON_SECRET;

    vi.spyOn(remindersModule, "processExpiryReminders").mockResolvedValue({
      success: true,
      targetDate: "2026-09-09",
      dryRun: false,
      processedItems: 0,
      remindersSent: 0,
      remindersSkipped: 0,
      statusUpdated: 0,
      details: [],
      errors: [],
    });

    const req = new NextRequest("http://localhost:3000/api/cron/reminders");
    const res = await GET(req);
    expect(res.status).toBe(200);
  });

  it("passes date and dryRun query parameters to domain processor", async () => {
    delete process.env.CRON_SECRET;

    const processSpy = vi
      .spyOn(remindersModule, "processExpiryReminders")
      .mockResolvedValue({
        success: true,
        targetDate: "2026-10-15",
        dryRun: true,
        processedItems: 3,
        remindersSent: 1,
        remindersSkipped: 2,
        statusUpdated: 0,
        details: [],
        errors: [],
      });

    const req = new NextRequest(
      "http://localhost:3000/api/cron/reminders?date=2026-10-15&dryRun=true"
    );
    const res = await GET(req);
    expect(res.status).toBe(200);
    expect(processSpy).toHaveBeenCalledWith({
      targetDate: "2026-10-15",
      dryRun: true,
    });
  });

  it("supports POST method equivalently", async () => {
    delete process.env.CRON_SECRET;

    vi.spyOn(remindersModule, "processExpiryReminders").mockResolvedValue({
      success: true,
      targetDate: "2026-09-09",
      dryRun: false,
      processedItems: 1,
      remindersSent: 1,
      remindersSkipped: 0,
      statusUpdated: 0,
      details: [],
      errors: [],
    });

    const req = new NextRequest("http://localhost:3000/api/cron/reminders", {
      method: "POST",
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.remindersSent).toBe(1);
  });
});
