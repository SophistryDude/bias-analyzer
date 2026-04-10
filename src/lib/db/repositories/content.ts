import { eq } from "drizzle-orm";
import { db } from "../client";
import { contentItems } from "../schema";
import type { ContentItem } from "../../models/types";

export async function getContentById(
  id: string
): Promise<ContentItem | null> {
  const row = await db.query.contentItems.findFirst({
    where: eq(contentItems.id, id),
  });

  if (!row) return null;
  return toContentItem(row);
}

export async function getContentBySourceId(
  sourceId: string
): Promise<ContentItem[]> {
  const rows = await db.query.contentItems.findMany({
    where: eq(contentItems.sourceId, sourceId),
  });

  return rows.map(toContentItem);
}

function toContentItem(row: {
  id: string;
  title: string;
  url: string;
  contentType: string;
  sourceId: string | null;
  sourceName: string;
  publishedAt: Date;
  ingestedAt: Date;
  rawText: string;
  wordCount: number;
  metadata: unknown;
}): ContentItem {
  return {
    id: row.id,
    title: row.title,
    url: row.url,
    contentType: row.contentType as ContentItem["contentType"],
    sourceId: row.sourceId ?? "",
    sourceName: row.sourceName,
    publishedAt: row.publishedAt.toISOString(),
    ingestedAt: row.ingestedAt.toISOString(),
    rawText: row.rawText,
    wordCount: row.wordCount,
    metadata: (row.metadata ?? {}) as ContentItem["metadata"],
  };
}
