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

  it("defaults to 'anthropic' provider when AI_PROVIDER is not set", () => {
    delete process.env.AI_PROVIDER;
    expect(getAIProvider()).toBe("anthropic");
  });

  it("resolves configured provider from AI_PROVIDER environment variable", () => {
    process.env.AI_PROVIDER = "openai";
    expect(getAIProvider()).toBe("openai");

    process.env.AI_PROVIDER = "google";
    expect(getAIProvider()).toBe("google");
  });

  it("instantiates model instance for supported providers", () => {
    const anthropicModel = getModel("anthropic");
    expect((anthropicModel as any).modelId).toBe(DEFAULT_MODELS.anthropic);

    const openaiModel = getModel("openai");
    expect((openaiModel as any).modelId).toBe(DEFAULT_MODELS.openai);

    const googleModel = getModel("google");
    expect((googleModel as any).modelId).toBe(DEFAULT_MODELS.google);
  });
});
