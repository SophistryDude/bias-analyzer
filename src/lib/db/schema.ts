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
