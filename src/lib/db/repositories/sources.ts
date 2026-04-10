import { eq, and, lte, sql } from "drizzle-orm";
import { db } from "../client";
import { monitoredSources } from "../schema";

export interface MonitoredSource {
  id: string;
  punditId: string | null;
  type: "youtube-channel" | "rss" | "website";
  name: string;
  url: string;
  enabled: boolean;
  scrapeIntervalMinutes: number;
  lastCheckedAt: string | null;
  lastContentId: string | null;
  metadata: Record<string, unknown>;
}

export async function getAllSources(): Promise<MonitoredSource[]> {
  const rows = await db.select().from(monitoredSources);
  return rows.map(toMonitoredSource);
}

export async function getSourcesDueForCheck(): Promise<MonitoredSource[]> {
  const rows = await db
    .select()
    .from(monitoredSources)
    .where(
      and(
        eq(monitoredSources.enabled, true),
        sql`(${monitoredSources.lastCheckedAt} IS NULL OR ${monitoredSources.lastCheckedAt} < NOW() - (${monitoredSources.scrapeIntervalMinutes} || ' minutes')::interval)`
      )
    );
  return rows.map(toMonitoredSource);
}

export async function markSourceChecked(
  sourceId: string,
  lastContentId?: string
): Promise<void> {
  await db
    .update(monitoredSources)
    .set({
      lastCheckedAt: new Date(),
      ...(lastContentId ? { lastContentId } : {}),
    })
    .where(eq(monitoredSources.id, sourceId));
}

export async function upsertSource(source: MonitoredSource): Promise<void> {
  await db
    .insert(monitoredSources)
    .values({
      id: source.id,
      punditId: source.punditId,
      type: source.type,
      name: source.name,
      url: source.url,
      enabled: source.enabled,
      scrapeIntervalMinutes: source.scrapeIntervalMinutes,
      lastContentId: source.lastContentId,
      metadata: source.metadata,
    })
    .onConflictDoUpdate({
      target: monitoredSources.id,
      set: {
        name: source.name,
        url: source.url,
        enabled: source.enabled,
        scrapeIntervalMinutes: source.scrapeIntervalMinutes,
        metadata: source.metadata,
      },
    });
}

function toMonitoredSource(row: {
  id: string;
  punditId: string | null;
  type: string;
  name: string;
  url: string;
  enabled: boolean;
  scrapeIntervalMinutes: number;
  lastCheckedAt: Date | null;
  lastContentId: string | null;
  metadata: Record<string, unknown>;
}): MonitoredSource {
  return {
    id: row.id,
    punditId: row.punditId,
    type: row.type as MonitoredSource["type"],
    name: row.name,
    url: row.url,
    enabled: row.enabled,
    scrapeIntervalMinutes: row.scrapeIntervalMinutes,
    lastCheckedAt: row.lastCheckedAt?.toISOString() ?? null,
    lastContentId: row.lastContentId,
    metadata: row.metadata,
  };
}
