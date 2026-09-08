import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { getAIProvider, getModel, DEFAULT_MODELS } from "@/lib/ai/models";

describe("AI Models Resolver", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("defaults to 'anthropic' provider when neither AI_PROVIDER nor AI_GATEWAY_API_KEY is set", () => {
    delete process.env.AI_PROVIDER;
    delete process.env.AI_GATEWAY_API_KEY;
    expect(getAIProvider()).toBe("anthropic");
  });

  it("defaults to 'gateway' provider when AI_GATEWAY_API_KEY is set without explicit AI_PROVIDER", () => {
    delete process.env.AI_PROVIDER;
    process.env.AI_GATEWAY_API_KEY = "vck_test_key";
    expect(getAIProvider()).toBe("gateway");
  });

  it("resolves configured provider from AI_PROVIDER environment variable", () => {
    process.env.AI_PROVIDER = "gateway";
    expect(getAIProvider()).toBe("gateway");

    process.env.AI_PROVIDER = "openai";
    expect(getAIProvider()).toBe("openai");

    process.env.AI_PROVIDER = "google";
    expect(getAIProvider()).toBe("google");
  });

  it("instantiates model instance for supported providers", () => {
    const gatewayModel = getModel("gateway");
    expect((gatewayModel as any).modelId).toBe(DEFAULT_MODELS.gateway);

    const anthropicModel = getModel("anthropic");
    expect((anthropicModel as any).modelId).toBe(DEFAULT_MODELS.anthropic);

    const openaiModel = getModel("openai");
    expect((openaiModel as any).modelId).toBe(DEFAULT_MODELS.openai);

    const googleModel = getModel("google");
    expect((googleModel as any).modelId).toBe(DEFAULT_MODELS.google);
  });
});
