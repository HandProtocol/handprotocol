/*
  xAI provider. Direct fetch, no SDK. xAI's API is OpenAI-compatible
  so the body shape mirrors the OpenAI chat-completions surface.
  Ported from kohlabsAI/nerve/packages/ai-router/src/providers/xai.ts,
  inlined logger removed, otherwise structurally identical.
*/
import type {
  ChatCompletionRequest,
  ChatCompletionResponse,
  LLMProvider,
  ProviderConfig,
} from "../types";

type XAIChoice = {
  message?: { content?: string };
  finish_reason?: string;
};

type XAIResponse = {
  model?: string;
  choices?: XAIChoice[];
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
};

export class XAIProvider implements LLMProvider {
  readonly name = "xai";
  private config: ProviderConfig;

  constructor(config: ProviderConfig) {
    this.config = {
      ...config,
      baseUrl: config.baseUrl || "https://api.x.ai/v1",
      defaultModel: config.defaultModel || "grok-3-mini",
      maxRetries: config.maxRetries ?? 3,
      timeoutMs: config.timeoutMs ?? 60000,
    };
  }

  async chat(req: ChatCompletionRequest): Promise<ChatCompletionResponse> {
    const startTime = Date.now();
    const model = req.model || this.config.defaultModel;

    const response = await fetch(`${this.config.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: req.messages,
        temperature: req.temperature ?? 0.7,
        max_completion_tokens: req.maxTokens ?? 2048,
        top_p: req.topP,
        stop: req.stopSequences,
      }),
      signal: AbortSignal.timeout(this.config.timeoutMs || 60000),
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => "Unknown error");
      throw new Error(`xAI API error ${response.status}: ${errorBody}`);
    }

    const data = (await response.json()) as XAIResponse;
    const latencyMs = Date.now() - startTime;

    return {
      text: data.choices?.[0]?.message?.content || "",
      model: data.model || model,
      provider: this.name,
      finishReason: data.choices?.[0]?.finish_reason || "unknown",
      usage: {
        promptTokens: data.usage?.prompt_tokens || 0,
        completionTokens: data.usage?.completion_tokens || 0,
        totalTokens: data.usage?.total_tokens || 0,
      },
      latencyMs,
    };
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.baseUrl}/models`, {
        headers: { Authorization: `Bearer ${this.config.apiKey}` },
        signal: AbortSignal.timeout(5000),
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}
