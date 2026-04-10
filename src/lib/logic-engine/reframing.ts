/**
 * Reframing Detection Engine
 *
 * Detects when media reframes news stories to push a narrative.
 * Common techniques: selective framing, omission, loaded language,
 * false context, and narrative anchoring.
 */

export type ReframingTechnique =
  | "loaded-language"
  | "selective-framing"
  | "omission"
  | "false-context"
  | "narrative-anchoring"
  | "minimization"
  | "maximization"
  | "passive-voice-deflection"
  | "euphemism"
  | "dysphemism";

export interface ReframingRule {
  id: string;
  technique: ReframingTechnique;
  name: string;
  description: string;
  detectionPatterns: ReframingPattern[];
  severity: "low" | "medium" | "high";
}

export interface ReframingPattern {
  id: string;
  type: "keyword" | "structural" | "comparative";
  pattern: string;
  weight: number;
  description: string;
}

export interface ReframingDetection {
  techniqueId: string;
  technique: ReframingTechnique;
  confidence: number;
  excerpt: string;
  explanation: string;
  suggestedNeutralFraming?: string;
}

// ─── Reframing Rules ────────────────────────────────────────────────

export const REFRAMING_RULES: ReframingRule[] = [
  {
    id: "loaded-lang",
    technique: "loaded-language",
    name: "Loaded Language",
    description:
      "Using emotionally charged words to influence perception beyond what facts support.",
    detectionPatterns: [
      {
        id: "ll-extreme-adj",
        type: "keyword",
        pattern:
          "\\b(slammed|destroyed|eviscerated|demolished|obliterated|crushed|annihilated|explosive|bombshell|shocking|outrageous|disgusting)\\b",
        weight: 0.6,
        description: "Hyperbolic verbs/adjectives beyond factual reporting",
      },
      {
        id: "ll-political-labels",
        type: "keyword",
        pattern:
          "\\b(radical|extremist|far-right|far-left|ultra|hardline|fringe|militant|regime|authoritarian)\\b",
        weight: 0.4,
        description:
          "Politically charged labels (moderate weight — sometimes accurate)",
      },
    ],
    severity: "medium",
  },
  {
    id: "passive-deflect",
    technique: "passive-voice-deflection",
    name: "Passive Voice Deflection",
    description:
      "Using passive voice to obscure who is responsible for an action.",
    detectionPatterns: [
      {
        id: "pv-no-agent",
        type: "keyword",
        pattern:
          "\\b(mistakes were made|shots were fired|people were killed|damage was done|lives were lost|casualties occurred)\\b",
        weight: 0.7,
        description: "Passive constructions that hide the responsible actor",
      },
    ],
    severity: "medium",
  },
  {
    id: "minimize",
    technique: "minimization",
    name: "Minimization",
    description:
      "Downplaying the significance of an event, action, or consequence.",
    detectionPatterns: [
      {
        id: "min-language",
        type: "keyword",
        pattern:
          "\\b(merely|just|only|simply|minor|little|slight|somewhat|a bit of|nothing more than)\\b",
        weight: 0.3,
        description:
          "Minimizing language (low weight — context dependent)",
      },
    ],
    severity: "medium",
  },
  {
    id: "maximize",
    technique: "maximization",
    name: "Maximization",
    description:
      "Inflating the significance of an event beyond what evidence supports.",
    detectionPatterns: [
      {
        id: "max-language",
        type: "keyword",
        pattern:
          "\\b(unprecedented|historic|never before|worst ever|biggest|most dangerous|existential|catastrophic|emergency|crisis)\\b",
        weight: 0.4,
        description: "Inflating language (moderate weight — sometimes warranted)",
      },
    ],
    severity: "medium",
  },
  {
    id: "euphemism-use",
    technique: "euphemism",
    name: "Euphemism",
    description:
      "Using mild or indirect language to make something negative sound more palatable.",
    detectionPatterns: [
      {
        id: "eu-political",
        type: "keyword",
        pattern:
          "\\b(enhanced interrogation|collateral damage|regime change|kinetic action|neutralized|pacification|right-sizing|restructuring)\\b",
        weight: 0.8,
        description: "Known political/military euphemisms",
      },
    ],
    severity: "high",
  },
  {
    id: "dysphemism-use",
    technique: "dysphemism",
    name: "Dysphemism",
    description:
      "Using harsh or offensive language to make something sound worse than it is.",
    detectionPatterns: [
      {
        id: "dy-political",
        type: "keyword",
        pattern:
          "\\b(death tax|government takeover|invasion|mob|thugs|illegals|indoctrination|witch hunt|hoax)\\b",
        weight: 0.6,
        description: "Known political dysphemisms",
      },
    ],
    severity: "high",
  },
  {
    id: "anchor-narrative",
    technique: "narrative-anchoring",
    name: "Narrative Anchoring",
    description:
      "Establishing a narrative frame early in a piece that colors all subsequent information.",
    detectionPatterns: [
      {
        id: "na-lead-framing",
        type: "structural",
        pattern:
          "opening sentence/paragraph contains strong evaluative language that frames the rest",
        weight: 0.7,
        description: "The lead establishes a narrative that biases the reader's interpretation",
      },
    ],
    severity: "high",
  },
];

// ─── Reframing Analysis ─────────────────────────────────────────────

export function detectReframing(text: string): ReframingDetection[] {
  const detections: ReframingDetection[] = [];

  for (const rule of REFRAMING_RULES) {
    let matchCount = 0;
    let totalWeight = 0;
    let bestExcerpt = "";

    for (const pattern of rule.detectionPatterns) {
      if (pattern.type === "keyword") {
        try {
          const regex = new RegExp(pattern.pattern, "gi");
          const matches = text.match(regex);
          if (matches && matches.length > 0) {
            matchCount += matches.length;
            totalWeight += pattern.weight * matches.length;

            if (!bestExcerpt) {
              const idx = text.toLowerCase().indexOf(matches[0].toLowerCase());
              const start = Math.max(0, idx - 60);
              const end = Math.min(text.length, idx + matches[0].length + 60);
              bestExcerpt = text.slice(start, end);
            }
          }
        } catch {
          // Skip invalid patterns
        }
      }
    }

    if (matchCount > 0) {
      const confidence = Math.min(totalWeight / 2, 1);
      if (confidence >= 0.2) {
        detections.push({
          techniqueId: rule.id,
          technique: rule.technique,
          confidence,
          excerpt: bestExcerpt || text.slice(0, 200),
          explanation: `${rule.name}: ${rule.description}`,
        });
      }
    }
  }

  return detections.sort((a, b) => b.confidence - a.confidence);
}
