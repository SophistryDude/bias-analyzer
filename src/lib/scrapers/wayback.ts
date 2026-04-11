/**
 * Wayback Machine Scraper
 *
 * Uses the Internet Archive CDX API to find archived versions of articles,
 * then fetches the archived content. This gives us access to paywalled
 * content that was captured before publishers blocked the crawler (pre-2025).
 *
 * Coverage: ~1996-2025 for major news outlets (NYT, WaPo, WSJ, etc.)
 * Gap: Late 2025-present (publishers blocked archive.org_bot)
 *
 * CDX API docs: https://archive.org/help/wayback_api.php
 */

import { scrapeArticle } from "./article";
import type { ContentItem } from "../models/types";

interface CDXResult {
  urlkey: string;
  timestamp: string; // YYYYMMDDHHmmss
  original: string;
  mimetype: string;
  statuscode: string;
  digest: string;
  length: string;
}

/**
 * Search the Wayback Machine CDX API for archived versions of a URL.
 * Returns timestamps of all captures, newest first.
 */
export async function searchArchive(
  url: string,
  options?: {
    from?: string; // YYYY or YYYYMMDDHHmmss
    to?: string;
    limit?: number;
    matchType?: "exact" | "prefix" | "host" | "domain";
  }
): Promise<CDXResult[]> {
  const params = new URLSearchParams({
    url,
    output: "json",
    fl: "urlkey,timestamp,original,mimetype,statuscode,digest,length",
    filter: "statuscode:200",
    collapse: "digest", // deduplicate identical captures
    ...(options?.from ? { from: options.from } : {}),
    ...(options?.to ? { to: options.to } : {}),
    ...(options?.limit ? { limit: String(options.limit) } : {}),
    ...(options?.matchType ? { matchType: options.matchType } : {}),
  });

  const res = await fetch(
    `https://web.archive.org/cdx/search/cdx?${params}`,
    {
      headers: {
        "User-Agent":
          "BiasAnalyzer/1.0 (academic research; media bias analysis)",
      },
    }
  );

  if (!res.ok) {
    throw new Error(`CDX API error: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();
  if (!Array.isArray(data) || data.length < 2) return [];

  // First row is headers, rest are results
  const headers = data[0] as string[];
  return data.slice(1).map((row: string[]) => {
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => {
      obj[h] = row[i];
    });
    return obj as unknown as CDXResult;
  });
}

/**
 * Build a Wayback Machine URL for an archived page.
 */
function buildArchiveUrl(timestamp: string, originalUrl: string): string {
  return `https://web.archive.org/web/${timestamp}/${originalUrl}`;
}

/**
 * Search for articles by a specific author or topic on a given domain.
 * Uses CDX prefix matching to find relevant URLs.
 */
export async function findArchivedArticles(
  domain: string,
  options?: {
    from?: string;
    to?: string;
    limit?: number;
  }
): Promise<CDXResult[]> {
  return searchArchive(`${domain}/*`, {
    ...options,
    matchType: "prefix",
    limit: options?.limit ?? 100,
  });
}

/**
 * Fetch and extract an archived article from the Wayback Machine.
 * Uses our readability-based article scraper on the archived version.
 */
export async function scrapeArchivedArticle(
  originalUrl: string,
  timestamp: string
): Promise<{
  title: string;
  content: string;
  author: string | null;
  publishedDate: string | null;
  archiveUrl: string;
  archiveTimestamp: string;
}> {
  const archiveUrl = buildArchiveUrl(timestamp, originalUrl);
  const article = await scrapeArticle(archiveUrl);

  // Parse timestamp to date: YYYYMMDDHHmmss
  const year = timestamp.slice(0, 4);
  const month = timestamp.slice(4, 6);
  const day = timestamp.slice(6, 8);
  const publishedDate =
    article.publishedDate || `${year}-${month}-${day}T00:00:00Z`;

  return {
    title: article.title,
    content: article.content,
    author: article.author,
    publishedDate,
    archiveUrl,
    archiveTimestamp: timestamp,
  };
}

/**
 * Ingest an archived article as a ContentItem.
 */
export async function ingestArchivedArticle(
  originalUrl: string,
  timestamp: string,
  sourceId: string,
  sourceName: string
): Promise<ContentItem> {
  const article = await scrapeArchivedArticle(originalUrl, timestamp);

  return {
    id: `wayback-${timestamp}-${Buffer.from(originalUrl).toString("base64url").slice(0, 20)}`,
    title: article.title,
    url: originalUrl,
    contentType: "article",
    sourceId,
    sourceName,
    publishedAt: article.publishedDate || new Date().toISOString(),
    ingestedAt: new Date().toISOString(),
    rawText: article.content,
    wordCount: article.content.split(/\s+/).length,
    metadata: {
      author: article.author || undefined,
      publication: sourceName,
      archiveUrl: article.archiveUrl,
      archiveTimestamp: article.archiveTimestamp,
    } as Record<string, unknown>,
  };
}

/**
 * Batch search: find all archived articles for a pundit across multiple domains.
 * Useful for building a historical content library.
 */
export async function findPunditArticles(
  punditName: string,
  domains: string[],
  options?: { from?: string; to?: string; limit?: number }
): Promise<
  { domain: string; results: CDXResult[] }[]
> {
  const allResults: { domain: string; results: CDXResult[] }[] = [];

  for (const domain of domains) {
    try {
      // Search for the pundit's name in URLs (works for author pages, bylines)
      const nameSlug = punditName.toLowerCase().replace(/\s+/g, "-");
      const nameSlugAlt = punditName.toLowerCase().replace(/\s+/g, "_");

      const results = await searchArchive(`${domain}/*${nameSlug}*`, {
        ...options,
        matchType: "prefix",
        limit: options?.limit ?? 50,
      });

      allResults.push({ domain, results });

      // Rate limit: 1 request per second to be respectful
      await new Promise((r) => setTimeout(r, 1000));
    } catch (err) {
      console.error(`[wayback] Failed to search ${domain} for ${punditName}:`, err);
      allResults.push({ domain, results: [] });
    }
  }

  return allResults;
}
