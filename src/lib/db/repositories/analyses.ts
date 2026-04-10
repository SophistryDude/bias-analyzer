import { eq } from "drizzle-orm";
import { db } from "../client";
import {
  analyses,
  fallacyDetections,
  reframingDetections,
  biasIndicators,
  contentItems,
} from "../schema";
import type {
  FullAnalysis,
  ContentItem,
} from "../../models/types";

export async function saveAnalysis(
  content: ContentItem,
  analysis: FullAnalysis
): Promise<void> {
  // Upsert the content item first
  await db
    .insert(contentItems)
    .values({
      id: content.id,
      title: content.title,
      url: content.url,
      contentType: content.contentType,
      sourceId: content.sourceId || null,
      sourceName: content.sourceName,
      publishedAt: new Date(content.publishedAt),
      ingestedAt: new Date(content.ingestedAt),
      rawText: content.rawText,
      wordCount: content.wordCount,
      metadata: content.metadata as Record<string, unknown>,
    })
    .onConflictDoNothing();

  // Insert the analysis
  await db.insert(analyses).values({
    id: analysis.id,
    contentId: analysis.contentId,
    analyzedAt: new Date(analysis.analyzedAt),
    manipulationScore: analysis.manipulationScore,
    overallAssessment: analysis.overallAssessment,
    humanReviewed: analysis.humanReviewed,
    humanReviewNotes: analysis.humanReviewNotes,
    llmEnhanced: analysis.llmEnhanced,
    biasLeaning: analysis.biasAssessment.overallLeaning,
    biasConfidence: analysis.biasAssessment.confidence,
    toneScore: analysis.biasAssessment.toneScore,
    balanceScore: analysis.biasAssessment.balanceScore,
  });

  // Insert fallacy detections
  for (const f of analysis.fallacyDetections) {
    await db.insert(fallacyDetections).values({
      id: `${analysis.id}-fallacy-${f.fallacyId}`,
      analysisId: analysis.id,
      fallacyId: f.fallacyId,
      fallacyName: f.fallacyName,
      confidence: f.confidence,
      excerpt: f.excerpt,
      explanation: f.explanation,
      humanVerified: f.humanVerified,
      humanCorrection: f.humanCorrection,
    });
  }

  // Insert reframing detections
  for (let i = 0; i < analysis.reframingDetections.length; i++) {
    const r = analysis.reframingDetections[i];
    await db.insert(reframingDetections).values({
      id: `${analysis.id}-reframing-${i}`,
      analysisId: analysis.id,
      technique: r.technique,
      techniqueName: r.techniqueName,
      confidence: r.confidence,
      excerpt: r.excerpt,
      explanation: r.explanation,
      suggestedNeutralFraming: r.suggestedNeutralFraming,
      humanVerified: r.humanVerified,
    });
  }

  // Insert bias indicators
  for (let i = 0; i < analysis.biasAssessment.indicators.length; i++) {
    const ind = analysis.biasAssessment.indicators[i];
    await db.insert(biasIndicators).values({
      id: `${analysis.id}-indicator-${i}`,
      analysisId: analysis.id,
      type: ind.type,
      description: ind.description,
      excerpt: ind.excerpt,
      direction: ind.direction,
      weight: ind.weight,
    });
  }
}

export async function getAnalysesByContentId(
  contentId: string
): Promise<FullAnalysis[]> {
  const rows = await db.query.analyses.findMany({
    where: eq(analyses.contentId, contentId),
    with: {
      fallacyDetections: true,
      reframingDetections: true,
      biasIndicators: true,
    },
  });

  return rows.map(toFullAnalysis);
}

export async function getAnalysisById(
  id: string
): Promise<FullAnalysis | null> {
  const row = await db.query.analyses.findFirst({
    where: eq(analyses.id, id),
    with: {
      fallacyDetections: true,
      reframingDetections: true,
      biasIndicators: true,
    },
  });

  if (!row) return null;
  return toFullAnalysis(row);
}

function toFullAnalysis(row: {
  id: string;
  contentId: string;
  analyzedAt: Date;
  manipulationScore: number;
  overallAssessment: string;
  humanReviewed: boolean;
  humanReviewNotes: string | null;
  llmEnhanced: boolean;
  biasLeaning: string;
  biasConfidence: number;
  toneScore: number;
  balanceScore: number;
  fallacyDetections: Array<{
    fallacyId: string;
    fallacyName: string;
    confidence: number;
    excerpt: string;
    explanation: string;
    humanVerified: boolean;
    humanCorrection: string | null;
  }>;
  reframingDetections: Array<{
    technique: string;
    techniqueName: string;
    confidence: number;
    excerpt: string;
    explanation: string;
    suggestedNeutralFraming: string | null;
    humanVerified: boolean;
  }>;
  biasIndicators: Array<{
    type: string;
    description: string;
    excerpt: string;
    direction: string;
    weight: number;
  }>;
}): FullAnalysis {
  return {
    id: row.id,
    contentId: row.contentId,
    analyzedAt: row.analyzedAt.toISOString(),
    manipulationScore: row.manipulationScore,
    overallAssessment: row.overallAssessment,
    humanReviewed: row.humanReviewed,
    humanReviewNotes: row.humanReviewNotes ?? undefined,
    llmEnhanced: row.llmEnhanced,
    biasAssessment: {
      overallLeaning: row.biasLeaning as FullAnalysis["biasAssessment"]["overallLeaning"],
      confidence: row.biasConfidence,
      toneScore: row.toneScore,
      balanceScore: row.balanceScore,
      indicators: row.biasIndicators.map((ind) => ({
        type: ind.type as "language" | "framing" | "omission" | "source-selection" | "emphasis",
        description: ind.description,
        excerpt: ind.excerpt,
        direction: ind.direction as "left" | "right" | "neutral",
        weight: ind.weight,
      })),
    },
    fallacyDetections: row.fallacyDetections.map((f) => ({
      fallacyId: f.fallacyId,
      fallacyName: f.fallacyName,
      confidence: f.confidence,
      excerpt: f.excerpt,
      explanation: f.explanation,
      humanVerified: f.humanVerified,
      humanCorrection: f.humanCorrection ?? undefined,
    })),
    reframingDetections: row.reframingDetections.map((r) => ({
      technique: r.technique,
      techniqueName: r.techniqueName,
      confidence: r.confidence,
      excerpt: r.excerpt,
      explanation: r.explanation,
      suggestedNeutralFraming: r.suggestedNeutralFraming ?? undefined,
      humanVerified: r.humanVerified,
    })),
  };
}
