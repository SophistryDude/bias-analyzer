import {
  pgTable,
  text,
  integer,
  real,
  boolean,
  timestamp,
  jsonb,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ─── Pundits ────────────────────────────────────────────────────────

export const pundits = pgTable("pundits", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  platforms: jsonb("platforms").$type<string[]>().notNull().default([]),
  currentLeaning: text("current_leaning").notNull().default("unclassified"),
  description: text("description").notNull().default(""),
  knownFor: jsonb("known_for").$type<string[]>().notNull().default([]),
  imageUrl: text("image_url"),
  externalLinks: jsonb("external_links")
    .$type<{ platform: string; url: string }[]>()
    .notNull()
    .default([]),
  tags: jsonb("tags").$type<string[]>().notNull().default([]),
  /** Ownership / financial interest tracking */
  corporateParent: text("corporate_parent"), // e.g., "Warner Bros. Discovery", "Fox Corporation"
  ownershipType: text("ownership_type"), // "corporate", "independent", "nonprofit", "state-funded", "private-equity"
  financialInterests: jsonb("financial_interests").$type<string[]>().default([]), // known conflicts of interest
  fundingSources: jsonb("funding_sources").$type<string[]>().default([]), // e.g., "advertising", "subscription", "donations", "government"
  /** Geographic context for international axis calibration */
  country: text("country").default("US"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const punditsRelations = relations(pundits, ({ many }) => ({
  leaningHistory: many(leaningSnapshots),
  contentItems: many(contentItems),
  politicalProfiles: many(politicalProfiles),
}));

export const leaningSnapshots = pgTable("leaning_snapshots", {
  id: text("id").primaryKey(),
  punditId: text("pundit_id")
    .notNull()
    .references(() => pundits.id, { onDelete: "cascade" }),
  date: text("date").notNull(),
  leaning: text("leaning").notNull(),
  evidence: text("evidence").notNull(),
});

export const leaningSnapshotsRelations = relations(
  leaningSnapshots,
  ({ one }) => ({
    pundit: one(pundits, {
      fields: [leaningSnapshots.punditId],
      references: [pundits.id],
    }),
  })
);

// ─── Content Items ──────────────────────────────────────────────────

export const contentItems = pgTable("content_items", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  url: text("url").notNull().default(""),
  contentType: text("content_type").notNull(),
  sourceId: text("source_id").references(() => pundits.id, {
    onDelete: "cascade",
  }),
  sourceName: text("source_name").notNull(),
  publishedAt: timestamp("published_at").notNull(),
  ingestedAt: timestamp("ingested_at").notNull().defaultNow(),
  rawText: text("raw_text").notNull(),
  wordCount: integer("word_count").notNull(),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
});

export const contentItemsRelations = relations(contentItems, ({ one, many }) => ({
  source: one(pundits, {
    fields: [contentItems.sourceId],
    references: [pundits.id],
  }),
  analyses: many(analyses),
}));

// ─── Analyses ───────────────────────────────────────────────────────

export const analyses = pgTable("analyses", {
  id: text("id").primaryKey(),
  contentId: text("content_id")
    .notNull()
    .references(() => contentItems.id, { onDelete: "cascade" }),
  analyzedAt: timestamp("analyzed_at").notNull().defaultNow(),
  manipulationScore: integer("manipulation_score").notNull(),
  overallAssessment: text("overall_assessment").notNull(),
  humanReviewed: boolean("human_reviewed").notNull().default(false),
  humanReviewNotes: text("human_review_notes"),
  llmEnhanced: boolean("llm_enhanced").notNull().default(false),
  // Bias assessment fields (flattened from BiasAssessment interface)
  biasLeaning: text("bias_leaning").notNull(),
  biasConfidence: real("bias_confidence").notNull(),
  toneScore: real("tone_score").notNull().default(0),
  balanceScore: real("balance_score").notNull(),
});

export const analysesRelations = relations(analyses, ({ one, many }) => ({
  content: one(contentItems, {
    fields: [analyses.contentId],
    references: [contentItems.id],
  }),
  fallacyDetections: many(fallacyDetections),
  reframingDetections: many(reframingDetections),
  biasIndicators: many(biasIndicators),
}));

// ─── Fallacy Detections ─────────────────────────────────────────────

export const fallacyDetections = pgTable("fallacy_detections", {
  id: text("id").primaryKey(),
  analysisId: text("analysis_id")
    .notNull()
    .references(() => analyses.id, { onDelete: "cascade" }),
  fallacyId: text("fallacy_id").notNull(),
  fallacyName: text("fallacy_name").notNull(),
  confidence: real("confidence").notNull(),
  excerpt: text("excerpt").notNull(),
  explanation: text("explanation").notNull(),
  humanVerified: boolean("human_verified").notNull().default(false),
  humanCorrection: text("human_correction"),
});

export const fallacyDetectionsRelations = relations(
  fallacyDetections,
  ({ one }) => ({
    analysis: one(analyses, {
      fields: [fallacyDetections.analysisId],
      references: [analyses.id],
    }),
  })
);

// ─── Reframing Detections ───────────────────────────────────────────

export const reframingDetections = pgTable("reframing_detections", {
  id: text("id").primaryKey(),
  analysisId: text("analysis_id")
    .notNull()
    .references(() => analyses.id, { onDelete: "cascade" }),
  technique: text("technique").notNull(),
  techniqueName: text("technique_name").notNull(),
  confidence: real("confidence").notNull(),
  excerpt: text("excerpt").notNull(),
  explanation: text("explanation").notNull(),
  suggestedNeutralFraming: text("suggested_neutral_framing"),
  humanVerified: boolean("human_verified").notNull().default(false),
});

export const reframingDetectionsRelations = relations(
  reframingDetections,
  ({ one }) => ({
    analysis: one(analyses, {
      fields: [reframingDetections.analysisId],
      references: [analyses.id],
    }),
  })
);

// ─── Bias Indicators ────────────────────────────────────────────────

export const biasIndicators = pgTable("bias_indicators", {
  id: text("id").primaryKey(),
  analysisId: text("analysis_id")
    .notNull()
    .references(() => analyses.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  description: text("description").notNull(),
  excerpt: text("excerpt").notNull(),
  direction: text("direction").notNull(),
  weight: real("weight").notNull(),
});

export const biasIndicatorsRelations = relations(biasIndicators, ({ one }) => ({
  analysis: one(analyses, {
    fields: [biasIndicators.analysisId],
    references: [analyses.id],
  }),
}));

// ─── Political Profiles ─────────────────────────────────────────────

export const politicalProfiles = pgTable("political_profiles", {
  id: text("id").primaryKey(),
  punditId: text("pundit_id")
    .notNull()
    .references(() => pundits.id, { onDelete: "cascade" }),
  assessedAt: timestamp("assessed_at").notNull().defaultNow(),
  ideologicalCoherence: real("ideological_coherence").notNull(),
  notes: text("notes").notNull().default(""),
});

export const politicalProfilesRelations = relations(
  politicalProfiles,
  ({ one, many }) => ({
    pundit: one(pundits, {
      fields: [politicalProfiles.punditId],
      references: [pundits.id],
    }),
    axisPositions: many(axisPositions),
  })
);

export const axisPositions = pgTable("axis_positions", {
  id: text("id").primaryKey(),
  profileId: text("profile_id")
    .notNull()
    .references(() => politicalProfiles.id, { onDelete: "cascade" }),
  axisId: text("axis_id").notNull(),
  value: real("value").notNull(),
  confidence: real("confidence").notNull(),
  evidence: text("evidence").notNull().default(""),
  trend: text("trend"),
});

export const axisPositionsRelations = relations(axisPositions, ({ one }) => ({
  profile: one(politicalProfiles, {
    fields: [axisPositions.profileId],
    references: [politicalProfiles.id],
  }),
}));

// ─── Overton Window Snapshots ───────────────────────────────────────

export const overtonSnapshots = pgTable("overton_snapshots", {
  id: text("id").primaryKey(),
  domain: text("domain").notNull(),
  date: text("date").notNull(),
  leftEdge: real("left_edge").notNull(),
  rightEdge: real("right_edge").notNull(),
  center: real("center").notNull(),
  width: real("width").notNull(),
  evidence: text("evidence").notNull(),
  keyEvents: jsonb("key_events").$type<string[]>().default([]),
});

// ─── Monitored Sources ──────────────────────────────────────────────

export const monitoredSources = pgTable("monitored_sources", {
  id: text("id").primaryKey(),
  punditId: text("pundit_id").references(() => pundits.id, {
    onDelete: "cascade",
  }),
  type: text("type").notNull(), // "youtube-channel" | "rss" | "website"
  name: text("name").notNull(),
  url: text("url").notNull(),
  enabled: boolean("enabled").notNull().default(true),
  scrapeIntervalMinutes: integer("scrape_interval_minutes").notNull().default(60),
  lastCheckedAt: timestamp("last_checked_at"),
  lastContentId: text("last_content_id"), // for deduplication
  metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const monitoredSourcesRelations = relations(
  monitoredSources,
  ({ one }) => ({
    pundit: one(pundits, {
      fields: [monitoredSources.punditId],
      references: [pundits.id],
    }),
  })
);

// ─── Content Hashes (deduplication) ─────────────────────────────────

export const contentHashes = pgTable("content_hashes", {
  hash: text("hash").primaryKey(),
  contentId: text("content_id")
    .notNull()
    .references(() => contentItems.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const contentHashesRelations = relations(contentHashes, ({ one }) => ({
  content: one(contentItems, {
    fields: [contentHashes.contentId],
    references: [contentItems.id],
  }),
}));

// ─── Stories (cross-source tracking) ────────────────────────────────

/**
 * A "story" is a real-world event or topic that multiple sources cover.
 * Linking content_items to stories lets us compare how different outlets
 * frame the same thing — verbiage, tone, axis positioning, fallacy patterns.
 */
export const stories = pgTable("stories", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description").notNull().default(""),
  /** When the story first appeared in the news cycle */
  occurredAt: timestamp("occurred_at").notNull(),
  /** Topic tags for grouping (e.g., "immigration", "healthcare", "election") */
  topics: jsonb("topics").$type<string[]>().notNull().default([]),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const storiesRelations = relations(stories, ({ many }) => ({
  coverages: many(storyCoverages),
}));

/**
 * Links a content_item to a story, with per-source analysis snapshot.
 * This is where the comparison data lives — how this specific source
 * covered this specific story.
 */
export const storyCoverages = pgTable("story_coverages", {
  id: text("id").primaryKey(),
  storyId: text("story_id")
    .notNull()
    .references(() => stories.id, { onDelete: "cascade" }),
  contentId: text("content_id")
    .notNull()
    .references(() => contentItems.id, { onDelete: "cascade" }),
  sourceId: text("source_id").references(() => pundits.id, {
    onDelete: "cascade",
  }),

  // ─── Verbiage tracking ──────────────────────────────────────────
  /** Key terms and phrases this source used for the story */
  keyTerms: jsonb("key_terms").$type<string[]>().notNull().default([]),
  /** Headline or framing headline used */
  headline: text("headline").notNull().default(""),
  /** Tone toward the story subject: hostile to favorable */
  toneScore: real("tone_score"),
  /** Framing category: how was the story presented */
  framingType: text("framing_type"), // e.g., "crisis", "scandal", "progress", "neutral-report", "opinion"

  // ─── Political values per-story ─────────────────────────────────
  /** 5-axis scores for THIS specific coverage (not the source's overall profile) */
  axisEconomic: real("axis_economic"),
  axisSpeech: real("axis_speech"),
  axisProgressive: real("axis_progressive"),
  axisLiberalConservative: real("axis_liberal_conservative"),
  axisForeignPolicy: real("axis_foreign_policy"),

  // ─── Timing ────────────────────────────────────────────────────
  /** When this source first published their coverage */
  firstPublishedAt: timestamp("first_published_at"),
  /** When the coverage was last updated (if tracked) */
  lastUpdatedAt: timestamp("last_updated_at"),
  /** Position in the coverage timeline: who set the frame? */
  coverageOrder: text("coverage_order"), // "first-mover", "early", "mainstream", "late", "never" (used for blindspot)

  // ─── Comparison metadata ────────────────────────────────────────
  /** Auto-generated or human notes on how this coverage differs from others */
  comparisonNotes: text("comparison_notes"),

  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const storyCoveragesRelations = relations(
  storyCoverages,
  ({ one }) => ({
    story: one(stories, {
      fields: [storyCoverages.storyId],
      references: [stories.id],
    }),
    content: one(contentItems, {
      fields: [storyCoverages.contentId],
      references: [contentItems.id],
    }),
    source: one(pundits, {
      fields: [storyCoverages.sourceId],
      references: [pundits.id],
    }),
  })
);

// ─── Blog Posts ─────────────────────────────────────────────────────

export const blogPosts = pgTable("blog_posts", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  content: text("content").notNull(), // markdown
  excerpt: text("excerpt").notNull().default(""),
  status: text("status").notNull().default("draft"), // "draft", "published", "archived"
  postType: text("post_type").notNull(), // "individual-analysis", "trend-report", "comparison", "story-comparison"
  /** Related analysis IDs (for individual analysis posts) */
  relatedAnalysisIds: jsonb("related_analysis_ids").$type<string[]>().notNull().default([]),
  /** Related pundit IDs */
  relatedPunditIds: jsonb("related_pundit_ids").$type<string[]>().notNull().default([]),
  /** Related story ID (for story comparison posts) */
  relatedStoryId: text("related_story_id"),
  publishedAt: timestamp("published_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ─── Claims & Omission Tracking ─────────────────────────────────────

/**
 * A "claim" is a discrete factual assertion extracted from content.
 * Claims are the atomic unit of truth-tracking. When multiple sources
 * cover the same story, we extract claims from each and cross-reference
 * to find what each source included vs omitted.
 *
 * Claims are NOT opinions or framing. "50 people were killed" is a claim.
 * "This devastating attack..." is framing.
 */
export const claims = pgTable("claims", {
  id: text("id").primaryKey(),
  storyId: text("story_id")
    .notNull()
    .references(() => stories.id, { onDelete: "cascade" }),
  /** The canonical/normalized statement of the claim */
  statement: text("statement").notNull(),
  /** What kind of claim this is */
  claimType: text("claim_type").notNull(), // "event", "statistic", "quote", "attribution", "context", "denial"
  /** How important is this claim to understanding the story? */
  significance: text("significance").notNull(), // "critical", "important", "minor"
  /** Can this claim be independently verified? */
  verifiability: text("verifiability").notNull(), // "verifiable", "partially-verifiable", "unverifiable"
  /** If verifiable, what type of source would verify it? */
  verificationSource: text("verification_source"), // "government-data", "court-record", "official-statement", "eyewitness", "expert", "primary-document"
  /** Has this claim been verified? */
  verificationStatus: text("verification_status").notNull().default("unverified"), // "verified", "disputed", "debunked", "unverified"
  verificationNotes: text("verification_notes"),
  /** Epistemological classification from Logic System taxonomy */
  epistemologicalStatus: text("epistemological_status"), // "verifiable-observation", "statistical-claim", "tacit-consensus", "causal-claim", "model-dependent", "value-judgment"
  epistemologicalConfidence: real("epistemological_confidence"),
  /** True if this claim presents one truth-status as another (the core bias mechanism) */
  categoryError: boolean("category_error").default(false),
  /** What the claim disguises itself as, if categoryError is true */
  disguisedAs: text("disguised_as"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const claimsRelations = relations(claims, ({ one, many }) => ({
  story: one(stories, {
    fields: [claims.storyId],
    references: [stories.id],
  }),
  sourceClaims: many(sourceClaims),
}));

/**
 * Links a claim to the specific source that made it (or omitted it).
 * This is the join table that powers omission detection.
 *
 * For each claim in a story, every source that covered the story
 * gets an entry: either "included" (with their specific wording)
 * or "omitted" (the claim was not present in their coverage).
 */
export const sourceClaims = pgTable("source_claims", {
  id: text("id").primaryKey(),
  claimId: text("claim_id")
    .notNull()
    .references(() => claims.id, { onDelete: "cascade" }),
  coverageId: text("coverage_id")
    .notNull()
    .references(() => storyCoverages.id, { onDelete: "cascade" }),
  /** Did this source include or omit this claim? */
  status: text("status").notNull(), // "included", "omitted", "partial", "distorted"
  /** If included, the source's exact wording (may differ from canonical) */
  sourceWording: text("source_wording"),
  /** If the wording differs meaningfully from the canonical claim */
  wordingDivergence: text("wording_divergence"), // null, "minor" (synonym), "significant" (different framing), "contradicts"
  /** If the source cited a specific number or source that differs from others */
  divergentDetail: text("divergent_detail"),
  /** The source this claim was attributed to in the article (e.g., "MSF", "Pentagon") */
  attributedTo: text("attributed_to"),
});

export const sourceClaimsRelations = relations(sourceClaims, ({ one }) => ({
  claim: one(claims, {
    fields: [sourceClaims.claimId],
    references: [claims.id],
  }),
  coverage: one(storyCoverages, {
    fields: [sourceClaims.coverageId],
    references: [storyCoverages.id],
  }),
}));

// ─── Training Examples ──────────────────────────────────────────────

export const trainingExamples = pgTable("training_examples", {
  id: text("id").primaryKey(),
  text: text("text").notNull(),
  contentId: text("content_id").references(() => contentItems.id, {
    onDelete: "set null",
  }),
  labeledBy: text("labeled_by").notNull(),
  labeledAt: timestamp("labeled_at").notNull().defaultNow(),
  verified: boolean("verified").notNull().default(false),
});

export const trainingExamplesRelations = relations(
  trainingExamples,
  ({ one, many }) => ({
    content: one(contentItems, {
      fields: [trainingExamples.contentId],
      references: [contentItems.id],
    }),
    labels: many(trainingLabels),
  })
);

export const trainingLabels = pgTable("training_labels", {
  id: text("id").primaryKey(),
  exampleId: text("example_id")
    .notNull()
    .references(() => trainingExamples.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  value: text("value").notNull(),
  startIndex: integer("start_index").notNull(),
  endIndex: integer("end_index").notNull(),
  confidence: real("confidence").notNull(),
  notes: text("notes"),
});

export const trainingLabelsRelations = relations(
  trainingLabels,
  ({ one }) => ({
    example: one(trainingExamples, {
      fields: [trainingLabels.exampleId],
      references: [trainingExamples.id],
    }),
  })
);
