/*
  AI router types. Ported from kohlabsAI/nerve/packages/ai-router/src/types.ts
  with two changes:
    1) No external @kohlabsai/shared dependency. Logger inlined.
    2) Trimmed to chat completion only (image generation not needed for
       Phase 2 of the command center).

  Provider-agnostic. The command center never names a vendor in
  operator-facing copy; the surface code reads from these types alone.
*/

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type ChatCompletionRequest = {
  model?: string;
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  stopSequences?: string[];
};

export type ChatCompletionResponse = {
  text: string;
  model: string;
  provider: string;
  finishReason: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  latencyMs: number;
};

export type ProviderConfig = {
  name: string;
  apiKey: string;
  baseUrl?: string;
  defaultModel: string;
  maxRetries?: number;
  timeoutMs?: number;
};

export type RouterConfig = {
  primary: string;
  fallbacks: string[];
  providers: Record<string, ProviderConfig>;
};

export interface LLMProvider {
  name: string;
  chat(req: ChatCompletionRequest): Promise<ChatCompletionResponse>;
  healthCheck(): Promise<boolean>;
}
