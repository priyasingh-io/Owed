"use server";

import { generateObject } from "ai";
import { revalidatePath } from "next/cache";
import { getModel } from "@/lib/ai/models";
import { createClient } from "@/lib/supabase/server";
import {
  claimDraftInputSchema,
  claimOutputSchema,
  ClaimDraftInput,
  ClaimOutputData,
} from "@/lib/validation/claim";
import { Item } from "@/lib/types/database";

export interface ClaimDraftResult {
  success?: boolean;
  data?: ClaimOutputData;
  claimId?: string;
  error?: string;
}

const CLAIM_SYSTEM_PROMPT = `You are an expert consumer rights advocate and formal warranty claims specialist.
Your role is to write a highly professional, firm, polite, and legally grounded warranty claim email / letter on behalf of a consumer.

Guidelines:
1. Reference exact product details, brand, seller/retailer, purchase date, and price when available.
2. Clearly articulate the specific defect or issue described by the consumer.
3. Assert the consumer's entitlement to remedy (free warranty repair, replacement, or refund per their request) under statutory consumer protection standards and the stated warranty coverage period.
4. Provide a polite but clear timeline for response (typically 7-10 business days).
5. Suggest relevant evidence attachments (e.g. proof of purchase receipt, photo or video of defect, serial number).
6. Maintain a courteous, professional, and resolution-oriented tone throughout.`;

/**
 * Generates an AI-assisted formal warranty claim draft for an item.
 * Persists to Supabase claims table if user is authenticated and item is saved.
 */
export async function generateClaimDraft(
  input: ClaimDraftInput,
  itemContext?: Partial<Item>
): Promise<ClaimDraftResult> {
  try {
    const parseResult = claimDraftInputSchema.safeParse(input);
    if (!parseResult.success) {
      return {
        error: parseResult.error.issues[0]?.message || "Invalid claim input",
      };
    }

    const validatedInput = parseResult.data;

    // Attempt to look up the item from Supabase
    let itemData: Partial<Item> = itemContext || {};
    let supabaseUser = null;
    let supabase = null;

    try {
      supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      supabaseUser = user;

      if (user && validatedInput.itemId && validatedInput.itemId !== "demo-item-1") {
        const { data: dbItem } = await supabase
          .from("items")
          .select("*")
          .eq("id", validatedInput.itemId)
          .single();

        if (dbItem) {
          itemData = { ...dbItem, ...itemData };
        }
      }
    } catch {
      // Cookies or session unavailable (e.g. guest demo or test environment)
    }

    // Construct prompt for AI
    const productName = itemData.product_name || "Product";
    const brand = itemData.brand || "Manufacturer";
    const seller = itemData.seller || "Retailer / Store";
    const purchaseDate = itemData.purchase_date || "Recent purchase";
    const warrantyExpiry = itemData.warranty_expiry_date || "Within warranty period";
    const priceFormatted = itemData.price
      ? `${itemData.currency || "INR"} ${itemData.price}`
      : "Not specified";

    const prompt = `Please draft a formal warranty claim for the following purchase:
- Product: ${productName}
- Brand: ${brand}
- Retailer / Seller: ${seller}
- Purchase Date: ${purchaseDate}
- Warranty Expiration Date: ${warrantyExpiry}
- Purchase Price: ${priceFormatted}
- Proof of Purchase Attached: ${itemData.receipt_file_url ? "Yes (original receipt/invoice document attached)" : "Available upon request"}
- Desired Resolution: ${validatedInput.desiredResolution}
- Defect / Issue Description:
"""${validatedInput.issueDescription}"""

Provide a complete formal email letter, subject line, target department recommendation, summary, and suggested attachments.`;

    const model = getModel();
    const { object } = await generateObject({
      model,
      schema: claimOutputSchema,
      system: CLAIM_SYSTEM_PROMPT,
      prompt,
    });

    let claimId: string | undefined = undefined;

    // Persist to Supabase claims table if user is authenticated and itemId exists
    if (supabase && supabaseUser && validatedInput.itemId) {
      try {
        const { data: claimRecord } = await supabase
          .from("claims")
          .insert({
            item_id: validatedInput.itemId,
            issue_description: validatedInput.issueDescription,
            draft_text: object.body,
            status: "draft",
          })
          .select("id")
          .single();

        if (claimRecord) {
          claimId = claimRecord.id;
          revalidatePath("/");
        }
      } catch {
        // Table insert error can be handled without blocking client display
      }
    }

    return {
      success: true,
      data: object,
      claimId,
    };
  } catch (err: unknown) {
    return {
      error:
        err instanceof Error
          ? err.message
          : "An unexpected error occurred while generating claim draft.",
    };
  }
}

/**
 * Updates status of an existing claim (draft -> sent -> resolved).
 */
export async function updateClaimStatus(
  claimId: string,
  status: "draft" | "sent" | "resolved"
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { error: "You must be signed in to update claim status." };
    }

    const { error } = await supabase
      .from("claims")
      .update({ status })
      .eq("id", claimId);

    if (error) {
      return { error: error.message };
    }

    revalidatePath("/");
    return { success: true };
  } catch (err: unknown) {
    return {
      error:
        err instanceof Error
          ? err.message
          : "Could not update claim status.",
    };
  }
}

/**
 * Retrieves all claims associated with a given item.
 */
export async function getClaimsForItem(itemId: string) {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("claims")
      .select("*")
      .eq("item_id", itemId)
      .order("created_at", { ascending: false });

    if (error) {
      return { error: error.message, data: [] };
    }

    return { data: data || [] };
  } catch (err: unknown) {
    return {
      error:
        err instanceof Error
          ? err.message
          : "Could not fetch claims for item.",
      data: [],
    };
  }
}
