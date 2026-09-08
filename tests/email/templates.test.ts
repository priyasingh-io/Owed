import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  generateWarrantyReminderEmail,
  WarrantyReminderEmailData,
} from "@/lib/email/templates/warranty-reminder";
import { getSenderEmail } from "@/lib/email/client";

describe("Warranty Reminder Email Template", () => {
  const baseData: WarrantyReminderEmailData = {
    recipientEmail: "user@example.com",
    productName: "Sony WH-1000XM5",
    brand: "Sony",
    category: "Electronics",
    seller: "Amazon",
    purchaseDate: "2025-10-09",
    price: 29990,
    currency: "INR",
    warrantyExpiryDate: "2026-10-09",
    daysUntilExpiry: 30,
    itemId: "test-item-123",
    appUrl: "http://localhost:3000",
  };

  it("renders 30-day notice with correct subject and urgency badge", () => {
    const result = generateWarrantyReminderEmail({
      ...baseData,
      daysUntilExpiry: 30,
    });

    expect(result.subject).toContain("30 days");
    expect(result.html).toContain("Expires in 30 Days");
    expect(result.html).toContain("Sony WH-1000XM5");
    expect(result.html).toContain("Sony");
    expect(result.html).toContain("Amazon");
    expect(result.html).toContain("INR 29,990");
    expect(result.html).toContain("test-item-123");
    expect(result.text).toContain("Sony WH-1000XM5");
    expect(result.text).toContain("30 day(s) remaining");
  });

  it("renders 7-day warning with 1-week urgency badge", () => {
    const result = generateWarrantyReminderEmail({
      ...baseData,
      daysUntilExpiry: 7,
    });

    expect(result.subject).toContain("1 Week Left");
    expect(result.html).toContain("Expires in 7 Days");
    expect(result.html).toContain("Your warranty expires in 1 week");
    expect(result.text).toContain("Expires in 7 Days");
  });

  it("renders 1-day urgent warning with tomorrow badge", () => {
    const result = generateWarrantyReminderEmail({
      ...baseData,
      daysUntilExpiry: 1,
    });

    expect(result.subject).toContain("Urgent");
    expect(result.subject).toContain("expires tomorrow!");
    expect(result.html).toContain("Expires Tomorrow");
    expect(result.html).toContain("Your warranty expires tomorrow!");
    expect(result.text).toContain("Your warranty expires tomorrow!");
  });

  it("handles optional fields gracefully when missing", () => {
    const minimalData: WarrantyReminderEmailData = {
      recipientEmail: "user@example.com",
      productName: "Generic Kettle",
      warrantyExpiryDate: "2026-12-31",
      daysUntilExpiry: 14,
      itemId: "minimal-item-456",
    };

    const result = generateWarrantyReminderEmail(minimalData);

    expect(result.subject).toContain("14 days");
    expect(result.html).toContain("Generic Kettle");
    expect(result.html).not.toContain("Purchased From");
    expect(result.text).toContain("Generic Kettle");
  });
});

describe("Email Sender Helper (getSenderEmail)", () => {
  const originalEnv = process.env.EMAIL_FROM;

  afterEach(() => {
    process.env.EMAIL_FROM = originalEnv;
  });

  it("falls back to onboarding@resend.dev when EMAIL_FROM is not configured", () => {
    delete process.env.EMAIL_FROM;
    expect(getSenderEmail()).toBe("Owed <onboarding@resend.dev>");
  });

  it("safely falls back to onboarding@resend.dev when EMAIL_FROM uses public webmail like gmail", () => {
    process.env.EMAIL_FROM = "myaccount@gmail.com";
    expect(getSenderEmail()).toBe("Owed <onboarding@resend.dev>");
  });

  it("uses custom verified domain when EMAIL_FROM is a domain address", () => {
    process.env.EMAIL_FROM = "Owed <alerts@owed.app>";
    expect(getSenderEmail()).toBe("Owed <alerts@owed.app>");
  });
});
