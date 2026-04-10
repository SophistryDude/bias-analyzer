/**
 * Content Ingestion Scheduler
 *
 * Runs on a cron schedule, checks all monitored sources for new content,
 * and enqueues new items for analysis.
 *
 * Source types:
 * - youtube-channel: fetches recent videos, ingests transcripts
 * - rss: fetches feed items, scrapes article content
 * - website: direct URL scraping (future)
 */

import * as cron from "node-cron";
import { getSourcesDueForCheck, markSourceChecked } from "../db/repositories/sources";
import { fetchChannelVideos } from "../scrapers/youtube-channel";
import { fetchTranscript, transcriptToText, fetchVideoInfo } from "../scrapers/youtube";
import { fetchNewFeedItems } from "../scrapers/rss";
import { scrapeArticle } from "../scrapers/article";
import { isDuplicate } from "./dedup";
import { enqueueAnalysis } from "./queue";
import type { ContentItem } from "../models/types";

let schedulerTask: ReturnType<typeof cron.schedule> | null = null;

/**
 * Start the ingestion scheduler.
 * Checks for due sources every 5 minutes.
 */
export function startScheduler(cronExpression: string = "*/5 * * * *"): void {
  if (schedulerTask) {
    console.log("[scheduler] Already running");
    return;
  }

  console.log(`[scheduler] Starting with schedule: ${cronExpression}`);

  schedulerTask = cron.schedule(cronExpression, async () => {
    try {
      await checkSources();
    } catch (err) {
      console.error("[scheduler] Error during source check:", err);
    }
  });

  // Run immediately on start
  checkSources().catch((err) =>
    console.error("[scheduler] Initial check failed:", err)
  );
}

/**
 * Stop the scheduler.
 */
export function stopScheduler(): void {
  if (schedulerTask) {
    schedulerTask.stop();
    schedulerTask = null;
    console.log("[scheduler] Stopped");
  }
}

/**
 * Check all sources that are due for a scrape.
 */
async function checkSources(): Promise<void> {
  const sources = await getSourcesDueForCheck();
  if (sources.length === 0) return;

  console.log(`[scheduler] Checking ${sources.length} source(s)...`);

  for (const source of sources) {
    try {
      let newItems = 0;

      switch (source.type) {
        case "youtube-channel":
          newItems = await ingestYouTubeChannel(source);
          break;
        case "rss":
          newItems = await ingestRSSFeed(source);
          break;
        case "website":
          console.log(`[scheduler] Website scraping not yet implemented for: ${source.name}`);
          break;
      }

      await markSourceChecked(source.id);
      if (newItems > 0) {
        console.log(`[scheduler] ${source.name}: ${newItems} new item(s) enqueued`);
      }
    } catch (err) {
      console.error(`[scheduler] Failed to check ${source.name}:`, err);
      // Mark as checked anyway to avoid hammering a broken source
      await markSourceChecked(source.id);
    }
  }
}

/**
 * Ingest new videos from a YouTube channel.
 */
async function ingestYouTubeChannel(source: {
  id: string;
  punditId: string | null;
  name: string;
  url: string;
  lastContentId: string | null;
}): Promise<number> {
  const videos = await fetchChannelVideos(source.url, 5);
  let ingested = 0;

  for (const video of videos) {
    const contentId = `yt-${video.videoId}`;

    // Skip if we've already seen this video
    if (source.lastContentId && contentId <= source.lastContentId) continue;

    // Fetch transcript
    let rawText: string;
    try {
      const segments = await fetchTranscript(video.videoId);
      rawText = transcriptToText(segments);
    } catch {
      console.log(`[scheduler] No transcript for ${video.videoId}, skipping`);
      continue;
    }

    // Check for duplicates
    const existing = await isDuplicate(rawText);
    if (existing) continue;

    // Build content item
    const contentItem: ContentItem = {
      id: contentId,
      title: video.title,
      url: `https://www.youtube.com/watch?v=${video.videoId}`,
      contentType: "youtube-video",
      sourceId: source.punditId || "",
      sourceName: source.name,
      publishedAt: video.publishedAt,
      ingestedAt: new Date().toISOString(),
      rawText,
      wordCount: rawText.split(/\s+/).length,
      metadata: {
        youtubeVideoId: video.videoId,
        thumbnailUrl: video.thumbnailUrl,
      },
    };

    // Try to get full metadata
    try {
      const info = await fetchVideoInfo(video.videoId);
      contentItem.metadata = {
        ...contentItem.metadata,
        duration: info.duration,
        viewCount: info.viewCount,
        likeCount: info.likeCount,
        tags: info.tags,
      };
    } catch {
      // API key might not be available — continue without full metadata
    }

    await enqueueAnalysis(contentItem);
    ingested++;
  }

  return ingested;
}

/**
 * Ingest new articles from an RSS feed.
 */
async function ingestRSSFeed(source: {
  id: string;
  punditId: string | null;
  name: string;
  url: string;
  lastCheckedAt: string | null;
}): Promise<number> {
  const since = source.lastCheckedAt
    ? new Date(source.lastCheckedAt)
    : new Date(Date.now() - 24 * 60 * 60 * 1000); // default: last 24 hours

  const items = await fetchNewFeedItems(source.url, since);
  let ingested = 0;

  for (const item of items) {
    // Scrape the full article
    let article;
    try {
      article = await scrapeArticle(item.url);
    } catch {
      console.log(`[scheduler] Failed to scrape ${item.url}, skipping`);
      continue;
    }

    if (!article.content.trim()) continue;

    // Check for duplicates
    const existing = await isDuplicate(article.content);
    if (existing) continue;

    const contentItem: ContentItem = {
      id: `article-${Date.now()}-${ingested}`,
      title: item.title,
      url: item.url,
      contentType: "article",
      sourceId: source.punditId || "",
      sourceName: source.name,
      publishedAt: item.publishedAt,
      ingestedAt: new Date().toISOString(),
      rawText: article.content,
      wordCount: article.content.split(/\s+/).length,
      metadata: {
        author: item.author || article.author || undefined,
        publication: article.siteName || undefined,
      },
    };

    await enqueueAnalysis(contentItem);
    ingested++;
  }

  return ingested;
}
