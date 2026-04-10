/**
 * Core data models for the bias analyzer
 */

// ─── Pundit / Source ────────────────────────────────────────────────

export type PoliticalLeaning =
  | "far-left"
  | "left"
  | "center-left"
  | "center"
  | "center-right"
  | "right"
  | "far-right"
  | "unclassified";

export type Platform =
  | "youtube"
  | "twitter"
  | "substack"
  | "podcast"
  | "cable-news"
  | "newspaper"
  | "blog"
  | "streaming"
  | "other";

export interface Pundit {
  id: string;
  name: string;
  slug: string;
  platforms: Platform[];
  currentLeaning: PoliticalLeaning;
  leaningHistory: LeaningSnapshot[];
  description: string;
  knownFor: string[];
  imageUrl?: string;
  externalLinks: { platform: string; url: string }[];
  tags: string[];
  analysisCount: number;
  averageBiasScore: number;
  averageManipulationScore: number;
}

export interface LeaningSnapshot {
  date: string; // ISO date
  leaning: PoliticalLeaning;
  evidence: string; // Brief explanation of why this was the assessed leaning
}

// ─── Content / Articles ─────────────────────────────────────────────

export type ContentType =
  | "youtube-video"
  | "article"
  | "blog-post"
  | "tweet-thread"
  | "podcast-episode"
  | "tv-segment"
  | "press-conference"
  | "other";

export interface ContentItem {
  id: string;
  title: string;
  url: string;
  contentType: ContentType;
  sourceId: string; // Pundit ID or organization ID
  sourceName: string;
  publishedAt: string; // ISO date
  ingestedAt: string; // ISO date
  rawText: string;
  wordCount: number;
  metadata: ContentMetadata;
}

export interface ContentMetadata {
  // YouTube-specific
  youtubeVideoId?: string;
  duration?: number; // seconds
  viewCount?: number;
  likeCount?: number;

  // Article-specific
  author?: string;
  publication?: string;
  section?: string;

  // General
  tags?: string[];
  thumbnailUrl?: string;
}

// ─── Analysis Results ───────────────────────────────────────────────

export interface FullAnalysis {
  id: string;
  contentId: string;
  analyzedAt: string;
  biasAssessment: BiasAssessment;
  fallacyDetections: FallacyDetectionResult[];
  reframingDetections: ReframingDetectionResult[];
  manipulationScore: number; // 0-100
  overallAssessment: string;
  humanReviewed: boolean;
  humanReviewNotes?: string;
}

export interface BiasAssessment {
  overallLeaning: PoliticalLeaning;
  confidence: number; // 0-1
  indicators: BiasIndicator[];
  toneScore: number; // -1 (hostile) to 1 (favorable) toward the subject
  balanceScore: number; // 0 (one-sided) to 1 (balanced)
}

export interface BiasIndicator {
  type: "language" | "framing" | "omission" | "source-selection" | "emphasis";
  description: string;
  excerpt: string;
  direction: "left" | "right" | "neutral";
  weight: number;
}

export interface FallacyDetectionResult {
  fallacyId: string;
  fallacyName: string;
  confidence: number;
  excerpt: string;
  explanation: string;
  humanVerified: boolean;
  humanCorrection?: string;
}

export interface ReframingDetectionResult {
  technique: string;
  techniqueName: string;
  confidence: number;
  excerpt: string;
  explanation: string;
  suggestedNeutralFraming?: string;
  humanVerified: boolean;
}

// ─── Training Data ──────────────────────────────────────────────────

export interface TrainingExample {
  id: string;
  text: string;
  contentId?: string; // Link to original content
  labels: TrainingLabel[];
  labeledBy: string; // Who labeled this
  labeledAt: string; // ISO date
  verified: boolean;
}

export interface TrainingLabel {
  type: "fallacy" | "reframing" | "bias";
  value: string; // Fallacy ID, reframing technique, or bias direction
  startIndex: number;
  endIndex: number;
  confidence: number; // Labeler's confidence
  notes?: string;
}
