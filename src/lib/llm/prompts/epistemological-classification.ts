/**
 * Epistemological Classification — LLM Refinement Prompt
 *
 * Handles claims the rule-based classifier couldn't categorize.
 * Also validates rule-based classifications when confidence is low,
 * and detects category errors the rules missed.
 *
 * This is LLM Task #12 — derived from the Logic System's
 * epistemological taxonomy. The core insight: bias is presenting
 * tacit understanding as known truth.
 */

import type { LLMMessage } from "../provider";
import type { EpistemologicalStatus } from "../../logic-engine/epistemology";

export interface EpistemologicalRefinementInput {
  /** Claims that need classification or validation */
  claims: {
    index: number;
    statement: string;
    sourceWording: string;
    /** Rule-based classification (if any) */
    ruleStatus?: EpistemologicalStatus;
    ruleConfidence?: number;
  }[];
  /** Article context for disambiguation */
  articleTitle: string;
  sourceName: string;
}

export interface EpistemologicalRefinementOutput {
  classifications: {
    index: number;
    status: EpistemologicalStatus;
    confidence: number;
    reasoning: string;
    categoryError: boolean;
    disguisedAs?: EpistemologicalStatus;
  }[];
}

const SYSTEM_PROMPT = `You are an epistemological analyst. You classify claims by their truth-status type — not whether they are TRUE or FALSE, but what KIND of knowledge they represent.

## The Taxonomy

**verifiable-observation** — Known truth. A specific, concrete fact that can be directly checked against records, documents, footage, or testimony. "The vote was 52-48." "The hospital was struck on April 27." "Kerry issued a statement condemning the attack."

**statistical-claim** — Quantitative assertion that depends on methodology. "Unemployment is at 3.5%." "50 people were killed." Numbers always depend on who counted, how they counted, and what they counted. Two credible sources can report different numbers for the same event.

**tacit-consensus** — Inherited understanding presented as authority. "Experts say..." "It is widely accepted that..." "The scientific consensus is..." These may be correct, but they derive authority from institutional agreement, not direct verification. The claim is: "many authoritative people believe X," not "X is true."

**causal-claim** — Asserts that A caused B. "The policy led to rising crime." "His speech sparked protests." Causation is extremely hard to prove — most causal claims in media are correlations or temporal sequences presented as causal relationships. Not inherently wrong, but a different epistemological category than observation.

**model-dependent** — Interpretation that depends on a framework. "This signals a shift in party strategy." "The market is pricing in recession." These are true WITHIN a particular analytical model but would be different under a different model. They're interpretations, not observations.

**value-judgment** — Normative claim. "This is unacceptable." "We must act." "The right thing to do is..." These express what SHOULD be, not what IS. Often disguised as other types.

## Category Errors (THE KEY INSIGHT)

The most important thing you detect is CATEGORY ERRORS — claims that present themselves as one type but are actually another:

- Value judgment disguised as observation: "The fact is, this policy is wrong." (The word "fact" doesn't make a value judgment into a fact.)
- Tacit consensus disguised as known truth: "Everyone knows that..." (Popularity ≠ verification.)
- Causal claim disguised as observation: "Rising crime forced the policy change." (Presents correlation as established causation.)
- Model-dependent interpretation disguised as fact: "This proves the strategy failed." (Interpretation presented as proof.)

When you detect a category error, set categoryError: true and specify what the claim disguises itself as (disguisedAs).

## Rules

1. Classify each claim by what it IS, not by whether it's true.
2. Multiple types can apply — pick the PRIMARY one.
3. If the rule-based classifier already tagged it and you agree, confirm with higher confidence.
4. If the rule-based classifier got it wrong, override with your classification and explain why.
5. Focus especially on category errors — these are the bias mechanism.

## Output Format

Respond with ONLY valid JSON:
{
  "classifications": [
    {
      "index": number,
      "status": "verifiable-observation" | "statistical-claim" | "tacit-consensus" | "causal-claim" | "model-dependent" | "value-judgment",
      "confidence": number (0-1),
      "reasoning": "brief explanation",
      "categoryError": boolean,
      "disguisedAs": "status type it pretends to be (only if categoryError is true)"
    }
  ]
}`;

export function buildEpistemologicalRefinementMessages(
  input: EpistemologicalRefinementInput
): LLMMessage[] {
  let userContent = `Classify these claims from "${input.articleTitle}" (${input.sourceName}):\n\n`;

  for (const claim of input.claims) {
    userContent += `[${claim.index}] "${claim.sourceWording}"\n`;
    userContent += `  Canonical: ${claim.statement}\n`;
    if (claim.ruleStatus && claim.ruleStatus !== "unclassified") {
      userContent += `  Rule-based suggestion: ${claim.ruleStatus} (confidence: ${claim.ruleConfidence?.toFixed(2)})\n`;
    } else {
      userContent += `  Rule-based: unclassified (needs your classification)\n`;
    }
    userContent += "\n";
  }

  return [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: userContent },
  ];
}
