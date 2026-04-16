/**
 * Anthropic provider — talks to the Messages API over fetch.
 *
 * No SDK dependency (project rule: LLM calls are provider-agnostic).
 */

import type { LLMMessage, LLMProvider, LLMResponse } from "../provider";

interface AnthropicProviderOptions {
  apiKey: string;
  model?: string;
  maxTokens?: number;
  baseUrl?: string;
}

interface AnthropicMessagesResponse {
  content: Array<{ type: string; text?: string }>;
  usage?: { input_tokens: number; output_tokens: number };
  error?: { type: string; message: string };
}

export class AnthropicProvider implements LLMProvider {
  private readonly apiKey: string;
  private readonly model: string;
  private readonly maxTokens: number;
  private readonly baseUrl: string;

  constructor(opts: AnthropicProviderOptions) {
    this.apiKey = opts.apiKey;
    this.model = opts.model ?? "claude-sonnet-4-6";
    this.maxTokens = opts.maxTokens ?? 4096;
    this.baseUrl = opts.baseUrl ?? "https://api.anthropic.com";
  }

  async complete(messages: LLMMessage[]): Promise<LLMResponse> {
    // Anthropic treats `system` as a top-level field, not a role in `messages`.
    const systemParts = messages
      .filter((m) => m.role === "system")
      .map((m) => m.content);
    const convo = messages
      .filter((m) => m.role !== "system")
      .map((m) => ({ role: m.role, content: m.content }));

    const body: Record<string, unknown> = {
      model: this.model,
      max_tokens: this.maxTokens,
      messages: convo,
    };
    if (systemParts.length > 0) body.system = systemParts.join("\n\n");

    const res = await fetch(`${this.baseUrl}/v1/messages`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": this.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(
        `Anthropic API ${res.status} ${res.statusText}: ${errText}`
      );
    }

    const data = (await res.json()) as AnthropicMessagesResponse;
    if (data.error) {
      throw new Error(`Anthropic API error: ${data.error.type}: ${data.error.message}`);
    }

    const text = data.content
      .filter((b) => b.type === "text" && typeof b.text === "string")
      .map((b) => b.text as string)
      .join("");

    return {
      content: text,
      usage: data.usage && {
        inputTokens: data.usage.input_tokens,
        outputTokens: data.usage.output_tokens,
      },
    };
  }
}
