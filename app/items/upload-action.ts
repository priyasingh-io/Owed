"use server";

import { generateObject } from "ai";
import { getModel } from "@/lib/ai/models";
import {
  receiptExtractionSchema,
  processExtractionResult,
  EXTRACTION_SYSTEM_PROMPT,
  EnrichedExtractionResult,
} from "@/lib/ai/receipt-extractor";
import { createClient } from "@/lib/supabase/server";

const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export interface ReceiptUploadResult {
  success?: boolean;
  data?: EnrichedExtractionResult;
  receiptUrl?: string;
  error?: string;
}

/**
 * Upload a receipt file and extract structured warranty & purchase details with Vision AI.
 */
export async function uploadAndExtractReceipt(
  formData: FormData
): Promise<ReceiptUploadResult> {
  try {
    const file = formData.get("file") as File | null;
    if (!file || !(file instanceof File)) {
      return { error: "No receipt file provided. Please select a file to upload." };
    }

    if (file.size > MAX_FILE_SIZE) {
      return { error: "File size exceeds 10MB limit. Please upload a smaller file." };
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return {
        error:
          "Unsupported file type. Please upload a JPG, PNG, WEBP, or PDF receipt.",
      };
    }

    let buffer: Buffer;
    if (typeof file.arrayBuffer === "function") {
      const arrayBuffer = await file.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
    } else {
      const text = await file.text();
      buffer = Buffer.from(text);
    }

    // Upload to Supabase Storage if user is authenticated
    let receiptUrl: string | undefined = undefined;
    try {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const ext = file.name.split(".").pop() || "jpg";
        const filePath = `${user.id}/${crypto.randomUUID()}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from("receipts")
          .upload(filePath, buffer, {
            contentType: file.type,
            upsert: false,
          });

        if (!uploadError) {
          const { data: signedData } = await supabase.storage
            .from("receipts")
            .createSignedUrl(filePath, 60 * 60 * 24 * 365); // 1-year signed URL

          receiptUrl = signedData?.signedUrl || filePath;
        }
      }
    } catch {
      // Cookies or session unavailable (e.g. unauthenticated demo flow or offline test)
    }

    // Prepare Vision AI prompt
    const model = getModel();

    const userMessageContent = [
      {
        type: "text" as const,
        text: "Analyze this receipt document and extract product name, brand, category, seller, purchase date, price, currency, warranty duration in months, and your confidence score.",
      },
      {
        type: "file" as const,
        data: buffer,
        mediaType: file.type,
      },
    ];

    const { object: rawResult } = await generateObject({
      model,
      schema: receiptExtractionSchema,
      system: EXTRACTION_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: userMessageContent,
        },
      ],
    });

    const enriched = processExtractionResult(rawResult);

    return {
      success: true,
      data: enriched,
      receiptUrl,
    };
  } catch (err: unknown) {
    return {
      error:
        err instanceof Error
          ? err.message
          : "An unexpected error occurred during receipt extraction.",
    };
  }
}
