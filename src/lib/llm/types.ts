/**
 * LLM Layer — Shared Types
 *
 * Typed inputs and outputs for all LLM prompt templates.
 * These are the contracts between the analysis pipeline and the LLM calls.
 */

// ─── Tone/Sentiment Analysis ────────────────────────────────────────

export type HumorType =
  | "satire"
  | "dark-humor"
  | "observational"
  | "self-deprecating"
  | "surreal"
  | "wordplay"
  | "none";

export interface HumorDetection {
  type: HumorType;
  confidence: number; // 0-1
  excerpt: string;
  effect: "inverts-meaning" | "masks-sentiment" | "softens-criticism" | "none";
  explanation: string;
}

export interface ToneAnalysisInput {
  text: string;
  // Context from rule engine (if available)
  detectedFallacies?: string[];
  detectedReframing?: string[];
}

export interface ToneAnalysisOutput {
  toneScore: number; // -1 (hostile) to +1 (favorable)
  adjustedToneScore: number; // after accounting for humor
  humorDetections: HumorDetection[];
  emotionalTone: "hostile" | "critical" | "neutral" | "sympathetic" | "favorable";
  reasoning: string;
}

// ─── Structural Fallacy Detection ───────────────────────────────────

export interface StructuralFallacyInput {
  text: string;
  // What the keyword engine already found (avoid duplicates)
  keywordDetections: {
    fallacyId: string;
    excerpt: string;
  }[];
}

export interface StructuralFallacy {
  fallacyId: string;
  fallacyName: string;
  confidence: number;
  excerpt: string;
  explanation: string;
  // What makes this structural vs. keyword-detectable
  structuralReason: string;
}

export interface StructuralFallacyOutput {
  detections: StructuralFallacy[];
  argumentStructureSummary: string;
}

// ─── Neutral Reframing ──────────────────────────────────────────────

export interface ReframingSuggestionInput {
  originalExcerpt: string;
  technique: string; // e.g., "loaded-language", "euphemism"
  techniqueName: string;
  fullContext: string; // surrounding paragraph for context
}

export interface ReframingSuggestionOutput {
  neutralVersion: string;
  explanation: string; // why the original is loaded and the suggestion is neutral
}

// ─── 9-Axis Bias Mapping ────────────────────────────────────────────

export interface AxisMappingInput {
  text: string;
  // Context from rule engine
  biasIndicators: {
    direction: string;
    description: string;
    excerpt: string;
  }[];
  detectedFallacies: string[];
  detectedReframing: string[];
}

export type AxisScoreId =
  | "economic"
  | "speech"
  | "causation-analysis"
  | "equality-model"
  | "liberal-conservative"
  | "foreign-policy"
  | "populism"
  | "nationalism"
  | "authority";

/**
 * Authority sub-domains. See political-axes.ts for the canonical definition.
 * Mirrored here so the LLM output type can reference it without a cross-layer
 * import from models/ into llm/.
 */
export type AuthoritySubDomain =
  | "speech"
  | "health-bodily"
  | "commerce-platform"
  | "immigration"
  | "culture-family";

export interface AuthoritySubDomainScore {
  domain: AuthoritySubDomain;
  value: number; // -1 (libertarian) to +1 (authoritarian)
  confidence: number;
  evidence: string;
}

export interface AxisScore {
  axisId: AxisScoreId;
  value: number; // -1 to +1
  confidence: number; // 0-1
  evidence: string;
  /**
   * Optional sub-domain breakdown. Currently only used for the authority axis.
   * When present on the authority axis, the aggregate `value` is a placeholder
   * and consumers should read the sub-domains. The LLM should emit sub-domains
   * whenever the content takes positions across multiple authority domains
   * (common for political commentary; uncommon for single-topic pieces).
   */
  subDomains?: AuthoritySubDomainScore[];
}

export interface AxisMappingOutput {
  axes: AxisScore[];
  overallLeaning: string;
  reasoning: string;
}
