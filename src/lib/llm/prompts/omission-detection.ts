/**
 * Omission Detection Prompt
 *
 * Given a master list of claims from ALL sources covering a story,
 * and the specific claims found in ONE source's coverage, identify
 * what that source omitted and whether any wording diverges significantly.
 *
 * This is the core of the cross-validation approach:
 * - We don't decide what's true
 * - We show what each source included and what they left out
 * - The pattern of omissions reveals the bias
 *
 * Example from April 2016 Aleppo:
 * - CNN omitted rebel mortar attacks killing 14 on government side
 * - NYT included both sides
 * - The omission pattern reveals CNN's single-perspective framing
 */

import type { LLMMessage } from "../provider";

export interface OmissionDetectionInput {
  /** The source being analyzed */
  sourceName: string;
  /** All claims extracted from this source's coverage */
  sourceClaims: {
    statement: string;
    sourceWording: string;
    claimType: string;
  }[];
  /** Master list of all claims across all sources for this story */
  allClaims: {
    statement: string;
    claimType: string;
    significance: string;
    /** Which sources included this claim */
    foundIn: string[];
  }[];
  /** Brief story description */
  storyDescription: string;
}

export interface OmissionResult {
  claimStatement: string;
  status: "included" | "omitted" | "partial" | "distorted";
  /** If included, does the wording diverge from the canonical version? */
  wordingDivergence: "none" | "minor" | "significant" | "contradicts" | null;
  /** Explanation of the divergence or omission */
  explanation: string;
  /** How many other sources included this claim */
  otherSourceCount: number;
  /** Is this omission likely significant (editorial choice) or minor (space/relevance)? */
  omissionSignificance: "editorial-choice" | "space-constraint" | "different-angle" | "not-applicable";
}

export interface OmissionDetectionOutput {
  results: OmissionResult[];
  /** Summary of this source's omission pattern */
  omissionPattern: string;
  /** What perspective or angle does this source's coverage favor? */
  perspectiveFavored: string;
  /** Key omissions that most reveal this source's framing choices */
  keyOmissions: string[];
  /** Overall completeness score: what percentage of significant claims did this source include? */
  completenessScore: number; // 0-1
}

const SYSTEM_PROMPT = `You are a media omission analyst. Your job is to compare one source's coverage of a story against the complete set of claims from ALL sources, and identify what this source omitted, included, or distorted.

## Why This Matters

Omission is the primary tool of media bias. Outlets rarely fabricate facts — they select which facts to include. By comparing what multiple sources reported about the same event, we can identify editorial choices that reveal bias.

A critical omission is NOT the same as a minor one:
- **Editorial choice**: The source omitted a significant fact that changes the reader's understanding of the story. Example: reporting hospital casualties on one side of a conflict but not the other.
- **Space constraint**: Minor details were cut for brevity. Not significant.
- **Different angle**: The source was covering a genuinely different aspect of the story. Not bias, just focus.

## Rules

1. For each claim in the master list, determine if this source included it, omitted it, partially covered it, or distorted it.
2. If included, check whether the wording diverges meaningfully:
   - "none": substantially the same
   - "minor": synonym substitution, slightly different phrasing, same meaning
   - "significant": different framing that changes the reader's impression
   - "contradicts": directly contradicts the claim as reported by other sources
3. For omissions, assess why:
   - "editorial-choice": this fact was available, relevant, and significant — omitting it appears to be a framing choice
   - "space-constraint": minor detail, reasonable to cut
   - "different-angle": the source was covering a different aspect of the story
4. Identify the overall omission PATTERN — what kind of facts does this source consistently leave out? What perspective does that favor?
5. Calculate a completeness score: what fraction of "critical" and "important" claims did this source include?

## Output Format

Respond with ONLY valid JSON:
{
  "results": [
    {
      "claimStatement": "the canonical claim",
      "status": "included" | "omitted" | "partial" | "distorted",
      "wordingDivergence": "none" | "minor" | "significant" | "contradicts" | null,
      "explanation": "why this matters",
      "otherSourceCount": number,
      "omissionSignificance": "editorial-choice" | "space-constraint" | "different-angle" | "not-applicable"
    }
  ],
  "omissionPattern": "what kind of facts this source consistently omits",
  "perspectiveFavored": "whose perspective does this coverage favor",
  "keyOmissions": ["the most significant omissions that reveal framing choices"],
  "completenessScore": number (0-1)
}`;

export function buildOmissionDetectionMessages(
  input: OmissionDetectionInput
): LLMMessage[] {
  let userContent = `Analyze omissions in ${input.sourceName}'s coverage of this story.\n\n`;
  userContent += `**Story:** ${input.storyDescription}\n\n`;

  userContent += `## Claims found in ${input.sourceName}'s coverage:\n`;
  for (const c of input.sourceClaims) {
    userContent += `- [${c.claimType}] ${c.statement}\n  Exact wording: "${c.sourceWording}"\n`;
  }

  userContent += `\n## Master claim list (all sources combined):\n`;
  for (const c of input.allClaims) {
    userContent += `- [${c.claimType}] [${c.significance}] ${c.statement} (reported by: ${c.foundIn.join(", ")})\n`;
  }

  return [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: userContent },
  ];
}
