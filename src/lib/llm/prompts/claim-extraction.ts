/**
 * Claim Extraction Prompt
 *
 * Extracts discrete factual claims from a piece of content.
 * Claims are the atomic unit of truth-tracking. They are NOT opinions,
 * framing, or editorial language — they are specific, verifiable assertions.
 *
 * Examples of claims:
 * - "The airstrike killed at least 50 people" (statistic)
 * - "Russia's Defense Ministry denied responsibility" (denial)
 * - "Trump spoke at the Mayflower Hotel" (event)
 * - "Only four NATO members meet the 2% GDP defense spending target" (statistic)
 *
 * NOT claims:
 * - "This devastating attack..." (framing)
 * - "The situation is catastrophic" (opinion, unless attributed)
 * - "Trump panned the 'false song of globalism'" (verbiage/framing analysis, not a factual claim)
 */

import type { LLMMessage } from "../provider";

export interface ClaimExtractionInput {
  text: string;
  title: string;
  sourceName: string;
  storyContext?: string; // brief description of the story for disambiguation
}

export interface ExtractedClaim {
  statement: string; // canonical/normalized form
  sourceWording: string; // exact text from the article
  claimType: "event" | "statistic" | "quote" | "attribution" | "context" | "denial";
  significance: "critical" | "important" | "minor";
  verifiability: "verifiable" | "partially-verifiable" | "unverifiable";
  verificationSource?: string;
  attributedTo?: string; // who/what is the source of this claim in the article
}

export interface ClaimExtractionOutput {
  claims: ExtractedClaim[];
  totalClaimCount: number;
}

const SYSTEM_PROMPT = `You are a fact extraction analyst. Your job is to extract discrete factual claims from news articles. Claims are the atomic unit of truth — specific, concrete assertions that can be compared across sources.

## What IS a claim

A claim is a specific factual assertion. Extract these types:

- **event**: Something that happened. "The hospital was struck by an airstrike on April 27."
- **statistic**: A number or measurement. "At least 50 people were killed." "Only 4 NATO members meet the 2% GDP target."
- **quote**: A direct quote attributed to a specific person. Include who said it.
- **attribution**: Who is blamed or credited for something. "Kerry pointed a finger of blame at the Syrian government."
- **context**: Background facts that provide context. "The war has killed more than 250,000 people since 2011."
- **denial**: An explicit denial of responsibility or fact. "Russia denied it was responsible."

## What is NOT a claim

Do NOT extract:
- Editorial language or framing ("devastating," "outrageous," "controversial")
- Opinions unless they are directly quoted and attributed
- Vague statements without specific content
- Repeated claims (extract each claim once, using the most specific version)

## Rules

1. Normalize each claim into a canonical statement — neutral, precise, stripped of loaded language.
2. Also include the source's exact wording so we can compare framing across outlets.
3. Rate significance: "critical" = central to understanding the story, "important" = adds meaningful detail, "minor" = background/color.
4. Rate verifiability: "verifiable" = can be checked against records/data, "partially-verifiable" = parts can be checked, "unverifiable" = relies entirely on unnamed sources or contested ground truth.
5. If the article attributes the claim to a specific source (MSF, Pentagon, eyewitness), note it in attributedTo.
6. Extract ALL claims, even minor ones. Completeness matters more than brevity here.

## Output Format

Respond with ONLY valid JSON:
{
  "claims": [
    {
      "statement": "normalized canonical claim",
      "sourceWording": "exact text from the article",
      "claimType": "event" | "statistic" | "quote" | "attribution" | "context" | "denial",
      "significance": "critical" | "important" | "minor",
      "verifiability": "verifiable" | "partially-verifiable" | "unverifiable",
      "verificationSource": "what type of source could verify this (optional)",
      "attributedTo": "who the article cites for this claim (optional)"
    }
  ],
  "totalClaimCount": number
}`;

export function buildClaimExtractionMessages(
  input: ClaimExtractionInput
): LLMMessage[] {
  let userContent = `Extract all factual claims from this article.\n\n**Source:** ${input.sourceName}\n**Headline:** ${input.title}`;

  if (input.storyContext) {
    userContent += `\n**Story context:** ${input.storyContext}`;
  }

  userContent += `\n\n---\n${input.text}\n---`;

  return [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: userContent },
  ];
}
