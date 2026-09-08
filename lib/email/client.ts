import { Resend } from "resend";

let resendInstance: Resend | null = null;

/**
 * Returns an initialized Resend client instance using RESEND_API_KEY.
 */
export function getResendClient(): Resend {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("Missing RESEND_API_KEY environment variable.");
  }
  if (!resendInstance) {
    resendInstance = new Resend(apiKey);
  }
  return resendInstance;
}

/**
 * Resolves the from address for outgoing emails.
 * Uses EMAIL_FROM if set and valid, but falls back to onboarding@resend.dev
 * if an unverified public webmail provider (e.g. @gmail.com) is used in testing.
 */
export function getSenderEmail(): string {
  const configured = process.env.EMAIL_FROM;
  if (configured) {
    // Resend prohibits unverified third-party domains like @gmail.com as the 'from' address
    const isPublicWebmail = /@(gmail|yahoo|hotmail|outlook)\.com/i.test(configured);
    if (isPublicWebmail) {
      return "Owed <onboarding@resend.dev>";
    }
    return configured;
  }
  return "Owed <onboarding@resend.dev>";
}
