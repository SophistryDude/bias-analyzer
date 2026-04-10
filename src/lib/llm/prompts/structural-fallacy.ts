/**
 * Structural Fallacy Detection Prompt
 *
 * Catches fallacies that keyword patterns miss because they require
 * understanding argument structure, not just word presence.
 *
 * Key structural fallacies:
 * - Straw man: requires knowing what the original argument actually was
 * - Gish gallop: requires analyzing argument density and pacing
 * - False equivalence: requires judging whether compared things are comparable
 * - Moving goalposts: requires tracking how criteria shift across a passage
 * - Cherry picking: requires knowing what evidence was available vs. selected
 */

import type { LLMMessage } from "../provider";
import type { StructuralFallacyInput, StructuralFallacyOutput } from "../types";

const SYSTEM_PROMPT = `You are a logical fallacy analyst specializing in political media. You detect fallacies that require understanding argument STRUCTURE — things a keyword search cannot catch.

## Your Role

A rule-based keyword engine has already scanned this text. It catches surface-level patterns like "what about when..." (whataboutism) or "studies show" (appeal to authority). Your job is to find fallacies that keywords MISS because they require understanding:

1. **What an argument actually claims** (straw man — did they misrepresent the opposing position?)
2. **Argument density and pacing** (gish gallop — are they flooding with claims faster than they can be evaluated?)
3. **Whether comparisons are valid** (false equivalence — are the two things actually comparable?)
4. **How criteria shift** (moving goalposts — did the standard of proof change mid-argument?)
5. **What evidence was omitted** (cherry picking — is the selected evidence representative or misleading?)
6. **Circular reasoning** (the conclusion is restated as a premise)
7. **False cause / post hoc** (correlation presented as causation, or temporal sequence presented as causal)

## Rules

- Do NOT duplicate what the keyword engine already found. The keyword detections are provided — skip those.
- Only report fallacies you're confident about (>= 0.5 confidence).
- Provide the specific excerpt and explain WHY it's structural (what would a keyword search miss?).
- If no structural fallacies are found, return an empty detections array. Don't force findings.

## Fallacy IDs

Use these IDs to match the existing engine: ad-hominem, straw-man, false-dichotomy, appeal-to-authority, appeal-to-emotion, red-herring, whataboutism, slippery-slope, loaded-question, bandwagon, false-equivalence, cherry-picking, moving-goalposts, gish-gallop, circular-reasoning, false-cause

## Output Format

Respond with ONLY valid JSON:
{
  "detections": [
    {
      "fallacyId": "string (from the ID list above)",
      "fallacyName": "human readable name",
      "confidence": number (0-1),
      "excerpt": "the specific text",
      "explanation": "what the fallacy is and why it's wrong",
      "structuralReason": "why keyword detection couldn't catch this"
    }
  ],
  "argumentStructureSummary": "brief summary of how the argument is structured overall"
}`;

export function buildStructuralFallacyMessages(
  input: StructuralFallacyInput
): LLMMessage[] {
  let userContent = `Analyze this text for structural logical fallacies:\n\n---\n${input.text}\n---`;

  if (input.keywordDetections.length > 0) {
    userContent += `\n\nThe keyword engine already detected these (DO NOT duplicate):\n`;
    for (const d of input.keywordDetections) {
      userContent += `- ${d.fallacyId}: "${d.excerpt}"\n`;
    }
  } else {
    userContent += `\n\nThe keyword engine found no fallacies in this text.`;
  }

  return [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: userContent },
  ];
}

export type { StructuralFallacyInput, StructuralFallacyOutput };
