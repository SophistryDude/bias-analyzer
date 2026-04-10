/**
 * Main Analysis Pipeline
 *
 * Orchestrates the full analysis of a content item:
 * 1. Ingest raw text (from YouTube transcript, article, etc.)
 * 2. Run through the logic engine for fallacy detection
 * 3. Run reframing detection
 * 4. Score political bias
 * 5. Generate overall assessment
 */

import { analyzeText } from "../logic-engine/engine";
import { detectReframing } from "../logic-engine/reframing";
import type {
  ContentItem,
  FullAnalysis,
  BiasAssessment,
  BiasIndicator,
  FallacyDetectionResult,
  ReframingDetectionResult,
} from "../models/types";
import { FALLACY_RULES } from "../logic-engine/fallacies";
import {
  isLLMConfigured,
  analyzeTone,
  detectStructuralFallacies,
  suggestNeutralReframing,
  mapToAxes,
} from "../llm/analyze";

// ─── Bias Detection (keyword-based baseline) ────────────────────────

const LEFT_INDICATORS = [
  "progressive",
  "equity",
  "systemic",
  "marginalized",
  "inclusive",
  "social justice",
  "privilege",
  "underrepresented",
  "intersectional",
  "living wage",
  "wealth gap",
  "corporate greed",
  "common sense gun",
  "reproductive rights",
  "climate crisis",
  "anti-fascist",
];

const RIGHT_INDICATORS = [
  "traditional values",
  "personal responsibility",
  "free market",
  "limited government",
  "second amendment",
  "border security",
  "law and order",
  "sanctity of life",
  "constitutional",
  "taxpayer",
  "deregulation",
  "religious freedom",
  "family values",
  "patriot",
  "woke",
  "cancel culture",
];

function assessBias(text: string): BiasAssessment {
  const lowerText = text.toLowerCase();
  const indicators: BiasIndicator[] = [];

  let leftScore = 0;
  let rightScore = 0;

  for (const term of LEFT_INDICATORS) {
    const regex = new RegExp(`\\b${term}\\b`, "gi");
    const matches = lowerText.match(regex);
    if (matches) {
      leftScore += matches.length;
      indicators.push({
        type: "language",
        description: `Uses left-leaning terminology: "${term}"`,
        excerpt: extractContext(text, term),
        direction: "left",
        weight: matches.length * 0.1,
      });
    }
  }

  for (const term of RIGHT_INDICATORS) {
    const regex = new RegExp(`\\b${term}\\b`, "gi");
    const matches = lowerText.match(regex);
    if (matches) {
      rightScore += matches.length;
      indicators.push({
        type: "language",
        description: `Uses right-leaning terminology: "${term}"`,
        excerpt: extractContext(text, term),
        direction: "right",
        weight: matches.length * 0.1,
      });
    }
  }

  const total = leftScore + rightScore;
  const balanceScore = total === 0 ? 1 : 1 - Math.abs(leftScore - rightScore) / total;

  let overallLeaning: BiasAssessment["overallLeaning"] = "center";
  if (total > 0) {
    const ratio = (rightScore - leftScore) / total;
    if (ratio > 0.6) overallLeaning = "far-right";
    else if (ratio > 0.3) overallLeaning = "right";
    else if (ratio > 0.1) overallLeaning = "center-right";
    else if (ratio < -0.6) overallLeaning = "far-left";
    else if (ratio < -0.3) overallLeaning = "left";
    else if (ratio < -0.1) overallLeaning = "center-left";
  }

  const confidence = Math.min(total / 20, 1);

  return {
    overallLeaning,
    confidence,
    indicators,
    toneScore: 0, // Placeholder — needs sentiment analysis model
    balanceScore,
  };
}

function extractContext(text: string, term: string): string {
  const idx = text.toLowerCase().indexOf(term.toLowerCase());
  if (idx < 0) return "";
  const start = Math.max(0, idx - 40);
  const end = Math.min(text.length, idx + term.length + 40);
  return text.slice(start, end);
}

// ─── Full Pipeline ──────────────────────────────────────────────────

export async function runAnalysis(content: ContentItem): Promise<FullAnalysis> {
  // Step 1: Logic engine — fallacy detection
  const logicResult = analyzeText(content.rawText);

  // Step 2: Reframing detection
  const reframingResults = detectReframing(content.rawText);

  // Step 3: Bias assessment (keyword-based baseline)
  const biasAssessment = assessBias(content.rawText);

  // Step 4: Map results to output types
  const fallacyDetections: FallacyDetectionResult[] = logicResult.detections.map(
    (d) => {
      const rule = FALLACY_RULES.find((r) => r.id === d.fallacyId);
      return {
        fallacyId: d.fallacyId,
        fallacyName: rule?.name || d.fallacyId,
        confidence: d.confidence,
        excerpt: d.excerpt,
        explanation: d.explanation,
        humanVerified: false,
      };
    }
  );

  const reframingDetections: ReframingDetectionResult[] = reframingResults.map(
    (d) => ({
      technique: d.techniqueId,
      techniqueName: d.technique,
      confidence: d.confidence,
      excerpt: d.excerpt,
      explanation: d.explanation,
      suggestedNeutralFraming: d.suggestedNeutralFraming,
      humanVerified: false,
    })
  );

  // Step 5: LLM enhancement layer (if configured)
  let llmEnhanced = false;

  if (isLLMConfigured()) {
    try {
      llmEnhanced = true;

      // 5a: Tone/sentiment analysis (replaces hardcoded toneScore: 0)
      const toneResult = await analyzeTone({
        text: content.rawText,
        detectedFallacies: fallacyDetections.map((f) => f.fallacyName),
        detectedReframing: reframingDetections.map((r) => r.techniqueName),
      });
      if (toneResult) {
        biasAssessment.toneScore = toneResult.adjustedToneScore;
      }

      // 5b: Structural fallacy detection (catches what keywords miss)
      const structuralResult = await detectStructuralFallacies({
        text: content.rawText,
        keywordDetections: fallacyDetections.map((f) => ({
          fallacyId: f.fallacyId,
          excerpt: f.excerpt,
        })),
      });
      if (structuralResult) {
        for (const s of structuralResult.detections) {
          fallacyDetections.push({
            fallacyId: s.fallacyId,
            fallacyName: s.fallacyName,
            confidence: s.confidence,
            excerpt: s.excerpt,
            explanation: s.explanation,
            humanVerified: false,
          });
        }
      }

      // 5c: Neutral reframing suggestions
      for (const r of reframingDetections) {
        if (!r.suggestedNeutralFraming) {
          const suggestion = await suggestNeutralReframing({
            originalExcerpt: r.excerpt,
            technique: r.technique,
            techniqueName: r.techniqueName,
            fullContext: content.rawText.slice(
              Math.max(0, content.rawText.indexOf(r.excerpt) - 200),
              content.rawText.indexOf(r.excerpt) + r.excerpt.length + 200
            ),
          });
          if (suggestion) {
            r.suggestedNeutralFraming = suggestion.neutralVersion;
          }
        }
      }

      // 5d: 5-axis bias mapping (replaces flat left/right keyword scoring)
      const axisResult = await mapToAxes({
        text: content.rawText,
        biasIndicators: biasAssessment.indicators.map((i) => ({
          direction: i.direction,
          description: i.description,
          excerpt: i.excerpt,
        })),
        detectedFallacies: fallacyDetections.map((f) => f.fallacyName),
        detectedReframing: reframingDetections.map((r) => r.techniqueName),
      });
      if (axisResult) {
        // Override the keyword-based leaning with the LLM's axis-informed assessment
        biasAssessment.overallLeaning = axisResult.overallLeaning as BiasAssessment["overallLeaning"];
      }
    } catch (llmErr) {
      console.error("LLM enhancement failed (continuing with rule-based results):", llmErr);
      llmEnhanced = false;
    }
  }

  // Step 6: Calculate overall manipulation score (0-100)
  const fallacyWeight = logicResult.overallManipulationScore * 40;
  const reframingWeight =
    reframingResults.length > 0
      ? Math.min(reframingResults.reduce((sum, r) => sum + r.confidence, 0) / 2, 1) * 30
      : 0;
  const biasWeight = (1 - biasAssessment.balanceScore) * 30;
  const manipulationScore = Math.round(fallacyWeight + reframingWeight + biasWeight);

  // Step 7: Generate overall assessment
  const overallAssessment = generateOverallAssessment(
    fallacyDetections,
    reframingDetections,
    biasAssessment,
    manipulationScore
  );

  return {
    id: `analysis-${Date.now()}`,
    contentId: content.id,
    analyzedAt: new Date().toISOString(),
    biasAssessment,
    fallacyDetections,
    reframingDetections,
    manipulationScore,
    overallAssessment,
    humanReviewed: false,
    llmEnhanced,
  };
}

function generateOverallAssessment(
  fallacies: FallacyDetectionResult[],
  reframing: ReframingDetectionResult[],
  bias: BiasAssessment,
  score: number
): string {
  const parts: string[] = [];

  if (score >= 70) parts.push("This content shows significant signs of manipulation.");
  else if (score >= 40) parts.push("This content shows moderate signs of bias or manipulation.");
  else if (score >= 15) parts.push("This content shows mild signs of bias.");
  else parts.push("This content appears relatively neutral and well-reasoned.");

  if (fallacies.length > 0) {
    parts.push(
      `Detected ${fallacies.length} logical fallacy/fallacies: ${fallacies.map((f) => f.fallacyName).join(", ")}.`
    );
  }

  if (reframing.length > 0) {
    parts.push(
      `Found ${reframing.length} reframing technique(s): ${reframing.map((r) => r.techniqueName).join(", ")}.`
    );
  }

  if (bias.confidence > 0.3) {
    parts.push(
      `Political leaning assessed as ${bias.overallLeaning} (confidence: ${(bias.confidence * 100).toFixed(0)}%).`
    );
  }

  return parts.join(" ");
}
