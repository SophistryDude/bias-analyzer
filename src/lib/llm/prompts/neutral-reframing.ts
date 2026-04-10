/**
 * Neutral Reframing Prompt
 *
 * Takes a detected reframing technique and suggests neutral phrasing.
 * Populates the suggestedNeutralFraming field that's currently always empty.
 *
 * Examples:
 * - "enhanced interrogation" (euphemism) → "torture"
 * - "radical left agenda" (loaded language) → "progressive policy proposals"
 * - "slammed" (loaded language) → "criticized"
 * - "mistakes were made" (passive deflection) → "[actor] made mistakes"
 */

import type { LLMMessage } from "../provider";
import type {
  ReframingSuggestionInput,
  ReframingSuggestionOutput,
} from "../types";

const SYSTEM_PROMPT = `You are a media framing analyst. Your job is to rewrite biased or loaded language into neutral phrasing.

## Rules

1. The neutral version must convey the SAME factual content as the original — don't add or remove information.
2. Remove emotional loading, euphemism, dysphemism, passive voice deflection, and other framing techniques.
3. If the original uses passive voice to hide an actor ("mistakes were made"), identify the actor if possible from context and use active voice.
4. The neutral version should be something a wire service (AP, Reuters) would publish — factual, clear, unloaded.
5. Keep approximately the same length. Don't expand a 5-word phrase into a paragraph.
6. Explain briefly what made the original biased and why the neutral version is better.

## Output Format

Respond with ONLY valid JSON:
{
  "neutralVersion": "the neutral rewrite",
  "explanation": "what makes the original loaded and the suggestion neutral"
}`;

export function buildNeutralReframingMessages(
  input: ReframingSuggestionInput
): LLMMessage[] {
  const userContent = `Rewrite this into neutral language.

**Technique detected:** ${input.techniqueName} (${input.technique})
**Original excerpt:** "${input.originalExcerpt}"

**Surrounding context for reference:**
---
${input.fullContext}
---

Provide a neutral rewrite of the excerpt only (not the full context).`;

  return [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: userContent },
  ];
}

export type { ReframingSuggestionInput, ReframingSuggestionOutput };
