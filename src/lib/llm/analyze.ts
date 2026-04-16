/**
 * LLM Analysis Orchestration
 *
 * High-level functions that the pipeline calls. Each one:
 * 1. Checks the cache
 * 2. Builds the prompt messages
 * 3. Calls the LLM provider
 * 4. Parses and validates the response
 * 5. Caches the result
 *
 * If no LLM provider is configured, these functions return null
 * and the pipeline falls back to rule-engine-only results.
 */

import type { LLMProvider } from "./provider";
import { parseJSONResponse } from "./provider";
import { AnthropicProvider } from "./providers/anthropic";
import { getCached, setCache } from "./cache";
import { buildToneAnalysisMessages } from "./prompts/tone-analysis";
import { buildStructuralFallacyMessages } from "./prompts/structural-fallacy";
import { buildNeutralReframingMessages } from "./prompts/neutral-reframing";
import { buildAxisMappingMessages } from "./prompts/axis-mapping";
import {
  buildClaimExtractionMessages,
  type ClaimExtractionInput,
  type ClaimExtractionOutput,
} from "./prompts/claim-extraction";
import {
  buildOmissionDetectionMessages,
  type OmissionDetectionInput,
  type OmissionDetectionOutput,
} from "./prompts/omission-detection";
import {
  buildEpistemologicalRefinementMessages,
  type EpistemologicalRefinementInput,
  type EpistemologicalRefinementOutput,
} from "./prompts/epistemological-classification";
import type {
  ToneAnalysisInput,
  ToneAnalysisOutput,
  StructuralFallacyInput,
  StructuralFallacyOutput,
  ReframingSuggestionInput,
  ReframingSuggestionOutput,
  AxisMappingInput,
  AxisMappingOutput,
} from "./types";

// Global provider — set via configureLLM() at app startup
let provider: LLMProvider | null = null;

export function configureLLM(p: LLMProvider): void {
  provider = p;
}

export function isLLMConfigured(): boolean {
  return provider !== null;
}

/**
 * Auto-configure from environment variables. Idempotent — safe to call
 * multiple times. Returns true if a provider is now configured.
 *
 * Recognised vars:
 *   ANTHROPIC_API_KEY   — required for the Anthropic provider
 *   LLM_MODEL           — optional override (default: claude-sonnet-4-6)
 *   LLM_MAX_TOKENS      — optional override (default: 4096)
 */
export function configureLLMFromEnv(): boolean {
  if (provider) return true;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (anthropicKey) {
    provider = new AnthropicProvider({
      apiKey: anthropicKey,
      model: process.env.LLM_MODEL,
      maxTokens: process.env.LLM_MAX_TOKENS
        ? Number(process.env.LLM_MAX_TOKENS)
        : undefined,
    });
    return true;
  }
  return false;
}

// ─── Tone/Sentiment Analysis ────────────────────────────────────────

export async function analyzeTone(
  input: ToneAnalysisInput
): Promise<ToneAnalysisOutput | null> {
  if (!provider) return null;

  const cached = getCached(input.text, "tone-analysis");
  if (cached) return parseJSONResponse<ToneAnalysisOutput>(cached);

  const messages = buildToneAnalysisMessages(input);
  const response = await provider.complete(messages);

  setCache(input.text, "tone-analysis", response.content);
  return parseJSONResponse<ToneAnalysisOutput>(response.content);
}

// ─── Structural Fallacy Detection ───────────────────────────────────

export async function detectStructuralFallacies(
  input: StructuralFallacyInput
): Promise<StructuralFallacyOutput | null> {
  if (!provider) return null;

  const cached = getCached(input.text, "structural-fallacy");
  if (cached) return parseJSONResponse<StructuralFallacyOutput>(cached);

  const messages = buildStructuralFallacyMessages(input);
  const response = await provider.complete(messages);

  setCache(input.text, "structural-fallacy", response.content);
  return parseJSONResponse<StructuralFallacyOutput>(response.content);
}

// ─── Neutral Reframing ──────────────────────────────────────────────

export async function suggestNeutralReframing(
  input: ReframingSuggestionInput
): Promise<ReframingSuggestionOutput | null> {
  if (!provider) return null;

  // Cache on the excerpt, not full context
  const cached = getCached(input.originalExcerpt, "neutral-reframing");
  if (cached) return parseJSONResponse<ReframingSuggestionOutput>(cached);

  const messages = buildNeutralReframingMessages(input);
  const response = await provider.complete(messages);

  setCache(input.originalExcerpt, "neutral-reframing", response.content);
  return parseJSONResponse<ReframingSuggestionOutput>(response.content);
}

// ─── 5-Axis Bias Mapping ────────────────────────────────────────────

export async function mapToAxes(
  input: AxisMappingInput
): Promise<AxisMappingOutput | null> {
  if (!provider) return null;

  const cached = getCached(input.text, "axis-mapping");
  if (cached) return parseJSONResponse<AxisMappingOutput>(cached);

  const messages = buildAxisMappingMessages(input);
  const response = await provider.complete(messages);

  setCache(input.text, "axis-mapping", response.content);
  return parseJSONResponse<AxisMappingOutput>(response.content);
}

// ─── Claim Extraction ───────────────────────────────────────────────

export async function extractClaims(
  input: ClaimExtractionInput
): Promise<ClaimExtractionOutput | null> {
  if (!provider) return null;

  const cached = getCached(input.text, "claim-extraction");
  if (cached) return parseJSONResponse<ClaimExtractionOutput>(cached);

  const messages = buildClaimExtractionMessages(input);
  const response = await provider.complete(messages);

  setCache(input.text, "claim-extraction", response.content);
  return parseJSONResponse<ClaimExtractionOutput>(response.content);
}

// ─── Omission Detection ─────────────────────────────────────────────

export async function detectOmissions(
  input: OmissionDetectionInput
): Promise<OmissionDetectionOutput | null> {
  if (!provider) return null;

  // Cache key is source-specific since each source gets a different analysis
  const cacheKey = `${input.sourceName}:${input.storyDescription}`;
  const cached = getCached(cacheKey, "omission-detection");
  if (cached) return parseJSONResponse<OmissionDetectionOutput>(cached);

  const messages = buildOmissionDetectionMessages(input);
  const response = await provider.complete(messages);

  setCache(cacheKey, "omission-detection", response.content);
  return parseJSONResponse<OmissionDetectionOutput>(response.content);
}

// ─── Epistemological Classification (LLM Refinement) ────────────────

export async function refineEpistemologicalClassification(
  input: EpistemologicalRefinementInput
): Promise<EpistemologicalRefinementOutput | null> {
  if (!provider) return null;

  const cacheKey = `${input.sourceName}:${input.articleTitle}:epist`;
  const cached = getCached(cacheKey, "epistemological-classification");
  if (cached)
    return parseJSONResponse<EpistemologicalRefinementOutput>(cached);

  const messages = buildEpistemologicalRefinementMessages(input);
  const response = await provider.complete(messages);

  setCache(cacheKey, "epistemological-classification", response.content);
  return parseJSONResponse<EpistemologicalRefinementOutput>(response.content);
}
