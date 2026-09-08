import { describe, it, expect } from "vitest";
import { signInSchema, signUpSchema, otpSchema } from "@/lib/validation/auth";

describe("Auth Validation Schemas", () => {
  describe("signInSchema", () => {
    it("accepts valid email and password", () => {
      const result = signInSchema.safeParse({
        email: "test@example.com",
        password: "password123",
      });
      expect(result.success).toBe(true);
    });

    it("rejects invalid email", () => {
      const result = signInSchema.safeParse({
        email: "not-an-email",
        password: "password123",
      });
      expect(result.success).toBe(false);
    });

    it("rejects password shorter than 6 characters", () => {
      const result = signInSchema.safeParse({
        email: "test@example.com",
        password: "12345",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("signUpSchema", () => {
    it("accepts valid email and matching passwords", () => {
      const result = signUpSchema.safeParse({
        email: "user@domain.com",
        password: "securepassword",
        confirmPassword: "securepassword",
      });
      expect(result.success).toBe(true);
    });

    it("fails when confirmPassword does not match password", () => {
      const result = signUpSchema.safeParse({
        email: "user@domain.com",
        password: "securepassword",
        confirmPassword: "mismatchedpassword",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("otpSchema", () => {
    it("accepts valid email for passwordless OTP", () => {
      const result = otpSchema.safeParse({
        email: "user@example.com",
      });
      expect(result.success).toBe(true);
    });

    it("rejects invalid email for OTP", () => {
      const result = otpSchema.safeParse({
        email: "invalid-email",
      });
      expect(result.success).toBe(false);
    });
  });
});
