/**
 * Article / Web Content Scraper
 *
 * Extracts article text from news sites, blogs, and other web content.
 * Uses readability-style extraction to pull the main content.
 */

import type { ContentItem } from "../models/types";

// ─── Types ──────────────────────────────────────────────────────────

export interface ScrapedArticle {
  title: string;
  author: string | null;
  publishedDate: string | null;
  content: string;
  excerpt: string;
  siteName: string | null;
  url: string;
}

// ─── HTML Text Extraction ───────────────────────────────────────────

/**
 * Basic HTML-to-text extraction.
 * For production, use a library like @mozilla/readability + jsdom.
 */
export function extractTextFromHtml(html: string): string {
  // Remove script and style elements
  let text = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "");
  text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "");
  text = text.replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, "");
  text = text.replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, "");
  text = text.replace(/<header[^>]*>[\s\S]*?<\/header>/gi, "");

  // Convert block elements to newlines
  text = text.replace(/<\/(p|div|h[1-6]|li|blockquote|br\s*\/?)>/gi, "\n");

  // Strip remaining HTML tags
  text = text.replace(/<[^>]+>/g, "");

  // Decode HTML entities
  text = text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");

  // Clean up whitespace
  text = text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .join("\n");

  return text;
}

/**
 * Extract metadata from HTML meta tags
 */
export function extractMetadata(html: string): Partial<ScrapedArticle> {
  const getMetaContent = (name: string): string | null => {
    const patterns = [
      new RegExp(`<meta[^>]*(?:name|property)=["']${name}["'][^>]*content=["']([^"']*)["']`, "i"),
      new RegExp(`<meta[^>]*content=["']([^"']*)["'][^>]*(?:name|property)=["']${name}["']`, "i"),
    ];
    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match) return match[1];
    }
    return null;
  };

  const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);

  return {
    title:
      getMetaContent("og:title") ||
      getMetaContent("twitter:title") ||
      titleMatch?.[1] ||
      "",
    author:
      getMetaContent("author") ||
      getMetaContent("article:author") ||
      null,
    publishedDate:
      getMetaContent("article:published_time") ||
      getMetaContent("date") ||
      null,
    siteName: getMetaContent("og:site_name") || null,
    excerpt:
      getMetaContent("og:description") ||
      getMetaContent("description") ||
      "",
  };
}

// ─── Article Fetching ───────────────────────────────────────────────

/**
 * Fetches and extracts an article from a URL
 */
export async function scrapeArticle(url: string): Promise<ScrapedArticle> {
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; BiasAnalyzer/1.0; +https://github.com/SophistryDude/bias-analyzer)",
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch article: ${res.status} ${res.statusText}`);
  }

  const html = await res.text();
  const metadata = extractMetadata(html);
  const content = extractTextFromHtml(html);

  return {
    title: metadata.title || url,
    author: metadata.author || null,
    publishedDate: metadata.publishedDate || null,
    content,
    excerpt: metadata.excerpt || content.slice(0, 200),
    siteName: metadata.siteName || new URL(url).hostname,
    url,
  };
}

/**
 * Ingests an article into a ContentItem
 */
export async function ingestArticle(
  url: string,
  sourceId: string,
  sourceName: string
): Promise<ContentItem> {
  const article = await scrapeArticle(url);

  return {
    id: `article-${Date.now()}`,
    title: article.title,
    url,
    contentType: "article",
    sourceId,
    sourceName,
    publishedAt: article.publishedDate || new Date().toISOString(),
    ingestedAt: new Date().toISOString(),
    rawText: article.content,
    wordCount: article.content.split(/\s+/).length,
    metadata: {
      author: article.author || undefined,
      publication: article.siteName || undefined,
    },
  };
}
