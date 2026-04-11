/**
 * LLM Response Cache
 *
 * Content-hash-based caching to avoid re-analyzing identical text.
 * Uses the database if available, falls back to in-memory Map.
 *
 * Cache keys are: hash(text) + promptType
 * This means the same article cached for tone-analysis won't collide
 * with its structural-fallacy cache entry.
 */

import { createHash } from "crypto";

export type PromptType =
  | "tone-analysis"
  | "structural-fallacy"
  | "neutral-reframing"
  | "axis-mapping"
  | "claim-extraction"
  | "omission-detection"
  | "epistemological-classification";

// In-memory cache (replaced with DB-backed cache in Phase 3+)
const cache = new Map<string, { result: string; cachedAt: number }>();

// Cache entries expire after 7 days
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function buildCacheKey(text: string, promptType: PromptType): string {
  const hash = createHash("sha256").update(text).digest("hex").slice(0, 16);
  return `${promptType}:${hash}`;
}

export function getCached(
  text: string,
  promptType: PromptType
): string | null {
  const key = buildCacheKey(text, promptType);
  const entry = cache.get(key);
  if (!entry) return null;

  if (Date.now() - entry.cachedAt > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }

  return entry.result;
}

export function setCache(
  text: string,
  promptType: PromptType,
  result: string
): void {
  const key = buildCacheKey(text, promptType);
  cache.set(key, { result, cachedAt: Date.now() });
}
