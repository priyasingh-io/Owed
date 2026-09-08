export interface WarrantyReminderEmailData {
  recipientEmail: string;
  productName: string;
  brand?: string | null;
  category?: string | null;
  seller?: string | null;
  purchaseDate?: string | null;
  price?: number | null;
  currency?: string | null;
  warrantyExpiryDate: string; // ISO date YYYY-MM-DD
  daysUntilExpiry: number;
  itemId: string;
  appUrl?: string;
}

export interface GeneratedReminderEmail {
  subject: string;
  html: string;
  text: string;
}

/**
 * Formats an ISO date string (YYYY-MM-DD) into a human-readable format.
 */
function formatDate(isoDate: string): string {
  try {
    const [year, month, day] = isoDate.split("-").map((s) => parseInt(s, 10));
    if (!year || !month || !day) return isoDate;
    const date = new Date(Date.UTC(year, month - 1, day));
    return date.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
      timeZone: "UTC",
    });
  } catch {
    return isoDate;
  }
}

/**
 * Determines the subject line and urgency styling badge based on remaining days.
 */
function getUrgencyConfig(days: number, productName: string) {
  if (days <= 1) {
    return {
      badgeText: "Expires Tomorrow",
      badgeBg: "#fef2f2",
      badgeColor: "#dc2626",
      badgeBorder: "#fecaca",
      subject: `🚨 Urgent: Warranty for ${productName} expires tomorrow!`,
      headline: "Your warranty expires tomorrow!",
      subtext:
        "This is your final reminder. After tomorrow, you may no longer be eligible for free repairs, replacements, or manufacturer support.",
    };
  } else if (days <= 7) {
    return {
      badgeText: "Expires in 7 Days",
      badgeBg: "#fffbeb",
      badgeColor: "#d97706",
      badgeBorder: "#fde68a",
      subject: `⚠️ 1 Week Left: Warranty for ${productName} expires in 7 days`,
      headline: "Your warranty expires in 1 week",
      subtext:
        "Check your device or appliance for any defects or failing components now while you can still submit a free claim.",
    };
  } else {
    return {
      badgeText: `Expires in ${days} Days`,
      badgeBg: "#eff6ff",
      badgeColor: "#2563eb",
      badgeBorder: "#bfdbfe",
      subject: `📅 Notice: Warranty for ${productName} expires in ${days} days`,
      headline: `Your warranty expires in ${days} days`,
      subtext:
        "Keep this date in mind. Review the item condition so you don't miss out on coverage if repairs are needed.",
    };
  }
}

/**
 * Generates responsive HTML and plaintext email content for a warranty expiration reminder.
 */
export function generateWarrantyReminderEmail(
  data: WarrantyReminderEmailData
): GeneratedReminderEmail {
  const {
    productName,
    brand,
    category,
    seller,
    purchaseDate,
    price,
    currency = "INR",
    warrantyExpiryDate,
    daysUntilExpiry,
    itemId,
    appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  } = data;

  const urgency = getUrgencyConfig(daysUntilExpiry, productName);
  const formattedExpiry = formatDate(warrantyExpiryDate);
  const formattedPurchase = purchaseDate ? formatDate(purchaseDate) : null;
  const itemUrl = `${appUrl.replace(/\/+$/, "")}/?item=${encodeURIComponent(itemId)}`;
  const formattedPrice =
    price !== undefined && price !== null
      ? `${currency} ${price.toLocaleString()}`
      : null;

  const textContent = `
WARRANTY EXPIRATION REMINDER: ${productName} [${urgency.badgeText}]
==================================================

${urgency.headline}
${urgency.subtext}

ITEM DETAILS:
- Product: ${productName}
${brand ? `- Brand: ${brand}\n` : ""}${category ? `- Category: ${category}\n` : ""}${seller ? `- Seller: ${seller}\n` : ""}${formattedPurchase ? `- Purchase Date: ${formattedPurchase}\n` : ""}${formattedPrice ? `- Price: ${formattedPrice}\n` : ""}- Warranty Expiry Date: ${formattedExpiry} (${daysUntilExpiry} day(s) remaining)

ACTIONS:
- View Item Details & Draft Claim: ${itemUrl}
- Go to Owed Dashboard: ${appUrl}

Need to file a claim?
Use Owed's AI Claim Assistant to automatically draft a formal warranty claim letter for ${brand || "the manufacturer"} in seconds.

---
You received this notification because you track this item on Owed.
Settings: Automated reminders at 30, 7, and 1 days before expiry.
`.trim();

  const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${urgency.subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; line-height: 1.5;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 580px; background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
          
          <!-- Header Bar -->
          <tr>
            <td style="padding: 24px 32px; background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); border-bottom: 1px solid #334155;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td>
                    <div style="font-size: 20px; font-weight: 700; color: #ffffff; letter-spacing: -0.5px;">
                      Owed <span style="font-size: 13px; font-weight: 500; color: #94a3b8; margin-left: 8px;">Warranty Protection</span>
                    </div>
                  </td>
                  <td align="right">
                    <span style="display: inline-block; padding: 4px 12px; font-size: 12px; font-weight: 600; border-radius: 9999px; background-color: ${urgency.badgeBg}; color: ${urgency.badgeColor}; border: 1px solid ${urgency.badgeBorder};">
                      ${urgency.badgeText}
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 32px;">
              <h1 style="margin: 0 0 12px 0; font-size: 22px; font-weight: 700; color: #0f172a; line-height: 1.3;">
                ${urgency.headline}
              </h1>
              <p style="margin: 0 0 24px 0; font-size: 15px; color: #475569; line-height: 1.6;">
                ${urgency.subtext}
              </p>

              <!-- Item Card Box -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; margin-bottom: 28px;">
                <tr>
                  <td style="padding: 20px;">
                    <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; color: #64748b; margin-bottom: 8px;">
                      Tracked Item
                    </div>
                    <div style="font-size: 18px; font-weight: 700; color: #0f172a; margin-bottom: 16px;">
                      ${productName}
                    </div>
                    
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="font-size: 14px; border-collapse: collapse;">
                      ${brand ? `
                      <tr>
                        <td style="padding: 6px 0; color: #64748b; width: 40%;">Brand</td>
                        <td style="padding: 6px 0; font-weight: 600; color: #1e293b;">${brand}</td>
                      </tr>` : ""}
                      ${category ? `
                      <tr>
                        <td style="padding: 6px 0; color: #64748b;">Category</td>
                        <td style="padding: 6px 0; font-weight: 600; color: #1e293b;">${category}</td>
                      </tr>` : ""}
                      ${seller ? `
                      <tr>
                        <td style="padding: 6px 0; color: #64748b;">Purchased From</td>
                        <td style="padding: 6px 0; font-weight: 600; color: #1e293b;">${seller}</td>
                      </tr>` : ""}
                      ${formattedPurchase ? `
                      <tr>
                        <td style="padding: 6px 0; color: #64748b;">Purchase Date</td>
                        <td style="padding: 6px 0; font-weight: 600; color: #1e293b;">${formattedPurchase}</td>
                      </tr>` : ""}
                      ${formattedPrice ? `
                      <tr>
                        <td style="padding: 6px 0; color: #64748b;">Purchase Price</td>
                        <td style="padding: 6px 0; font-weight: 600; color: #1e293b;">${formattedPrice}</td>
                      </tr>` : ""}
                      <tr>
                        <td style="padding: 8px 0 0 0; color: #64748b; border-top: 1px dashed #cbd5e1;">Warranty Expiry</td>
                        <td style="padding: 8px 0 0 0; font-weight: 700; color: ${urgency.badgeColor}; border-top: 1px dashed #cbd5e1;">
                          ${formattedExpiry} (${daysUntilExpiry} day${daysUntilExpiry === 1 ? "" : "s"} left)
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Action Buttons -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: 28px;">
                <tr>
                  <td align="center">
                    <a href="${itemUrl}" target="_blank" style="display: inline-block; background-color: #0f172a; color: #ffffff; font-size: 15px; font-weight: 600; text-decoration: none; padding: 14px 28px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                      View Item & File Claim
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Help Callout -->
              <div style="background-color: #f1f5f9; border-left: 4px solid #0f172a; padding: 16px; border-radius: 4px; font-size: 13px; color: #334155; line-height: 1.5;">
                <strong>Experiencing issues?</strong> Use Owed's built-in <em>AI Claim Assistant</em> to draft a professional, manufacturer-ready warranty claim letter with one click before your warranty expires.
              </div>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 32px; background-color: #f8fafc; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b; text-align: center; line-height: 1.6;">
              <p style="margin: 0 0 8px 0;">
                You received this email because you track items on <a href="${appUrl}" style="color: #2563eb; text-decoration: none; font-weight: 600;">Owed</a>.
              </p>
              <p style="margin: 0;">
                Automated warranty reminders are dispatched at 30 days, 7 days, and 1 day before expiration.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`.trim();

  return {
    subject: urgency.subject,
    html: htmlContent,
    text: textContent,
  };
}
