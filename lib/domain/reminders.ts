import { SupabaseClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { createAdminClient } from "@/lib/supabase/admin";
import { getResendClient, getSenderEmail } from "@/lib/email/client";
import { generateWarrantyReminderEmail } from "@/lib/email/templates/warranty-reminder";

export interface ProcessRemindersOptions {
  targetDate?: string; // ISO date string YYYY-MM-DD. Defaults to UTC today.
  dryRun?: boolean; // If true, calculates reminders without sending emails or mutating database.
  dbClient?: SupabaseClient; // Optional injected DB client for testing.
  resendClient?: Resend; // Optional injected Resend client for testing.
}

export interface ReminderItemDetail {
  itemId: string;
  productName: string;
  userEmail: string;
  daysUntilExpiry: number;
  action:
    | "sent"
    | "skipped_already_sent"
    | "skipped_no_lead_match"
    | "dry_run_matched"
    | "error";
  error?: string;
}

export interface ReminderExecutionReport {
  success: boolean;
  targetDate: string;
  dryRun: boolean;
  processedItems: number;
  remindersSent: number;
  remindersSkipped: number;
  statusUpdated: number;
  details: ReminderItemDetail[];
  errors: Array<{ itemId: string; error: string }>;
}

/**
 * Calculates days remaining between referenceDate and expiryDate in UTC.
 * Returns positive integer if expiryDate is in the future,
 * 0 if expiryDate is today,
 * negative integer if expiryDate has passed.
 */
export function calculateDaysUntilExpiry(
  expiryDate: string,
  referenceDate: string
): number | null {
  if (!expiryDate || !referenceDate) return null;
  const expParts = expiryDate.split("-");
  const refParts = referenceDate.split("-");
  if (expParts.length !== 3 || refParts.length !== 3) return null;

  const expYear = parseInt(expParts[0], 10);
  const expMonth = parseInt(expParts[1], 10);
  const expDay = parseInt(expParts[2], 10);

  const refYear = parseInt(refParts[0], 10);
  const refMonth = parseInt(refParts[1], 10);
  const refDay = parseInt(refParts[2], 10);

  if (
    isNaN(expYear) ||
    isNaN(expMonth) ||
    isNaN(expDay) ||
    isNaN(refYear) ||
    isNaN(refMonth) ||
    isNaN(refDay)
  ) {
    return null;
  }

  const expUtc = Date.UTC(expYear, expMonth - 1, expDay);
  const refUtc = Date.UTC(refYear, refMonth - 1, refDay);
  const msPerDay = 1000 * 60 * 60 * 24;

  return Math.round((expUtc - refUtc) / msPerDay);
}

/**
 * Processes daily warranty expiration reminders.
 * Scans candidate items, compares days until expiry against user's reminder lead days,
 * ensures idempotency against public.reminders, dispatches emails via Resend,
 * and synchronizes item statuses.
 */
export async function processExpiryReminders(
  options: ProcessRemindersOptions = {}
): Promise<ReminderExecutionReport> {
  const targetDate =
    options.targetDate || new Date().toISOString().split("T")[0];
  const dryRun = Boolean(options.dryRun);
  const db = options.dbClient || createAdminClient();
  const resend = dryRun ? null : options.resendClient || getResendClient();

  const report: ReminderExecutionReport = {
    success: true,
    targetDate,
    dryRun,
    processedItems: 0,
    remindersSent: 0,
    remindersSkipped: 0,
    statusUpdated: 0,
    details: [],
    errors: [],
  };

  // Fetch all items that have not been archived and have a warranty expiry date
  const { data: items, error: itemsError } = await db
    .from("items")
    .select(
      `
      id,
      user_id,
      product_name,
      brand,
      category,
      seller,
      purchase_date,
      price,
      currency,
      warranty_expiry_date,
      status
    `
    )
    .neq("status", "archived")
    .not("warranty_expiry_date", "is", null);

  if (itemsError) {
    report.success = false;
    report.errors.push({ itemId: "query", error: itemsError.message });
    return report;
  }

  if (!items || items.length === 0) {
    return report;
  }

  // Fetch profiles for candidate items to get user email and reminder preferences
  const userIds = Array.from(new Set(items.map((i) => i.user_id)));
  const { data: profiles, error: profilesError } = await db
    .from("profiles")
    .select("id, email, reminder_lead_days")
    .in("id", userIds);

  if (profilesError) {
    report.success = false;
    report.errors.push({ itemId: "profiles", error: profilesError.message });
    return report;
  }

  const profileMap = new Map<string, { email: string; reminderLeadDays: number[] }>();
  if (profiles) {
    for (const p of profiles) {
      profileMap.set(p.id, {
        email: p.email,
        reminderLeadDays:
          Array.isArray(p.reminder_lead_days) && p.reminder_lead_days.length > 0
            ? p.reminder_lead_days
            : [30, 7, 1],
      });
    }
  }

  report.processedItems = items.length;

  for (const item of items) {
    if (!item.warranty_expiry_date) continue;

    const daysRemaining = calculateDaysUntilExpiry(
      item.warranty_expiry_date,
      targetDate
    );

    if (daysRemaining === null) continue;

    // 1. Synchronize item status if changed
    let expectedStatus: "active" | "expiring_soon" | "expired" | null = null;
    if (daysRemaining < 0 && item.status !== "expired") {
      expectedStatus = "expired";
    } else if (
      daysRemaining >= 0 &&
      daysRemaining <= 30 &&
      item.status === "active"
    ) {
      expectedStatus = "expiring_soon";
    }

    if (expectedStatus && !dryRun) {
      const { error: updateError } = await db
        .from("items")
        .update({ status: expectedStatus, updated_at: new Date().toISOString() })
        .eq("id", item.id);

      if (!updateError) {
        report.statusUpdated++;
      }
    } else if (expectedStatus && dryRun) {
      report.statusUpdated++;
    }

    // 2. Check if user should receive a reminder today
    const profile = profileMap.get(item.user_id);
    const userEmail = profile?.email;
    const leadDays = profile?.reminderLeadDays || [30, 7, 1];

    if (!userEmail) {
      report.details.push({
        itemId: item.id,
        productName: item.product_name,
        userEmail: "",
        daysUntilExpiry: daysRemaining,
        action: "error",
        error: "Missing user email profile",
      });
      continue;
    }

    // Check if daysRemaining matches any of user's reminder lead days
    const isReminderDue = leadDays.includes(daysRemaining);

    if (!isReminderDue) {
      report.remindersSkipped++;
      report.details.push({
        itemId: item.id,
        productName: item.product_name,
        userEmail,
        daysUntilExpiry: daysRemaining,
        action: "skipped_no_lead_match",
      });
      continue;
    }

    // 3. Check idempotency: has a reminder already been recorded for this item today?
    const { data: existingReminders, error: reminderQueryError } = await db
      .from("reminders")
      .select("id, sent")
      .eq("item_id", item.id)
      .eq("remind_at", targetDate);

    if (reminderQueryError) {
      report.errors.push({
        itemId: item.id,
        error: `Failed to query existing reminders: ${reminderQueryError.message}`,
      });
      continue;
    }

    const alreadySent = existingReminders?.some((r) => r.sent === true);
    if (alreadySent) {
      report.remindersSkipped++;
      report.details.push({
        itemId: item.id,
        productName: item.product_name,
        userEmail,
        daysUntilExpiry: daysRemaining,
        action: "skipped_already_sent",
      });
      continue;
    }

    // 4. If dry-run mode, record action and skip sending
    if (dryRun) {
      report.remindersSent++;
      report.details.push({
        itemId: item.id,
        productName: item.product_name,
        userEmail,
        daysUntilExpiry: daysRemaining,
        action: "dry_run_matched",
      });
      continue;
    }

    // 5. Insert or retrieve pending reminder entry
    let reminderId: string | null =
      existingReminders && existingReminders.length > 0
        ? existingReminders[0].id
        : null;

    if (!reminderId) {
      const { data: insertedReminder, error: insertError } = await db
        .from("reminders")
        .insert({
          item_id: item.id,
          remind_at: targetDate,
          sent: false,
        })
        .select("id")
        .single();

      if (insertError) {
        report.errors.push({
          itemId: item.id,
          error: `Failed to insert pending reminder: ${insertError.message}`,
        });
        continue;
      }
      reminderId = insertedReminder.id;
    }

    // 6. Generate and send the reminder email via Resend
    try {
      const emailContent = generateWarrantyReminderEmail({
        recipientEmail: userEmail,
        productName: item.product_name,
        brand: item.brand,
        category: item.category,
        seller: item.seller,
        purchaseDate: item.purchase_date,
        price: item.price,
        currency: item.currency || "INR",
        warrantyExpiryDate: item.warranty_expiry_date,
        daysUntilExpiry: daysRemaining,
        itemId: item.id,
      });

      const senderEmail = getSenderEmail();

      if (!resend) {
        throw new Error("Resend client not initialized");
      }

      const sendResult = await resend.emails.send({
        from: senderEmail,
        to: [userEmail],
        subject: emailContent.subject,
        html: emailContent.html,
        text: emailContent.text,
      });

      if (sendResult.error) {
        throw new Error(sendResult.error.message || "Failed to send email via Resend");
      }

      // 7. Mark reminder as sent
      await db
        .from("reminders")
        .update({ sent: true })
        .eq("id", reminderId);

      report.remindersSent++;
      report.details.push({
        itemId: item.id,
        productName: item.product_name,
        userEmail,
        daysUntilExpiry: daysRemaining,
        action: "sent",
      });
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Unknown email sending error";
      report.errors.push({ itemId: item.id, error: errorMessage });
      report.details.push({
        itemId: item.id,
        productName: item.product_name,
        userEmail,
        daysUntilExpiry: daysRemaining,
        action: "error",
        error: errorMessage,
      });
    }
  }

  if (report.errors.length > 0 && report.remindersSent === 0) {
    report.success = false;
  }

  return report;
}
