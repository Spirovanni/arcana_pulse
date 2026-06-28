/**
 * Unified AI router — normalises calls across Anthropic, OpenAI, and Google.
 *
 * Provider assignment:
 *   assistant chat      → OpenAI GPT-4o  (best conversational reasoning)
 *   financial insights  → Claude Sonnet  (deep analytical reasoning)
 *   categorization      → Gemini Flash   (fast, high-volume classification)
 *   budget / forecast   → Gemini Flash   (fast, structured output)
 *   portfolio / TLH     → Claude Haiku   (financial analysis, low cost)
 */

import { getAnthropicClient } from "@/lib/anthropic";
import { getOpenAIClient, isOpenAIConfigured } from "@/lib/openai";
import { getGoogleAIClient, isGoogleAIConfigured } from "@/lib/google-ai";
import {
  checkAIUsageAllowance,
  estimateTokensFromText,
  recordAIUsage,
} from "@/lib/services/ai/usage";

export type AIProvider = "anthropic" | "openai" | "google";

export interface AIMessage {
  role: "user" | "assistant";
  content: string;
}

export interface AICompletionOptions {
  provider: AIProvider;
  model: string;
  system?: string;
  messages: AIMessage[];
  maxTokens?: number;
  temperature?: number;
}

export interface AICompletionResult {
  text: string;
  provider: AIProvider;
  model: string;
}

// ─── Model catalogue ─────────────────────────────────────────────────────────

export const MODELS = {
  // Anthropic
  CLAUDE_SONNET:  "claude-sonnet-4-6",
  CLAUDE_HAIKU:   "claude-haiku-4-5-20251001",
  // OpenAI
  GPT_4O:         "gpt-4o",
  GPT_4O_MINI:    "gpt-4o-mini",
  // Google
  GEMINI_FLASH:   "gemini-1.5-flash",
  GEMINI_PRO:     "gemini-1.5-pro",
} as const;

export type ModelId = typeof MODELS[keyof typeof MODELS];

// ─── Feature → provider mapping ──────────────────────────────────────────────

export const FEATURE_MODELS: Record<string, { provider: AIProvider; model: string }> = {
  assistant:           { provider: "openai",     model: MODELS.GPT_4O },
  insights:            { provider: "anthropic",  model: MODELS.CLAUDE_SONNET },
  portfolio_insights:  { provider: "anthropic",  model: MODELS.CLAUDE_HAIKU },
  tlh:                 { provider: "anthropic",  model: MODELS.CLAUDE_HAIKU },
  categorize:          { provider: "google",     model: MODELS.GEMINI_FLASH },
  budgets:             { provider: "google",     model: MODELS.GEMINI_FLASH },
  forecast:            { provider: "google",     model: MODELS.GEMINI_PRO },
  goals:               { provider: "anthropic",  model: MODELS.CLAUDE_HAIKU },
};

// ─── Core completion ─────────────────────────────────────────────────────────

export async function complete(opts: AICompletionOptions): Promise<AICompletionResult> {
  const { provider, model, system, messages, maxTokens = 1024 } = opts;

  switch (provider) {
    case "anthropic": {
      const client = getAnthropicClient();
      const response = await client.messages.create({
        model,
        max_tokens: maxTokens,
        ...(system ? { system } : {}),
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
      });
      const text = response.content[0].type === "text" ? response.content[0].text : "";
      return { text, provider, model };
    }

    case "openai": {
      const client = getOpenAIClient();
      const openaiMessages: { role: "system" | "user" | "assistant"; content: string }[] = [];
      if (system) openaiMessages.push({ role: "system", content: system });
      messages.forEach((m) => openaiMessages.push({ role: m.role, content: m.content }));
      const response = await client.chat.completions.create({
        model,
        max_tokens: maxTokens,
        messages: openaiMessages,
      });
      const text = response.choices[0]?.message?.content ?? "";
      return { text, provider, model };
    }

    case "google": {
      const client = getGoogleAIClient();
      const genModel = client.getGenerativeModel({ model });
      const history = messages.slice(0, -1).map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      }));
      const lastMessage = messages[messages.length - 1];
      const prompt = system
        ? `${system}\n\n${lastMessage.content}`
        : lastMessage.content;
      const chat = genModel.startChat({ history });
      const result = await chat.sendMessage(prompt);
      const text = result.response.text();
      return { text, provider, model };
    }
  }
}

// ─── Feature helper — picks the right provider, falls back gracefully ─────────

export async function completeForFeature(
  feature: keyof typeof FEATURE_MODELS,
  system: string,
  userPrompt: string,
  maxTokens = 1024,
  options?: { workspaceId?: string }
): Promise<string> {
  const { provider, model } = FEATURE_MODELS[feature];
  const workspaceId = options?.workspaceId;
  let resolvedPlan: "starter" | "pro" | "team" | null = null;
  const inputTokens =
    estimateTokensFromText(system) + estimateTokensFromText(userPrompt);

  if (workspaceId) {
    const access = await checkAIUsageAllowance(workspaceId, inputTokens, feature);
    if (!access.allowed) {
      throw new Error(access.reason);
    }
    resolvedPlan = access.plan;
  }

  // Fall back through providers if the primary key is absent
  const order: AIProvider[] = buildFallbackChain(provider);

  for (const p of order) {
    if (!isProviderAvailable(p)) continue;
    try {
      const result = await complete({
        provider: p,
        model: p === provider ? model : fallbackModel(p),
        system,
        messages: [{ role: "user", content: userPrompt }],
        maxTokens,
      });
      if (workspaceId && resolvedPlan) {
        await recordAIUsage({
          workspaceId,
          plan: resolvedPlan,
          feature,
          inputTokens,
          outputTokens: estimateTokensFromText(result.text),
        });
      }
      return result.text;
    } catch {
      continue;
    }
  }

  throw new Error(`No AI provider available for feature: ${feature}`);
}

function buildFallbackChain(primary: AIProvider): AIProvider[] {
  const all: AIProvider[] = ["anthropic", "openai", "google"];
  return [primary, ...all.filter((p) => p !== primary)];
}

function isProviderAvailable(p: AIProvider): boolean {
  if (p === "anthropic") return !!process.env.ANTHROPIC_API_KEY;
  if (p === "openai")    return isOpenAIConfigured();
  if (p === "google")    return isGoogleAIConfigured();
  return false;
}

function fallbackModel(p: AIProvider): string {
  if (p === "anthropic") return MODELS.CLAUDE_HAIKU;
  if (p === "openai")    return MODELS.GPT_4O_MINI;
  return MODELS.GEMINI_FLASH;
}
