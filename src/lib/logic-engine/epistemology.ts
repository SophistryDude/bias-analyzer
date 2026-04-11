/**
 * Epistemological Classification Engine
 *
 * Classifies claims by truth-status type, derived from the Logic System's
 * epistemological taxonomy. This is the rule-based first pass — handles
 * clear cases via keyword/pattern matching. Ambiguous cases are deferred
 * to the LLM refinement layer.
 *
 * Taxonomy (from Logic System):
 *   Known Truth         → Verifiable observation (directly checkable against records)
 *   Effective Truth     → Model-dependent interpretation (true within a framework)
 *   Tacit Understanding → Institutional/expert consensus (inherited, not proven)
 *   Causal Claim        → Asserts causation (may or may not be fundamental)
 *   Value Judgment      → Normative claim presented as descriptive (category error)
 *   Statistical Claim   → Quantitative assertion (methodology-dependent)
 *
 * The core bias detection insight: bias is presenting tacit understanding
 * as known truth. This classifier makes that detectable.
 */

// ─── Types ──────────────────────────────────────────────────────────

export type EpistemologicalStatus =
  | "verifiable-observation"    // Known truth: directly checkable
  | "model-dependent"          // Effective truth: true within a model/framework
  | "tacit-consensus"          // Inherited understanding presented as authority
  | "causal-claim"             // Asserts causation
  | "value-judgment"           // Normative claim, often disguised as descriptive
  | "statistical-claim"        // Quantitative, methodology-dependent
  | "unclassified";            // Ambiguous — needs LLM refinement

export interface EpistemologicalClassification {
  status: EpistemologicalStatus;
  confidence: number; // 0-1
  matchedPattern: string | null; // which rule matched, null if LLM-classified
  reasoning: string;
  /** If true, the claim presents one status as another (e.g., value judgment as fact) */
  categoryError: boolean;
  /** What the claim pretends to be vs what it is */
  disguisedAs?: EpistemologicalStatus;
}

// ─── Pattern Definitions ────────────────────────────────────────────

interface ClassificationRule {
  id: string;
  status: EpistemologicalStatus;
  /** Patterns that indicate this status */
  patterns: RegExp[];
  /** Patterns that indicate this is being disguised as something else */
  disguisePatterns?: { pattern: RegExp; disguisedAs: EpistemologicalStatus }[];
  confidence: number;
}

const RULES: ClassificationRule[] = [
  // ─── Verifiable Observation ─────────────────────────────────────
  {
    id: "cited-source",
    status: "verifiable-observation",
    patterns: [
      /according to (?:the |a )?(?:report|document|filing|record|statement|data|figure)/i,
      /(?:released|published|issued) (?:a |the )?(?:report|statement|data|finding)/i,
      /(?:court|government|official|federal|state) (?:record|document|filing|ruling)/i,
      /(?:on|at|in) (?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i,
      /(?:said|told|stated|announced|confirmed|testified) (?:in|at|to|during)/i,
    ],
    confidence: 0.75,
  },
  {
    id: "direct-quote",
    status: "verifiable-observation",
    patterns: [
      /[""][^""]{10,}[""](?:,? (?:he|she|they|the|a) (?:said|stated|wrote|added|told))/i,
      /(?:said|stated|wrote|told)[,:]? [""][^""]{10,}[""]/i,
    ],
    confidence: 0.85,
  },
  {
    id: "event-report",
    status: "verifiable-observation",
    patterns: [
      /(?:was|were|has been|had been) (?:killed|arrested|charged|convicted|fired|hired|elected|appointed|signed|passed|vetoed)/i,
      /(?:voted|passed|rejected|approved|signed into law) (?:\d+[-–]|\w+ to \w+)/i,
    ],
    confidence: 0.80,
  },

  // ─── Statistical Claim ──────────────────────────────────────────
  {
    id: "statistic-with-source",
    status: "statistical-claim",
    patterns: [
      /\d+(?:\.\d+)?%? (?:of |percent |per cent )/i,
      /(?:according to|data from|survey by|poll by|study by|research from) .{1,50}\d/i,
      /(?:increased|decreased|rose|fell|dropped|grew|declined) (?:by )?\d+/i,
      /\$[\d,]+(?:\.\d+)? (?:billion|million|trillion)/i,
      /(?:an average of|approximately|roughly|about|nearly|more than|at least|up to) \d+/i,
    ],
    confidence: 0.80,
  },

  // ─── Tacit Consensus ────────────────────────────────────────────
  {
    id: "expert-consensus",
    status: "tacit-consensus",
    patterns: [
      /(?:experts?|scientists?|researchers?|analysts?|economists?|scholars?) (?:say|believe|argue|warn|agree|note|suggest|maintain)/i,
      /(?:widely|generally|broadly|commonly|universally) (?:accepted|believed|recognized|acknowledged|understood|considered)/i,
      /(?:it is|it's) (?:well[- ])?(?:known|established|understood|accepted|recognized) that/i,
      /(?:the |a )?(?:scientific|medical|academic|intelligence|policy) (?:community|consensus|establishment)/i,
      /(?:most|many|some) (?:experts?|observers?|analysts?|commentators?|critics?)/i,
    ],
    confidence: 0.75,
    disguisePatterns: [
      {
        pattern: /(?:it is|it's) (?:a )?(?:fact|true|clear|obvious|evident|undeniable) that/i,
        disguisedAs: "verifiable-observation",
      },
    ],
  },

  // ─── Causal Claim ───────────────────────────────────────────────
  {
    id: "causal-language",
    status: "causal-claim",
    patterns: [
      /(?:caused|led to|resulted in|produced|triggered|sparked|fueled|drove|created|generated|enabled|prompted)/i,
      /(?:because of|due to|as a result of|owing to|thanks to|in response to|on account of)/i,
      /(?:the reason|the cause|the effect|the result|the consequence|the impact) (?:of|is|was)/i,
      /(?:if .{5,30} then|when .{5,30} will|this (?:means|implies|shows|proves|demonstrates) that)/i,
    ],
    confidence: 0.65,
    disguisePatterns: [
      {
        pattern: /(?:clearly|obviously|undeniably|inevitably) (?:caused|led to|resulted in)/i,
        disguisedAs: "verifiable-observation",
      },
    ],
  },

  // ─── Value Judgment ─────────────────────────────────────────────
  {
    id: "normative-language",
    status: "value-judgment",
    patterns: [
      /(?:should|must|need to|ought to|have to|has to) (?:be |have |do |take |make |stop |start )/i,
      /(?:it is|it's|that is|that's) (?:wrong|right|good|bad|immoral|moral|unacceptable|outrageous|shameful|disgraceful|appalling|deplorable)/i,
      /(?:we need|we must|we should|we cannot|we can't) (?:to |afford |allow |accept |tolerate |ignore )/i,
      /(?:the right thing|the wrong thing|the responsible thing|the smart thing|the only option) (?:to do|is)/i,
    ],
    confidence: 0.80,
    disguisePatterns: [
      {
        pattern: /(?:everyone knows|no reasonable person|any thinking person|common sense (?:tells|says|dictates))/i,
        disguisedAs: "tacit-consensus",
      },
      {
        pattern: /(?:the fact is|the truth is|the reality is|make no mistake|let's be clear)[,:]? .{0,10}(?:should|must|wrong|right)/i,
        disguisedAs: "verifiable-observation",
      },
    ],
  },

  // ─── Model-Dependent Interpretation ─────────────────────────────
  {
    id: "interpretive-framing",
    status: "model-dependent",
    patterns: [
      /(?:this (?:suggests|indicates|implies|signals|reflects|reveals|demonstrates|shows|highlights|underscores))/i,
      /(?:can be (?:seen|viewed|interpreted|understood|read) as)/i,
      /(?:in (?:the |a )?(?:context|framework|lens|view|perspective|light) of)/i,
      /(?:what this (?:means|tells us|shows|reveals) is)/i,
      /(?:the (?:broader|larger|deeper|real|underlying|true) (?:meaning|significance|implication|message|point|issue))/i,
    ],
    confidence: 0.70,
    disguisePatterns: [
      {
        pattern: /(?:this (?:proves|confirms|establishes|demonstrates beyond|shows definitively))/i,
        disguisedAs: "verifiable-observation",
      },
    ],
  },
];

// ─── Classification Engine ──────────────────────────────────────────

/**
 * Classify a claim's epistemological status using rule-based patterns.
 * Returns "unclassified" with low confidence if no rules match —
 * these are deferred to the LLM refinement layer.
 */
export function classifyClaimEpistemology(
  claimText: string
): EpistemologicalClassification {
  let bestMatch: {
    rule: ClassificationRule;
    confidence: number;
    patternId: string;
    categoryError: boolean;
    disguisedAs?: EpistemologicalStatus;
  } | null = null;

  for (const rule of RULES) {
    // Check main patterns
    for (const pattern of rule.patterns) {
      if (pattern.test(claimText)) {
        const confidence = rule.confidence;
        if (!bestMatch || confidence > bestMatch.confidence) {
          bestMatch = {
            rule,
            confidence,
            patternId: rule.id,
            categoryError: false,
          };
        }
      }
    }

    // Check disguise patterns (category errors)
    if (rule.disguisePatterns) {
      for (const dp of rule.disguisePatterns) {
        if (dp.pattern.test(claimText)) {
          // Category error detected — this claim is presenting itself as
          // a different epistemological type than it actually is
          const confidence = rule.confidence + 0.1; // boost for catching disguise
          if (!bestMatch || confidence > bestMatch.confidence) {
            bestMatch = {
              rule,
              confidence: Math.min(confidence, 1),
              patternId: `${rule.id}:disguised`,
              categoryError: true,
              disguisedAs: dp.disguisedAs,
            };
          }
        }
      }
    }
  }

  if (!bestMatch) {
    return {
      status: "unclassified",
      confidence: 0,
      matchedPattern: null,
      reasoning: "No rule-based pattern matched. Requires LLM classification.",
      categoryError: false,
    };
  }

  const reasoning = bestMatch.categoryError
    ? `Detected ${bestMatch.rule.status} disguised as ${bestMatch.disguisedAs} (pattern: ${bestMatch.patternId}). This is a category error — presenting one type of knowledge as another.`
    : `Classified as ${bestMatch.rule.status} (pattern: ${bestMatch.patternId})`;

  return {
    status: bestMatch.rule.status,
    confidence: bestMatch.confidence,
    matchedPattern: bestMatch.patternId,
    reasoning,
    categoryError: bestMatch.categoryError,
    disguisedAs: bestMatch.disguisedAs,
  };
}

/**
 * Batch classify multiple claims.
 * Returns classifications with stats on how many need LLM refinement.
 */
export function classifyClaimsBatch(
  claims: { statement: string; sourceWording: string }[]
): {
  classifications: (EpistemologicalClassification & { claimIndex: number })[];
  stats: {
    total: number;
    classified: number;
    unclassified: number;
    categoryErrors: number;
    byStatus: Record<EpistemologicalStatus, number>;
  };
} {
  const classifications: (EpistemologicalClassification & {
    claimIndex: number;
  })[] = [];

  const stats = {
    total: claims.length,
    classified: 0,
    unclassified: 0,
    categoryErrors: 0,
    byStatus: {
      "verifiable-observation": 0,
      "model-dependent": 0,
      "tacit-consensus": 0,
      "causal-claim": 0,
      "value-judgment": 0,
      "statistical-claim": 0,
      unclassified: 0,
    } as Record<EpistemologicalStatus, number>,
  };

  for (let i = 0; i < claims.length; i++) {
    // Classify against source wording first (more likely to contain telltale patterns),
    // fall back to canonical statement
    let result = classifyClaimEpistemology(claims[i].sourceWording);
    if (result.status === "unclassified") {
      result = classifyClaimEpistemology(claims[i].statement);
    }

    classifications.push({ ...result, claimIndex: i });

    if (result.status === "unclassified") {
      stats.unclassified++;
    } else {
      stats.classified++;
    }
    if (result.categoryError) {
      stats.categoryErrors++;
    }
    stats.byStatus[result.status]++;
  }

  return { classifications, stats };
}
