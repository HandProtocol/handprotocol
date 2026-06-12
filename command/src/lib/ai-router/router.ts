/*
  AI router, command center build.
  Ported from kohlabsAI/nerve/packages/ai-router/src/router.ts. Trimmed:
    - chat only (no image generation in Phase 2)
    - anthropic and xai providers wired; openai and venice stubbed
    - no external logger dependency

  Provider selection follows the AI stance framing doc: any key set
  registers its provider; AI_PRIMARY_PROVIDER decides the lead;
  AI_FALLBACK_PROVIDERS defines the fallback chain. Operator-facing UI
  never names the provider; it surfaces only here and in assistant_runs.
*/
import { AnthropicProvider } from "./providers/anthropic";
import { XAIProvider } from "./providers/xai";
import type {
  ChatCompletionRequest,
  ChatCompletionResponse,
  LLMProvider,
  ProviderConfig,
  RouterConfig,
} from "./types";

type ProviderFactory = (config: ProviderConfig) => LLMProvider;

const PROVIDER_FACTORIES: Record<string, ProviderFactory> = {
  anthropic: (config) => new AnthropicProvider(config),
  xai: (config) => new XAIProvider(config),
  // openai and venice are stubbed until their keys land.
};

export class AIRouter {
  private providers: Map<string, LLMProvider> = new Map();
  private config: RouterConfig;

  constructor(config: RouterConfig) {
    this.config = config;
    for (const [name, providerConfig] of Object.entries(config.providers)) {
      const factory = PROVIDER_FACTORIES[name];
      if (!factory || !providerConfig.apiKey) continue;
      this.providers.set(name, factory(providerConfig));
    }
  }

  hasAnyProvider(): boolean {
    return this.providers.size > 0;
  }

  private getProviderOrder(preferred?: string): string[] {
    const primary = preferred || this.config.primary;
    return [primary, ...this.config.fallbacks.filter((f) => f !== primary)];
  }

  async chat(
    req: ChatCompletionRequest,
    preferredProvider?: string,
  ): Promise<ChatCompletionResponse> {
    const tryOrder = this.getProviderOrder(preferredProvider);
    let lastError: Error | null = null;

    for (const providerName of tryOrder) {
      const provider = this.providers.get(providerName);
      if (!provider) continue;
      try {
        return await provider.chat(req);
      } catch (err) {
        lastError = err as Error;
      }
    }

    throw lastError || new Error("No AI providers configured");
  }

  // Rough cost estimates in USD per token, for the assistant_runs log.
  // Update when pricing changes; the operator-facing surface shows only
  // the monthly total, never per-model breakdowns.
  estimateCost(model: string, promptTokens: number, completionTokens: number): number {
    const costMap: Record<string, { input: number; output: number }> = {
      "claude-sonnet-4-5-20250929": { input: 3, output: 15 },
      "claude-opus-4-20250514": { input: 15, output: 75 },
      "claude-haiku-4-5-20251001": { input: 0.8, output: 4 },
      "gpt-4o": { input: 2.5, output: 10 },
      "gpt-4o-mini": { input: 0.15, output: 0.6 },
      // xAI Grok rates (verify against current pricing page when budget gets tight)
      "grok-3": { input: 3, output: 15 },
      "grok-3-mini": { input: 0.3, output: 0.5 },
      "grok-4": { input: 5, output: 25 },
      "grok-4.3": { input: 5, output: 25 },
      "grok-4-fast": { input: 1, output: 4 },
    };
    const rates = costMap[model] || { input: 1, output: 1 };
    return (
      (promptTokens / 1_000_000) * rates.input +
      (completionTokens / 1_000_000) * rates.output
    );
  }
}

let _instance: AIRouter | null = null;

export function getAIRouter(): AIRouter {
  if (!_instance) _instance = new AIRouter(buildConfigFromEnv());
  return _instance;
}

export function resetAIRouter(): void {
  _instance = null;
}

function buildConfigFromEnv(): RouterConfig {
  // Default primary is xai (cheap and fast for the drafting use case).
  // Override with AI_PRIMARY_PROVIDER. The router will only pick a
  // provider whose API key is set, so the default is a hint, not a
  // requirement.
  const primary = process.env.AI_PRIMARY_PROVIDER || "xai";
  const fallbacks = (process.env.AI_FALLBACK_PROVIDERS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const providers: RouterConfig["providers"] = {};

  if (process.env.XAI_API_KEY) {
    providers.xai = {
      name: "xai",
      apiKey: process.env.XAI_API_KEY,
      defaultModel:
        process.env.XAI_DEFAULT_MODEL ||
        process.env.AI_DEFAULT_MODEL ||
        "grok-3-mini",
    };
  }

  if (process.env.ANTHROPIC_API_KEY) {
    providers.anthropic = {
      name: "anthropic",
      apiKey: process.env.ANTHROPIC_API_KEY,
      defaultModel:
        process.env.ANTHROPIC_DEFAULT_MODEL ||
        process.env.AI_DEFAULT_MODEL ||
        "claude-sonnet-4-5-20250929",
    };
  }

  return { primary, fallbacks, providers };
}
