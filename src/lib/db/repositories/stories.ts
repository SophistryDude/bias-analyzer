import { eq, desc } from "drizzle-orm";
import { db } from "../client";
import { stories, storyCoverages } from "../schema";

// ─── Types ──────────────────────────────────────────────────────────

export interface Story {
  id: string;
  title: string;
  slug: string;
  description: string;
  occurredAt: string;
  topics: string[];
  coverageCount?: number;
}

export interface StoryCoverage {
  id: string;
  storyId: string;
  contentId: string;
  sourceId: string | null;
  keyTerms: string[];
  headline: string;
  toneScore: number | null;
  framingType: string | null;
  axisEconomic: number | null;
  axisSpeech: number | null;
  axisProgressive: number | null;
  axisLiberalConservative: number | null;
  axisForeignPolicy: number | null;
  comparisonNotes: string | null;
}

export interface StoryComparison {
  story: Story;
  coverages: (StoryCoverage & { sourceName: string })[];
  /** Terms used by multiple sources */
  sharedTerms: string[];
  /** Terms unique to specific sources */
  uniqueTermsBySource: Record<string, string[]>;
  /** Range of tone scores across sources */
  toneRange: { min: number; max: number; spread: number } | null;
  /** Range of axis scores across sources */
  axisRanges: Record<string, { min: number; max: number; spread: number }>;
}

// ─── Queries ────────────────────────────────────────────────────────

export async function createStory(story: {
  id: string;
  title: string;
  slug: string;
  description: string;
  occurredAt: Date;
  topics: string[];
}): Promise<void> {
  await db
    .insert(stories)
    .values({
      id: story.id,
      title: story.title,
      slug: story.slug,
      description: story.description,
      occurredAt: story.occurredAt,
      topics: story.topics,
    })
    .onConflictDoNothing();
}

export async function addCoverage(coverage: {
  id: string;
  storyId: string;
  contentId: string;
  sourceId: string | null;
  keyTerms: string[];
  headline: string;
  toneScore?: number;
  framingType?: string;
  axisEconomic?: number;
  axisSpeech?: number;
  axisProgressive?: number;
  axisLiberalConservative?: number;
  axisForeignPolicy?: number;
}): Promise<void> {
  await db
    .insert(storyCoverages)
    .values({
      id: coverage.id,
      storyId: coverage.storyId,
      contentId: coverage.contentId,
      sourceId: coverage.sourceId,
      keyTerms: coverage.keyTerms,
      headline: coverage.headline,
      toneScore: coverage.toneScore,
      framingType: coverage.framingType,
      axisEconomic: coverage.axisEconomic,
      axisSpeech: coverage.axisSpeech,
      axisProgressive: coverage.axisProgressive,
      axisLiberalConservative: coverage.axisLiberalConservative,
      axisForeignPolicy: coverage.axisForeignPolicy,
    })
    .onConflictDoNothing();
}

export async function getStoryBySlug(slug: string): Promise<Story | null> {
  const row = await db.query.stories.findFirst({
    where: eq(stories.slug, slug),
  });
  if (!row) return null;

  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    description: row.description,
    occurredAt: row.occurredAt.toISOString(),
    topics: row.topics as string[],
  };
}

export async function getRecentStories(limit: number = 20): Promise<Story[]> {
  const rows = await db.query.stories.findMany({
    orderBy: [desc(stories.occurredAt)],
    limit,
  });

  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    slug: r.slug,
    description: r.description,
    occurredAt: r.occurredAt.toISOString(),
    topics: r.topics as string[],
  }));
}

export async function getStoryCoverages(
  storyId: string
): Promise<StoryCoverage[]> {
  const rows = await db.query.storyCoverages.findMany({
    where: eq(storyCoverages.storyId, storyId),
  });

  return rows.map((r) => ({
    id: r.id,
    storyId: r.storyId,
    contentId: r.contentId,
    sourceId: r.sourceId,
    keyTerms: r.keyTerms as string[],
    headline: r.headline,
    toneScore: r.toneScore,
    framingType: r.framingType,
    axisEconomic: r.axisEconomic,
    axisSpeech: r.axisSpeech,
    axisProgressive: r.axisProgressive,
    axisLiberalConservative: r.axisLiberalConservative,
    axisForeignPolicy: r.axisForeignPolicy,
    comparisonNotes: r.comparisonNotes,
  }));
}

/**
 * Build a comparison report for a story across all sources that covered it.
 */
export async function buildStoryComparison(
  storyId: string
): Promise<StoryComparison | null> {
  const story = await db.query.stories.findFirst({
    where: eq(stories.id, storyId),
  });
  if (!story) return null;

  const coverages = await db.query.storyCoverages.findMany({
    where: eq(storyCoverages.storyId, storyId),
    with: { source: true },
  });

  // Compute shared vs unique terms
  const termCounts = new Map<string, string[]>();
  for (const c of coverages) {
    const terms = c.keyTerms as string[];
    const sourceLabel = (c.source as { name: string } | null)?.name ?? c.sourceId ?? "unknown";
    for (const term of terms) {
      const lower = term.toLowerCase();
      if (!termCounts.has(lower)) termCounts.set(lower, []);
      termCounts.get(lower)!.push(sourceLabel);
    }
  }

  const sharedTerms = [...termCounts.entries()]
    .filter(([, sources]) => sources.length > 1)
    .map(([term]) => term);

  const uniqueTermsBySource: Record<string, string[]> = {};
  for (const [term, sources] of termCounts.entries()) {
    if (sources.length === 1) {
      const source = sources[0];
      if (!uniqueTermsBySource[source]) uniqueTermsBySource[source] = [];
      uniqueTermsBySource[source].push(term);
    }
  }

  // Compute tone range
  const toneScores = coverages
    .map((c) => c.toneScore)
    .filter((t): t is number => t !== null);
  const toneRange =
    toneScores.length >= 2
      ? {
          min: Math.min(...toneScores),
          max: Math.max(...toneScores),
          spread: Math.max(...toneScores) - Math.min(...toneScores),
        }
      : null;

  // Compute axis ranges
  const axisKeys = [
    "axisEconomic",
    "axisSpeech",
    "axisProgressive",
    "axisLiberalConservative",
    "axisForeignPolicy",
  ] as const;

  const axisRanges: Record<string, { min: number; max: number; spread: number }> = {};
  for (const key of axisKeys) {
    const values = coverages
      .map((c) => c[key])
      .filter((v): v is number => v !== null);
    if (values.length >= 2) {
      axisRanges[key] = {
        min: Math.min(...values),
        max: Math.max(...values),
        spread: Math.max(...values) - Math.min(...values),
      };
    }
  }

  return {
    story: {
      id: story.id,
      title: story.title,
      slug: story.slug,
      description: story.description,
      occurredAt: story.occurredAt.toISOString(),
      topics: story.topics as string[],
    },
    coverages: coverages.map((c) => ({
      id: c.id,
      storyId: c.storyId,
      contentId: c.contentId,
      sourceId: c.sourceId,
      keyTerms: c.keyTerms as string[],
      headline: c.headline,
      toneScore: c.toneScore,
      framingType: c.framingType,
      axisEconomic: c.axisEconomic,
      axisSpeech: c.axisSpeech,
      axisProgressive: c.axisProgressive,
      axisLiberalConservative: c.axisLiberalConservative,
      axisForeignPolicy: c.axisForeignPolicy,
      comparisonNotes: c.comparisonNotes,
      sourceName: (c.source as { name: string } | null)?.name ?? "Unknown",
    })),
    sharedTerms,
    uniqueTermsBySource,
    toneRange,
    axisRanges,
  };
}
