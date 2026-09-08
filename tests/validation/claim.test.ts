import { describe, it, expect } from "vitest";
import {
  claimDraftInputSchema,
  claimOutputSchema,
} from "@/lib/validation/claim";

describe("Claim Validation Schemas", () => {
  describe("claimDraftInputSchema", () => {
    it("validates a valid claim draft input", () => {
      const input = {
        itemId: "item-123",
        issueDescription: "Screen started flickering and display went completely black after normal usage.",
        desiredResolution: "repair",
      };

      const result = claimDraftInputSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.desiredResolution).toBe("repair");
      }
    });

    it("defaults desiredResolution to repair if not provided", () => {
      const input = {
        itemId: "item-123",
        issueDescription: "Battery will no longer charge past 10% after 6 months.",
      };

      const result = claimDraftInputSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.desiredResolution).toBe("repair");
      }
    });

    it("rejects issue description that is too short (< 10 chars)", () => {
      const input = {
        itemId: "item-123",
        issueDescription: "Broken",
      };

      const result = claimDraftInputSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it("rejects missing itemId", () => {
      const input = {
        itemId: "",
        issueDescription: "Speaker produces buzzing audio distortion.",
      };

      const result = claimDraftInputSchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });

  describe("claimOutputSchema", () => {
    it("validates structured AI claim output", () => {
      const output = {
        subject: "[Warranty Claim] Apple MacBook Pro - Hardware Defect",
        recipient_suggestion: "Apple Customer Support / Best Buy Returns",
        body: "Dear Customer Support,\n\nI am writing to formally claim warranty coverage...",
        summary: "Claim for flickering screen repair under 1-year manufacturer warranty.",
        suggested_attachments: ["Proof of purchase receipt", "Photos of display glitch"],
      };

      const result = claimOutputSchema.safeParse(output);
      expect(result.success).toBe(true);
    });

    it("rejects incomplete claim output missing required fields", () => {
      const output = {
        subject: "Claim",
        // missing body, recipient, summary, etc.
      };

      const result = claimOutputSchema.safeParse(output);
      expect(result.success).toBe(false);
    });
  });
});
