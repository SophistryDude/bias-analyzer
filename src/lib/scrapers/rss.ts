/**
 * RSS/Atom Feed Monitor
 *
 * Fetches and parses RSS/Atom feeds from news sites.
 * Returns new items since the last check.
 */

import Parser from "rss-parser";

const parser = new Parser({
  timeout: 15000,
  headers: {
    "User-Agent":
      "Mozilla/5.0 (compatible; MediaSentinel/1.0; +https://github.com/SophistryDude/mediasentinel)",
  },
});

export interface FeedItem {
  id: string;
  title: string;
  url: string;
  publishedAt: string;
  author: string | null;
  summary: string | null;
}

/**
 * Fetch items from an RSS/Atom feed.
 * Returns all items from the feed, sorted by date (newest first).
 */
export async function fetchFeedItems(
  feedUrl: string,
  maxItems: number = 20
): Promise<FeedItem[]> {
  const feed = await parser.parseURL(feedUrl);

  const items: FeedItem[] = (feed.items || [])
    .slice(0, maxItems)
    .map((item) => ({
      id: item.guid || item.link || item.title || "",
      title: item.title || "Untitled",
      url: item.link || "",
      publishedAt: item.isoDate || item.pubDate || new Date().toISOString(),
      author: item.creator || item["dc:creator"] || null,
      summary: item.contentSnippet || item.content || null,
    }))
    .filter((item) => item.url);

  // Sort newest first
  items.sort(
    (a, b) =>
      new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  );

  return items;
}

/**
 * Fetch only items published after a given date.
 * Used for incremental ingestion.
 */
export async function fetchNewFeedItems(
  feedUrl: string,
  since: Date
): Promise<FeedItem[]> {
  const items = await fetchFeedItems(feedUrl);
  return items.filter(
    (item) => new Date(item.publishedAt).getTime() > since.getTime()
  );
}
