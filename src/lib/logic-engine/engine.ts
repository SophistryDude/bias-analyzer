/**
 * Logic Engine — Rule-based fallacy and manipulation detection
 *
 * This is an independent reasoning engine that does NOT rely on LLM reasoning.
 * It uses pattern matching, structural analysis, and scoring to detect
 * logical fallacies in text.
 *
 * The engine is designed to be trained/improved via manual labeling:
 * - Humans label text segments with fallacy types
 * - Patterns and weights are refined based on labeled data
 * - New patterns can be added from observed examples
 */

import {
  FALLACY_RULES,
  type FallacyDetection,
  type FallacyRule,
  type DetectionPattern,
} from "./fallacies";

export interface AnalysisResult {
  text: string;
  detections: FallacyDetection[];
  overallManipulationScore: number; // 0-1
  argumentStructure: ArgumentNode[];
  summary: string;
}

export interface ArgumentNode {
  id: string;
  type: "claim" | "premise" | "evidence" | "conclusion" | "rebuttal";
  text: string;
  supports?: string; // ID of the node this supports
  contradict?: string; // ID of the node this contradicts
  strength: number; // 0-1 how well-supported this is
}

// ─── Pattern Matching Engine ────────────────────────────────────────

function matchKeywordPatterns(
  text: string,
  pattern: DetectionPattern
): { matched: boolean; excerpts: string[] } {
  if (pattern.type !== "keyword") return { matched: false, excerpts: [] };

  try {
    const regex = new RegExp(pattern.pattern, "gi");
    const matches = text.match(regex);
    if (matches && matches.length > 0) {
      // Extract surrounding context for each match
      const excerpts = matches.map((match) => {
        const idx = text.toLowerCase().indexOf(match.toLowerCase());
        const start = Math.max(0, idx - 50);
        const end = Math.min(text.length, idx + match.length + 50);
        return text.slice(start, end);
      });
      return { matched: true, excerpts };
    }
  } catch {
    // Invalid regex — skip this pattern
  }
  return { matched: false, excerpts: [] };
}

// ─── Structural Analysis ────────────────────────────────────────────

/**
 * Segments text into argument components.
 * This is a basic implementation — will be improved with training data.
 */
function segmentArgument(text: string): ArgumentNode[] {
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  const nodes: ArgumentNode[] = [];

  const claimIndicators =
    /\b(therefore|thus|so|consequently|this means|this proves|clearly|obviously)\b/i;
  const premiseIndicators =
    /\b(because|since|given that|due to|the fact that|as shown by|evidence shows)\b/i;
  const evidenceIndicators =
    /\b(studies show|data shows|according to|research indicates|statistics|percent|survey)\b/i;

  sentences.forEach((sentence, i) => {
    const trimmed = sentence.trim();
    if (!trimmed) return;

    let type: ArgumentNode["type"] = "claim";
    if (evidenceIndicators.test(trimmed)) type = "evidence";
    else if (premiseIndicators.test(trimmed)) type = "premise";
    else if (claimIndicators.test(trimmed)) type = "conclusion";

    nodes.push({
      id: `node-${i}`,
      type,
      text: trimmed,
      strength: type === "evidence" ? 0.7 : type === "premise" ? 0.5 : 0.3,
    });
  });

  return nodes;
}

// ─── Main Analysis Function ─────────────────────────────────────────

export function analyzeText(text: string): AnalysisResult {
  const detections: FallacyDetection[] = [];

  for (const rule of FALLACY_RULES) {
    const ruleDetections = detectFallacy(text, rule);
    detections.push(...ruleDetections);
  }

  // Sort by confidence descending
  detections.sort((a, b) => b.confidence - a.confidence);

  // Calculate overall manipulation score
  const overallManipulationScore = calculateManipulationScore(detections);

  // Parse argument structure
  const argumentStructure = segmentArgument(text);

  // Generate summary
  const summary = generateSummary(detections, overallManipulationScore);

  return {
    text,
    detections,
    overallManipulationScore,
    argumentStructure,
    summary,
  };
}

function detectFallacy(
  text: string,
  rule: FallacyRule
): FallacyDetection[] {
  const detections: FallacyDetection[] = [];
  const matchedPatterns: string[] = [];
  let totalWeight = 0;
  let matchCount = 0;
  let bestExcerpt = "";

  for (const pattern of rule.detectionPatterns) {
    if (pattern.type === "keyword") {
      const result = matchKeywordPatterns(text, pattern);
      if (result.matched) {
        matchedPatterns.push(pattern.id);
        totalWeight += pattern.weight;
        matchCount++;
        if (result.excerpts.length > 0 && !bestExcerpt) {
          bestExcerpt = result.excerpts[0];
        }
      }
    }
    // Structural and semantic patterns require the trained model
    // For now, keyword patterns drive the base detection
  }

  if (matchCount > 0) {
    const confidence = Math.min(totalWeight / rule.detectionPatterns.length, 1);

    // Only report if confidence exceeds threshold
    if (confidence >= 0.3) {
      detections.push({
        fallacyId: rule.id,
        confidence,
        matchedPatterns,
        excerpt: bestExcerpt || text.slice(0, 200),
        explanation: `Detected potential ${rule.name}: ${rule.description}`,
        startIndex: text.indexOf(bestExcerpt) >= 0 ? text.indexOf(bestExcerpt) : 0,
        endIndex:
          text.indexOf(bestExcerpt) >= 0
            ? text.indexOf(bestExcerpt) + bestExcerpt.length
            : Math.min(text.length, 200),
      });
    }
  }

  return detections;
}

function calculateManipulationScore(
  detections: FallacyDetection[]
): number {
  if (detections.length === 0) return 0;

  // Weighted score based on number and confidence of detected fallacies
  const totalConfidence = detections.reduce((sum, d) => sum + d.confidence, 0);
  // Normalize: more fallacies and higher confidence = higher score
  // Cap at 1.0
  return Math.min(totalConfidence / 3, 1);
}

function generateSummary(
  detections: FallacyDetection[],
  score: number
): string {
  if (detections.length === 0) {
    return "No logical fallacies detected in this text based on current rule set.";
  }

  const fallacyNames = detections.map((d) => {
    const rule = FALLACY_RULES.find((r) => r.id === d.fallacyId);
    return rule?.name || d.fallacyId;
  });

  const level =
    score > 0.7 ? "highly manipulative" : score > 0.4 ? "moderately manipulative" : "mildly manipulative";

  return `Detected ${detections.length} potential logical fallacies (${fallacyNames.join(", ")}). Overall manipulation score: ${(score * 100).toFixed(0)}% — ${level}.`;
}
