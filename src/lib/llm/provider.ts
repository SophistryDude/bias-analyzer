/**
 * LLM Provider — Abstraction Layer
 *
 * Defines how the system talks to an LLM. The prompt templates
 * build the messages, the provider sends them and parses the response.
 *
 * Implementation is pluggable — swap Claude for GPT, local models, etc.
 */

export interface LLMMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface LLMResponse {
  content: string;
  usage?: {
    inputTokens: number;
    outputTokens: number;
  };
}

export interface LLMProvider {
  /**
   * Send messages to the LLM and get a text response back.
   * The caller is responsible for parsing the response into typed output.
   */
  complete(messages: LLMMessage[]): Promise<LLMResponse>;
}

/**
 * Parse a JSON response from the LLM, handling markdown code fences.
 * LLMs often wrap JSON in ```json ... ``` blocks.
 */
export function parseJSONResponse<T>(raw: string): T {
  let cleaned = raw.trim();

  // Strip markdown code fences
  const fenceMatch = cleaned.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
  if (fenceMatch) {
    cleaned = fenceMatch[1].trim();
  }

  return JSON.parse(cleaned) as T;
}
