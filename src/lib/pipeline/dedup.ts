/**
 * Content Deduplication
 *
 * Uses SHA-256 hashing of content text to avoid re-ingesting
 * and re-analyzing identical content.
 */

import { createHash } from "crypto";
import { db } from "../db/client";
import { contentHashes } from "../db/schema";
import { eq } from "drizzle-orm";

/**
 * Generate a content hash from text.
 * Normalizes whitespace before hashing so minor formatting
 * differences don't create false negatives.
 */
export function hashContent(text: string): string {
  const normalized = text.replace(/\s+/g, " ").trim().toLowerCase();
  return createHash("sha256").update(normalized).digest("hex");
}

/**
 * Check if content has already been ingested.
 * Returns the existing content ID if found, null otherwise.
 */
export async function isDuplicate(text: string): Promise<string | null> {
  const hash = hashContent(text);

  try {
    const existing = await db.query.contentHashes.findFirst({
      where: eq(contentHashes.hash, hash),
    });
    return existing?.contentId ?? null;
  } catch {
    // DB not available — allow content through
    return null;
  }
}

/**
 * Record a content hash after successful ingestion.
 */
export async function recordHash(
  text: string,
  contentId: string
): Promise<void> {
  const hash = hashContent(text);

  try {
    await db
      .insert(contentHashes)
      .values({ hash, contentId })
      .onConflictDoNothing();
  } catch {
    // Non-critical — dedup is an optimization, not a requirement
    console.error("Failed to record content hash (continuing)");
  }
}
