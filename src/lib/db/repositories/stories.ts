import { eq, desc, notInArray, sql } from "drizzle-orm";
import { db } from "../client";
import { stories, storyCoverages, pundits } from "../schema";

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
  /** @deprecated Replaced by axisCausationAnalysis + axisEqualityModel. Kept for historical rows. */
  axisProgressive: number | null;
  axisCausationAnalysis: number | null;
  axisEqualityModel: number | null;
  axisLiberalConservative: number | null;
  axisForeignPolicy: number | null;
  axisPopulism: number | null;
  axisNationalism: number | null;
  axisAuthority: number | null;
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
  /** @deprecated — pass axisCausationAnalysis / axisEqualityModel instead. */
  axisProgressive?: number;
  axisCausationAnalysis?: number;
  axisEqualityModel?: number;
  axisLiberalConservative?: number;
  axisForeignPolicy?: number;
  axisPopulism?: number;
  axisNationalism?: number;
  axisAuthority?: number;
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
      axisCausationAnalysis: coverage.axisCausationAnalysis,
      axisEqualityModel: coverage.axisEqualityModel,
      axisLiberalConservative: coverage.axisLiberalConservative,
      axisForeignPolicy: coverage.axisForeignPolicy,
      axisPopulism: coverage.axisPopulism,
      axisNationalism: coverage.axisNationalism,
      axisAuthority: coverage.axisAuthority,
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
    axisCausationAnalysis: r.axisCausationAnalysis,
    axisEqualityModel: r.axisEqualityModel,
    axisLiberalConservative: r.axisLiberalConservative,
    axisForeignPolicy: r.axisForeignPolicy,
    axisPopulism: r.axisPopulism,
    axisNationalism: r.axisNationalism,
    axisAuthority: r.axisAuthority,
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

  // Compute axis ranges across the active 9-axis model. axisProgressive is
  // deliberately excluded — it's kept on the row for historical rows but
  // is not part of new analysis.
  const axisKeys = [
    "axisEconomic",
    "axisSpeech",
    "axisCausationAnalysis",
    "axisEqualityModel",
    "axisLiberalConservative",
    "axisForeignPolicy",
    "axisPopulism",
    "axisNationalism",
    "axisAuthority",
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
      axisCausationAnalysis: c.axisCausationAnalysis,
      axisEqualityModel: c.axisEqualityModel,
      axisLiberalConservative: c.axisLiberalConservative,
      axisForeignPolicy: c.axisForeignPolicy,
      axisPopulism: c.axisPopulism,
      axisNationalism: c.axisNationalism,
      axisAuthority: c.axisAuthority,
      comparisonNotes: c.comparisonNotes,
      sourceName: (c.source as { name: string } | null)?.name ?? "Unknown",
    })),
    sharedTerms,
    uniqueTermsBySource,
    toneRange,
    axisRanges,
  };
}

// ─── Blindspot Detection ────────────────────────────────────────────

export interface Blindspot {
  storyId: string;
  storyTitle: string;
  occurredAt: string;
  /** Sources that covered the story */
  coveredBy: { id: string; name: string; leaning: string }[];
  /** Sources that did NOT cover the story */
  missedBy: { id: string; name: string; leaning: string }[];
  /** Coverage distribution: how many left/center/right sources covered it */
  coverageDistribution: {
    left: number;
    center: number;
    right: number;
    total: number;
  };
  /** Is this a left blindspot (mostly right covered) or right blindspot (mostly left covered)? */
  blindspotDirection: "left-blindspot" | "right-blindspot" | "balanced" | "low-coverage";
}

/**
 * Detect blindspots for a story — which monitored sources didn't cover it.
 *
 * A blindspot is when a story is disproportionately covered by one side
 * of the political spectrum. From the Logic System: absence of constraints
 * (coverage) is itself informative — a source that doesn't cover a story
 * is leaving its audience with a less-constrained narrative space.
 */
export async function detectBlindspots(
  storyId: string
): Promise<Blindspot | null> {
  const story = await db.query.stories.findFirst({
    where: eq(stories.id, storyId),
  });
  if (!story) return null;

  // Get all sources that covered this story
  const coverages = await db.query.storyCoverages.findMany({
    where: eq(storyCoverages.storyId, storyId),
    with: { source: true },
  });

  const coveredSourceIds = new Set(
    coverages.map((c) => c.sourceId).filter(Boolean)
  );

  // Get all monitored pundits/orgs that SHOULD have covered it
  // (organizations and major outlets, not individual pundits)
  const allSources = await db.query.pundits.findMany();

  const coveredBy: Blindspot["coveredBy"] = [];
  const missedBy: Blindspot["missedBy"] = [];

  for (const source of allSources) {
    const entry = {
      id: source.id,
      name: source.name,
      leaning: source.currentLeaning,
    };

    if (coveredSourceIds.has(source.id)) {
      coveredBy.push(entry);
    } else {
      missedBy.push(entry);
    }
  }

  // Compute distribution
  const leaningToSide = (leaning: string): "left" | "center" | "right" => {
    if (["far-left", "left", "center-left"].includes(leaning)) return "left";
    if (["far-right", "right", "center-right"].includes(leaning)) return "right";
    return "center";
  };

  const distribution = { left: 0, center: 0, right: 0, total: coveredBy.length };
  for (const source of coveredBy) {
    distribution[leaningToSide(source.leaning)]++;
  }

  // Determine blindspot direction
  let blindspotDirection: Blindspot["blindspotDirection"] = "balanced";
  if (distribution.total < 3) {
    blindspotDirection = "low-coverage";
  } else {
    const leftRatio = distribution.left / distribution.total;
    const rightRatio = distribution.right / distribution.total;
    // If >70% of coverage comes from one side, it's a blindspot for the other
    if (leftRatio > 0.7) {
      blindspotDirection = "right-blindspot"; // right isn't covering it
    } else if (rightRatio > 0.7) {
      blindspotDirection = "left-blindspot"; // left isn't covering it
    }
  }

  return {
    storyId: story.id,
    storyTitle: story.title,
    occurredAt: story.occurredAt.toISOString(),
    coveredBy,
    missedBy,
    coverageDistribution: distribution,
    blindspotDirection,
  };
}

/**
 * Find all stories with significant blindspots.
 * Returns stories where coverage is disproportionately from one side.
 */
export async function findBlindspotStories(
  options?: { limit?: number; direction?: "left-blindspot" | "right-blindspot" }
): Promise<Blindspot[]> {
  const allStories = await db.query.stories.findMany({
    orderBy: [desc(stories.occurredAt)],
    limit: options?.limit ?? 50,
  });

  const blindspots: Blindspot[] = [];

  for (const story of allStories) {
    const blindspot = await detectBlindspots(story.id);
    if (!blindspot) continue;

    if (blindspot.blindspotDirection === "balanced" || blindspot.blindspotDirection === "low-coverage") {
      continue;
    }

    if (options?.direction && blindspot.blindspotDirection !== options.direction) {
      continue;
    }

    blindspots.push(blindspot);
  }

  return blindspots;
}

// ─── Coverage Timeline ──────────────────────────────────────────────

export interface CoverageTimeline {
  storyId: string;
  storyTitle: string;
  /** Ordered list of when each source first covered the story */
  timeline: {
    sourceId: string | null;
    sourceName: string;
    leaning: string;
    firstPublishedAt: string | null;
    coverageOrder: string | null;
    headline: string;
    toneScore: number | null;
    framingType: string | null;
  }[];
  /** Who set the initial frame? */
  firstMover: string | null;
  /** How long between first and last coverage? */
  spreadHours: number | null;
}

/**
 * Build a timeline showing when each source covered a story.
 * Reveals who set the frame and who followed.
 */
export async function getCoverageTimeline(
  storyId: string
): Promise<CoverageTimeline | null> {
  const story = await db.query.stories.findFirst({
    where: eq(stories.id, storyId),
  });
  if (!story) return null;

  const coverages = await db.query.storyCoverages.findMany({
    where: eq(storyCoverages.storyId, storyId),
    with: { source: true },
  });

  // Sort by firstPublishedAt
  const sorted = coverages
    .map((c) => ({
      sourceId: c.sourceId,
      sourceName: (c.source as { name: string } | null)?.name ?? "Unknown",
      leaning: (c.source as { currentLeaning: string } | null)?.currentLeaning ?? "unclassified",
      firstPublishedAt: c.firstPublishedAt?.toISOString() ?? null,
      coverageOrder: c.coverageOrder,
      headline: c.headline,
      toneScore: c.toneScore,
      framingType: c.framingType,
    }))
    .sort((a, b) => {
      if (!a.firstPublishedAt) return 1;
      if (!b.firstPublishedAt) return -1;
      return new Date(a.firstPublishedAt).getTime() - new Date(b.firstPublishedAt).getTime();
    });

  const firstMover = sorted[0]?.sourceName ?? null;

  let spreadHours: number | null = null;
  if (sorted.length >= 2) {
    const first = sorted.find((s) => s.firstPublishedAt);
    const last = [...sorted].reverse().find((s) => s.firstPublishedAt);
    if (first?.firstPublishedAt && last?.firstPublishedAt) {
      spreadHours =
        (new Date(last.firstPublishedAt).getTime() -
          new Date(first.firstPublishedAt).getTime()) /
        (1000 * 60 * 60);
    }
  }

  return {
    storyId: story.id,
    storyTitle: story.title,
    timeline: sorted,
    firstMover,
    spreadHours,
  };
}
