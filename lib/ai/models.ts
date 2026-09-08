import { anthropic } from "@ai-sdk/anthropic";
import { openai } from "@ai-sdk/openai";
import { google } from "@ai-sdk/google";
import { gateway, type LanguageModel } from "ai";

export type SupportedAIProvider = "gateway" | "anthropic" | "openai" | "google";

export const DEFAULT_MODELS: Record<SupportedAIProvider, string> = {
  gateway: "anthropic/claude-3-5-sonnet",
  anthropic: "claude-3-5-sonnet-latest",
  openai: "gpt-4o",
  google: "gemini-2.0-flash",
};

/**
 * Returns the active AI provider configured in the environment.
 * Defaults to 'gateway' if AI_GATEWAY_API_KEY is present, otherwise 'anthropic'.
 */
export function getAIProvider(): SupportedAIProvider {
  const provider = (
    process.env.AI_PROVIDER ||
    (process.env.AI_GATEWAY_API_KEY ? "gateway" : "anthropic")
  ).toLowerCase();

  if (
    provider === "gateway" ||
    provider === "openai" ||
    provider === "google" ||
    provider === "anthropic"
  ) {
    return provider;
  }
  return "gateway";
}

/**
 * Retrieves the configured LanguageModel instance for Vercel AI SDK functions
 * (generateObject, generateText, streamText).
 */
export function getModel(
  providerInput?: SupportedAIProvider,
  modelNameOverride?: string
): LanguageModel {
  const provider = providerInput ?? getAIProvider();
  const modelName =
    modelNameOverride || process.env.AI_MODEL_NAME || DEFAULT_MODELS[provider];

  switch (provider) {
    case "gateway":
      return gateway(modelName);
    case "anthropic":
      return anthropic(modelName);
    case "openai":
      return openai(modelName);
    case "google":
      return google(modelName);
    default:
      return gateway(DEFAULT_MODELS.gateway);
  }
}
