import { NextRequest, NextResponse } from "next/server";
import { processExpiryReminders } from "@/lib/domain/reminders";

/**
 * Validates request authorization against CRON_SECRET if configured.
 */
function isAuthorized(request: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    // If CRON_SECRET is not configured (e.g. local development), permit invocation
    return true;
  }

  const authHeader = request.headers.get("authorization");
  if (!authHeader) {
    return false;
  }

  return authHeader === `Bearer ${cronSecret}`;
}

/**
 * Handles cron execution for warranty expiry email reminders.
 */
async function handleRemindersCron(request: NextRequest) {
  const startTime = Date.now();

  if (!isAuthorized(request)) {
    return NextResponse.json(
      { error: "Unauthorized. Valid Bearer token required in Authorization header." },
      { status: 401 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get("date") || undefined;
    const dryRunParam = searchParams.get("dryRun");
    const dryRun = dryRunParam === "true" || dryRunParam === "1";

    const report = await processExpiryReminders({
      targetDate: dateParam,
      dryRun,
    });

    const statusCode = report.success ? 200 : 207; // 207 Multi-Status if partial errors

    return NextResponse.json(
      {
        message: `Processed ${report.processedItems} items. Sent: ${report.remindersSent}, Skipped: ${report.remindersSkipped}, Status Updated: ${report.statusUpdated}.`,
        executedAt: new Date().toISOString(),
        durationMs: Date.now() - startTime,
        ...report,
      },
      { status: statusCode }
    );
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        durationMs: Date.now() - startTime,
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  return handleRemindersCron(request);
}

export async function POST(request: NextRequest) {
  return handleRemindersCron(request);
}
