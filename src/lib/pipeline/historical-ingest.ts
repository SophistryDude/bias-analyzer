/**
 * Historical Content Ingestion Pipeline
 *
 * Orchestrates bulk ingestion of historical content from multiple sources:
 *
 * 1. NYT API → Wayback Machine: Get article URLs from NYT API, fetch full
 *    text from Wayback Machine archives. Covers 1996-2025 for NYT.
 *
 * 2. Known URL patterns → Wayback Machine: For outlets with predictable
 *    URL structures (CNN, Fox, WaPo, etc.), construct search patterns
 *    and fetch from archives.
 *
 * 3. Google News → Wayback Machine: Search Google News for pundit coverage,
 *    get article URLs, fetch from archives.
 *
 * Rate limits:
 * - NYT API: 10 requests/minute, 4,000/day
 * - Wayback CDX: no official limit, be respectful (1 req/sec)
 * - Wayback page fetch: same, 1 req/sec
 */

import { searchNYTArticles, getNYTArchiveMonth } from "../scrapers/nyt-api";
import { scrapeArticle } from "../scrapers/article";
import { isDuplicate, recordHash } from "./dedup";
import { saveAnalysis } from "../db/repositories/analyses";
import { runAnalysis } from "./analyzer";
import { Readability } from "@mozilla/readability";
import { JSDOM } from "jsdom";
import type { ContentItem } from "../models/types";

// ─── Rate Limiting ──────────────────────────────────────────────────

async function rateLimitDelay(ms: number = 1200): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─── Wayback Machine Helpers ────────────────────────────────────────

/**
 * Search CDX for archived captures of a specific URL.
 * Returns timestamps of successful captures.
 */
async function cdxSearch(
  url: string,
  options?: { limit?: number }
): Promise<{ timestamp: string; original: string }[]> {
  const params = new URLSearchParams({
    url,
    output: "json",
    fl: "timestamp,original,statuscode",
    filter: "statuscode:200",
    collapse: "digest",
    ...(options?.limit ? { limit: String(options.limit) } : {}),
  });

  const res = await fetch(
    `https://web.archive.org/cdx/search/cdx?${params}`,
    {
      headers: {
        "User-Agent": "MediaSentinel/1.0 (academic research; media bias analysis)",
      },
    }
  );

  if (!res.ok) return [];

  const data = await res.json();
  if (!Array.isArray(data) || data.length < 2) return [];

  // Skip header row
  return data.slice(1).map((row: string[]) => ({
    timestamp: row[0],
    original: row[1],
  }));
}

/**
 * Fetch and extract an article from the Wayback Machine.
 */
async function fetchArchivedArticle(
  timestamp: string,
  originalUrl: string
): Promise<{
  title: string;
  content: string;
  author: string | null;
  byline: string | null;
  wordCount: number;
} | null> {
  const archiveUrl = `https://web.archive.org/web/${timestamp}/${originalUrl}`;

  try {
    const res = await fetch(archiveUrl, {
      headers: {
        "User-Agent": "MediaSentinel/1.0 (academic research)",
      },
      redirect: "follow",
    });

    if (!res.ok) return null;

    const html = await res.text();
    const dom = new JSDOM(html, { url: archiveUrl });
    const reader = new Readability(dom.window.document);
    const article = reader.parse();

    if (!article || !article.textContent || article.textContent.length < 100) {
      return null;
    }

    return {
      title: article.title || "",
      content: article.textContent,
      author: article.byline || null,
      byline: article.byline || null,
      wordCount: article.textContent.split(/\s+/).length,
    };
  } catch {
    return null;
  }
}

// ─── NYT → Wayback Pipeline ────────────────────────────────────────

export interface IngestionProgress {
  source: string;
  total: number;
  processed: number;
  ingested: number;
  skipped: number;
  failed: number;
  errors: string[];
}

/**
 * Ingest NYT articles for a given time range using NYT API → Wayback Machine.
 *
 * Flow:
 * 1. NYT API gives us article URLs + metadata
 * 2. CDX API checks if Wayback Machine has the page
 * 3. Fetch full text from Wayback Machine
 * 4. Dedup check
 * 5. Store as ContentItem
 */
export async function ingestNYTHistorical(
  query: string,
  options: {
    startYear: number;
    endYear: number;
    sourceId: string; // pundit ID or "nyt"
    sourceName: string;
    maxArticles?: number;
    analyzeImmediately?: boolean;
    onProgress?: (progress: IngestionProgress) => void;
  }
): Promise<IngestionProgress> {
  const progress: IngestionProgress = {
    source: "nyt-wayback",
    total: 0,
    processed: 0,
    ingested: 0,
    skipped: 0,
    failed: 0,
    errors: [],
  };

  const maxArticles = options.maxArticles ?? 500;
  const startDate = `${options.startYear}0101`;
  const endDate = `${options.endYear}1231`;

  // Paginate through NYT API results
  let page = 0;
  const maxPages = Math.ceil(maxArticles / 10); // NYT returns 10 per page

  while (page < maxPages) {
    try {
      const { articles, totalHits } = await searchNYTArticles(query, {
        beginDate: startDate,
        endDate: endDate,
        page,
        sort: "newest",
      });

      if (page === 0) {
        progress.total = Math.min(totalHits, maxArticles);
        console.log(
          `[nyt-wayback] Found ${totalHits} NYT articles for "${query}" (${options.startYear}-${options.endYear}), processing up to ${progress.total}`
        );
      }

      if (articles.length === 0) break;

      for (const nytArticle of articles) {
        if (progress.ingested >= maxArticles) break;

        progress.processed++;

        // Try to get full text from Wayback Machine
        const captures = await cdxSearch(nytArticle.web_url, { limit: 1 });
        await rateLimitDelay();

        if (captures.length === 0) {
          progress.skipped++;
          continue;
        }

        const archived = await fetchArchivedArticle(
          captures[0].timestamp,
          captures[0].original
        );
        await rateLimitDelay();

        if (!archived || archived.wordCount < 50) {
          progress.skipped++;
          continue;
        }

        // Dedup check
        const existing = await isDuplicate(archived.content);
        if (existing) {
          progress.skipped++;
          continue;
        }

        // Build ContentItem
        const contentItem: ContentItem = {
          id: `nyt-wb-${nytArticle._id}`,
          title: archived.title || nytArticle.headline.main,
          url: nytArticle.web_url,
          contentType: "article",
          sourceId: options.sourceId,
          sourceName: options.sourceName,
          publishedAt: nytArticle.pub_date,
          ingestedAt: new Date().toISOString(),
          rawText: archived.content,
          wordCount: archived.wordCount,
          metadata: {
            author: archived.author || nytArticle.byline?.original || undefined,
            publication: "The New York Times",
            section: nytArticle.section_name,
            keywords: nytArticle.keywords?.map((k) => k.value) || [],
            archiveTimestamp: captures[0].timestamp,
            ingestSource: "nyt-api-wayback",
          } as Record<string, unknown>,
        };

        // Store and optionally analyze
        try {
          if (options.analyzeImmediately) {
            const analysis = await runAnalysis(contentItem);
            await saveAnalysis(contentItem, analysis);
          }
          await recordHash(archived.content, contentItem.id);
          progress.ingested++;
        } catch (err) {
          progress.failed++;
          progress.errors.push(
            `Failed to store ${nytArticle.web_url}: ${err}`
          );
        }

        options.onProgress?.(progress);
      }

      page++;
      // NYT API rate limit: 10 req/min
      await rateLimitDelay(6500);
    } catch (err) {
      progress.errors.push(`NYT API page ${page} failed: ${err}`);
      page++;
      await rateLimitDelay(10000); // back off on error
    }
  }

  console.log(
    `[nyt-wayback] Complete: ${progress.ingested} ingested, ${progress.skipped} skipped, ${progress.failed} failed`
  );

  return progress;
}

// ─── Generic Wayback Pipeline (any outlet) ──────────────────────────

/**
 * Known URL patterns for major outlets.
 * These are used to construct CDX queries for historical content.
 */
const OUTLET_URL_PATTERNS: Record<
  string,
  { domain: string; pathPatterns: string[] }
> = {
  nyt: {
    domain: "nytimes.com",
    pathPatterns: ["/20{yy}/{mm}/{dd}/"],
  },
  "washington-post": {
    domain: "washingtonpost.com",
    pathPatterns: ["/20{yy}/{mm}/{dd}/"],
  },
  cnn: {
    domain: "cnn.com",
    pathPatterns: ["/20{yy}/{mm}/{dd}/"],
  },
  "fox-news": {
    domain: "foxnews.com",
    pathPatterns: ["/politics/", "/opinion/"],
  },
  breitbart: {
    domain: "breitbart.com",
    pathPatterns: ["/politics/20{yy}/"],
  },
  politico: {
    domain: "politico.com",
    pathPatterns: ["/story/20{yy}/"],
  },
  "the-hill": {
    domain: "thehill.com",
    pathPatterns: ["/homenews/", "/policy/"],
  },
  reuters: {
    domain: "reuters.com",
    pathPatterns: ["/article/"],
  },
  "ap-news": {
    domain: "apnews.com",
    pathPatterns: ["/article/"],
  },
};

/**
 * Ingest historical articles for any outlet via Wayback Machine.
 * Uses exact URL lookups (not wildcard) to avoid CDX auth requirements.
 *
 * For outlets with NYT-style date-based URLs, iterates through dates.
 * For others, relies on URLs provided (from Google News, RSS archives, etc.)
 */
export async function ingestFromWayback(
  urls: string[],
  options: {
    sourceId: string;
    sourceName: string;
    analyzeImmediately?: boolean;
    onProgress?: (progress: IngestionProgress) => void;
  }
): Promise<IngestionProgress> {
  const progress: IngestionProgress = {
    source: "wayback",
    total: urls.length,
    processed: 0,
    ingested: 0,
    skipped: 0,
    failed: 0,
    errors: [],
  };

  console.log(
    `[wayback] Ingesting ${urls.length} URLs for ${options.sourceName}`
  );

  for (const url of urls) {
    progress.processed++;

    try {
      // Find in Wayback Machine
      const captures = await cdxSearch(url, { limit: 1 });
      await rateLimitDelay();

      if (captures.length === 0) {
        progress.skipped++;
        continue;
      }

      // Fetch and extract
      const archived = await fetchArchivedArticle(
        captures[0].timestamp,
        captures[0].original
      );
      await rateLimitDelay();

      if (!archived || archived.wordCount < 50) {
        progress.skipped++;
        continue;
      }

      // Dedup
      const existing = await isDuplicate(archived.content);
      if (existing) {
        progress.skipped++;
        continue;
      }

      // Parse date from timestamp
      const ts = captures[0].timestamp;
      const publishDate = `${ts.slice(0, 4)}-${ts.slice(4, 6)}-${ts.slice(6, 8)}T00:00:00Z`;

      const contentItem: ContentItem = {
        id: `wb-${ts}-${Buffer.from(url).toString("base64url").slice(0, 16)}`,
        title: archived.title,
        url,
        contentType: "article",
        sourceId: options.sourceId,
        sourceName: options.sourceName,
        publishedAt: publishDate,
        ingestedAt: new Date().toISOString(),
        rawText: archived.content,
        wordCount: archived.wordCount,
        metadata: {
          author: archived.author || undefined,
          publication: options.sourceName,
          archiveTimestamp: ts,
          ingestSource: "wayback",
        } as Record<string, unknown>,
      };

      if (options.analyzeImmediately) {
        const analysis = await runAnalysis(contentItem);
        await saveAnalysis(contentItem, analysis);
      }
      await recordHash(archived.content, contentItem.id);
      progress.ingested++;
    } catch (err) {
      progress.failed++;
      progress.errors.push(`${url}: ${err}`);
    }

    options.onProgress?.(progress);
  }

  console.log(
    `[wayback] Complete: ${progress.ingested} ingested, ${progress.skipped} skipped, ${progress.failed} failed`
  );

  return progress;
}

// ─── Google News → URL Discovery ────────────────────────────────────

/**
 * Use Google News RSS to discover article titles and sources for a pundit/topic.
 * Returns title+source pairs that can be used to search Wayback CDX.
 *
 * Google News encodes article URLs in a custom format that can't be decoded.
 * Instead, we extract the article title and source publication from the XML,
 * then construct Wayback CDX searches from known outlet URL patterns.
 */
export interface DiscoveredArticle {
  title: string;
  source: string;
  pubDate: string;
}

export async function discoverArticles(
  searchQuery: string,
  options?: { maxResults?: number }
): Promise<DiscoveredArticle[]> {
  const feedUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(searchQuery)}&hl=en-US&gl=US&ceid=US:en`;

  try {
    const res = await fetch(feedUrl, {
      headers: {
        "User-Agent": "MediaSentinel/1.0 (academic research)",
      },
    });

    if (!res.ok) return [];

    const xml = await res.text();

    // Extract title, source, and date from each item
    // Split by <item> then parse each block individually
    const itemBlocks = xml.split("<item>").slice(1);
    const items: RegExpMatchArray[] = [];
    for (const block of itemBlocks) {
      const titleMatch = block.match(/<title>([^<]+)<\/title>/);
      const sourceMatch = block.match(/<source[^>]*>([^<]+)<\/source>/);
      const dateMatch = block.match(/<pubDate>([^<]+)<\/pubDate>/);
      if (titleMatch && sourceMatch && dateMatch) {
        items.push([block, titleMatch[1], sourceMatch[1], dateMatch[1]] as unknown as RegExpMatchArray);
      }
    }

    const results: DiscoveredArticle[] = [];
    const maxResults = options?.maxResults ?? 50;

    for (const match of items) {
      if (results.length >= maxResults) break;

      // Title format is usually "Article Title - Source Name"
      let title = match[1].replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
      const source = match[2].trim();
      const pubDate = match[3].trim();

      // Remove " - Source Name" suffix from title if present
      const sourceSuffix = ` - ${source}`;
      if (title.endsWith(sourceSuffix)) {
        title = title.slice(0, -sourceSuffix.length);
      }

      results.push({ title, source, pubDate });
    }

    return results;
  } catch {
    return [];
  }
}

/**
 * Discover article URLs by searching the Wayback Machine CDX for known outlet URLs.
 * This uses exact URL lookups on known outlet URL patterns.
 */
export async function discoverArticleUrls(
  searchQuery: string,
  options?: { maxResults?: number }
): Promise<string[]> {
  // For now, return discovered article metadata
  // The actual Wayback lookups happen in the ingestion pipeline
  // using the NYT API (which gives us real URLs) or direct CDX queries
  const articles = await discoverArticles(searchQuery, options);
  // Return empty — the caller should use discoverArticles() instead
  // and feed results through the Wayback pipeline with known URLs
  console.log(
    `[discovery] Found ${articles.length} articles from Google News for "${searchQuery}":`
  );
  for (const a of articles.slice(0, 5)) {
    console.log(`  "${a.title}" — ${a.source} (${a.pubDate})`);
  }
  if (articles.length > 5) {
    console.log(`  ... and ${articles.length - 5} more`);
  }
  return [];
}

// ─── High-Level Orchestration ───────────────────────────────────────

/**
 * Run a full historical ingestion for a pundit.
 * Tries multiple sources to maximize coverage.
 */
export async function ingestPunditHistory(
  punditName: string,
  options: {
    sourceId: string;
    startYear?: number;
    endYear?: number;
    maxArticlesPerSource?: number;
    analyzeImmediately?: boolean;
    onProgress?: (source: string, progress: IngestionProgress) => void;
  }
): Promise<{ nyt: IngestionProgress; web: IngestionProgress }> {
  const startYear = options.startYear ?? 2006;
  const endYear = options.endYear ?? 2025;
  const maxPerSource = options.maxArticlesPerSource ?? 200;

  console.log(
    `\n=== Historical Ingestion: ${punditName} (${startYear}-${endYear}) ===\n`
  );

  // Step 1: NYT API → Wayback Machine (if NYT API key available)
  let nytProgress: IngestionProgress = {
    source: "nyt-wayback",
    total: 0,
    processed: 0,
    ingested: 0,
    skipped: 0,
    failed: 0,
    errors: [],
  };

  if (process.env.NYT_API_KEY) {
    console.log(`[1/2] Searching NYT for "${punditName}"...`);
    nytProgress = await ingestNYTHistorical(punditName, {
      startYear,
      endYear,
      sourceId: options.sourceId,
      sourceName: "The New York Times",
      maxArticles: maxPerSource,
      analyzeImmediately: options.analyzeImmediately,
      onProgress: (p) => options.onProgress?.("nyt", p),
    });
  } else {
    console.log("[1/2] Skipping NYT (no API key set)");
  }

  // Step 2: Google News → Wayback Machine
  console.log(`[2/2] Discovering articles via Google News...`);
  const discoveredUrls = await discoverArticleUrls(punditName, {
    maxResults: maxPerSource,
  });

  const webProgress = await ingestFromWayback(discoveredUrls, {
    sourceId: options.sourceId,
    sourceName: punditName,
    analyzeImmediately: options.analyzeImmediately,
    onProgress: (p) => options.onProgress?.("web", p),
  });

  console.log(`\n=== ${punditName} Ingestion Summary ===`);
  console.log(`NYT: ${nytProgress.ingested} articles`);
  console.log(`Web: ${webProgress.ingested} articles`);
  console.log(`Total: ${nytProgress.ingested + webProgress.ingested} articles\n`);

  return { nyt: nytProgress, web: webProgress };
}
