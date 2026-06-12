/*
  Anthropic provider. Direct fetch, no SDK.
  Ported from kohlabsAI/nerve/packages/ai-router/src/providers/anthropic.ts,
  inlined logger removed, otherwise structurally identical.
*/
import type {
  ChatCompletionRequest,
  ChatCompletionResponse,
  LLMProvider,
  ProviderConfig,
} from "../types";

type AnthropicResponse = {
  model?: string;
  stop_reason?: string;
  content?: Array<{ type: string; text?: string }>;
  usage?: { input_tokens?: number; output_tokens?: number };
};

export class AnthropicProvider implements LLMProvider {
  readonly name = "anthropic";
  private config: ProviderConfig;

  constructor(config: ProviderConfig) {
    this.config = {
      ...config,
      baseUrl: config.baseUrl || "https://api.anthropic.com",
      defaultModel: config.defaultModel || "claude-sonnet-4-5-20250929",
      maxRetries: config.maxRetries ?? 3,
      timeoutMs: config.timeoutMs ?? 60000,
    };
  }

  async chat(req: ChatCompletionRequest): Promise<ChatCompletionResponse> {
    const startTime = Date.now();
    const model = req.model || this.config.defaultModel;

    const systemMsg = req.messages.find((m) => m.role === "system");
    const conversationMsgs = req.messages
      .filter((m) => m.role !== "system")
      .map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }));

    const response = await fetch(`${this.config.baseUrl}/v1/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": this.config.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: req.maxTokens ?? 2048,
        temperature: req.temperature ?? 0.7,
        top_p: req.topP,
        stop_sequences: req.stopSequences,
        system: systemMsg?.content,
        messages: conversationMsgs,
      }),
      signal: AbortSignal.timeout(this.config.timeoutMs || 60000),
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => "Unknown error");
      throw new Error(`Anthropic API error ${response.status}: ${errorBody}`);
    }

    const data = (await response.json()) as AnthropicResponse;
    const latencyMs = Date.now() - startTime;

    const textContent =
      data.content
        ?.filter((block) => block.type === "text")
        .map((block) => block.text || "")
        .join("") || "";

    return {
      text: textContent,
      model: data.model || model,
      provider: this.name,
      finishReason: data.stop_reason || "unknown",
      usage: {
        promptTokens: data.usage?.input_tokens || 0,
        completionTokens: data.usage?.output_tokens || 0,
        totalTokens:
          (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0),
      },
      latencyMs,
    };
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.baseUrl}/v1/models`, {
        headers: {
          "x-api-key": this.config.apiKey,
          "anthropic-version": "2023-06-01",
        },
        signal: AbortSignal.timeout(5000),
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}
