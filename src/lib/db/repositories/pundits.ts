import { eq, like, or, sql } from "drizzle-orm";
import { db } from "../client";
import { pundits, leaningSnapshots, analyses } from "../schema";
import type { Pundit, PoliticalLeaning } from "../../models/types";

export async function getAllPundits(): Promise<Pundit[]> {
  const rows = await db.query.pundits.findMany({
    with: { leaningHistory: true },
  });

  const punditIds = rows.map((r) => r.id);
  const stats = punditIds.length > 0
    ? await db
        .select({
          sourceId: analyses.contentId,
          punditId: sql<string>`ci.source_id`,
          count: sql<number>`count(*)::int`,
          avgBias: sql<number>`avg(${analyses.biasConfidence})`,
          avgManipulation: sql<number>`avg(${analyses.manipulationScore})`,
        })
        .from(analyses)
        .innerJoin(
          sql`content_items ci`,
          sql`ci.id = ${analyses.contentId}`
        )
        .groupBy(sql`ci.source_id`, analyses.contentId)
    : [];

  const statsMap = new Map<string, { count: number; avgBias: number; avgManipulation: number }>();
  for (const s of stats) {
    const existing = statsMap.get(s.punditId) || { count: 0, avgBias: 0, avgManipulation: 0 };
    statsMap.set(s.punditId, {
      count: existing.count + s.count,
      avgBias: (existing.avgBias + (s.avgBias ?? 0)) / 2 || 0,
      avgManipulation: (existing.avgManipulation + (s.avgManipulation ?? 0)) / 2 || 0,
    });
  }

  return rows.map((r) => {
    const s = statsMap.get(r.id);
    return {
      id: r.id,
      name: r.name,
      slug: r.slug,
      platforms: r.platforms as Pundit["platforms"],
      currentLeaning: r.currentLeaning as PoliticalLeaning,
      leaningHistory: r.leaningHistory.map((lh) => ({
        date: lh.date,
        leaning: lh.leaning as PoliticalLeaning,
        evidence: lh.evidence,
      })),
      description: r.description,
      knownFor: r.knownFor as string[],
      imageUrl: r.imageUrl ?? undefined,
      externalLinks: r.externalLinks as { platform: string; url: string }[],
      tags: r.tags as string[],
      analysisCount: s?.count ?? 0,
      averageBiasScore: s?.avgBias ?? 0,
      averageManipulationScore: s?.avgManipulation ?? 0,
    };
  });
}

export async function getPunditBySlug(slug: string): Promise<Pundit | null> {
  const row = await db.query.pundits.findFirst({
    where: eq(pundits.slug, slug),
    with: { leaningHistory: true },
  });
  if (!row) return null;

  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    platforms: row.platforms as Pundit["platforms"],
    currentLeaning: row.currentLeaning as PoliticalLeaning,
    leaningHistory: row.leaningHistory.map((lh) => ({
      date: lh.date,
      leaning: lh.leaning as PoliticalLeaning,
      evidence: lh.evidence,
    })),
    description: row.description,
    knownFor: row.knownFor as string[],
    imageUrl: row.imageUrl ?? undefined,
    externalLinks: row.externalLinks as { platform: string; url: string }[],
    tags: row.tags as string[],
    analysisCount: 0,
    averageBiasScore: 0,
    averageManipulationScore: 0,
  };
}

export async function getPunditsByLeaning(
  leaning: PoliticalLeaning
): Promise<Pundit[]> {
  const all = await getAllPundits();
  return all.filter((p) => p.currentLeaning === leaning);
}

export async function searchPundits(query: string): Promise<Pundit[]> {
  const pattern = `%${query.toLowerCase()}%`;
  const rows = await db.query.pundits.findMany({
    where: or(
      like(sql`lower(${pundits.name})`, pattern),
      like(sql`lower(${pundits.description})`, pattern)
    ),
    with: { leaningHistory: true },
  });

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    slug: r.slug,
    platforms: r.platforms as Pundit["platforms"],
    currentLeaning: r.currentLeaning as PoliticalLeaning,
    leaningHistory: r.leaningHistory.map((lh) => ({
      date: lh.date,
      leaning: lh.leaning as PoliticalLeaning,
      evidence: lh.evidence,
    })),
    description: r.description,
    knownFor: r.knownFor as string[],
    imageUrl: r.imageUrl ?? undefined,
    externalLinks: r.externalLinks as { platform: string; url: string }[],
    tags: r.tags as string[],
    analysisCount: 0,
    averageBiasScore: 0,
    averageManipulationScore: 0,
  }));
}

export async function upsertPundit(
  pundit: Pundit
): Promise<void> {
  await db
    .insert(pundits)
    .values({
      id: pundit.id,
      name: pundit.name,
      slug: pundit.slug,
      platforms: pundit.platforms,
      currentLeaning: pundit.currentLeaning,
      description: pundit.description,
      knownFor: pundit.knownFor,
      imageUrl: pundit.imageUrl,
      externalLinks: pundit.externalLinks,
      tags: pundit.tags,
    })
    .onConflictDoUpdate({
      target: pundits.id,
      set: {
        name: pundit.name,
        slug: pundit.slug,
        platforms: pundit.platforms,
        currentLeaning: pundit.currentLeaning,
        description: pundit.description,
        knownFor: pundit.knownFor,
        imageUrl: pundit.imageUrl,
        externalLinks: pundit.externalLinks,
        tags: pundit.tags,
        updatedAt: new Date(),
      },
    });

  // Upsert leaning snapshots
  for (const snapshot of pundit.leaningHistory) {
    const snapshotId = `${pundit.id}-${snapshot.date}`;
    await db
      .insert(leaningSnapshots)
      .values({
        id: snapshotId,
        punditId: pundit.id,
        date: snapshot.date,
        leaning: snapshot.leaning,
        evidence: snapshot.evidence,
      })
      .onConflictDoUpdate({
        target: leaningSnapshots.id,
        set: {
          leaning: snapshot.leaning,
          evidence: snapshot.evidence,
        },
      });
  }
}
