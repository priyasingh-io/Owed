import { z } from "zod";

/**
 * Validates user input when requesting an AI warranty claim draft.
 */
export const claimDraftInputSchema = z.object({
  itemId: z.string().min(1, "Item ID is required"),
  issueDescription: z
    .string()
    .min(10, "Please describe the issue in at least 10 characters")
    .max(2000, "Description cannot exceed 2000 characters"),
  desiredResolution: z
    .enum(["repair", "replacement", "refund", "other"])
    .default("repair"),
  defectDate: z.string().optional(),
});

export type ClaimDraftInput = z.infer<typeof claimDraftInputSchema>;

/**
 * Structured schema returned by the AI claim drafting model.
 * Strict OpenAI Structured Outputs compatible: all properties required.
 */
export const claimOutputSchema = z.object({
  subject: z
    .string()
    .describe("Compelling and formal email subject line including product name and claim type"),
  recipient_suggestion: z
    .string()
    .describe("Recommended customer support department or retailer warranty desk to contact"),
  body: z
    .string()
    .describe("Full formal warranty claim email letter written professionally with consumer rights references"),
  summary: z
    .string()
    .describe("Concise 1-sentence summary of the claim for quick display"),
  suggested_attachments: z
    .array(z.string())
    .describe("List of recommended documents or photos the user should attach to their email"),
});

export type ClaimOutputData = z.infer<typeof claimOutputSchema>;
