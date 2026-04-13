/**
 * Article / Web Content Scraper
 *
 * Extracts article text from news sites, blogs, and other web content.
 * Uses @mozilla/readability + jsdom for accurate content extraction.
 */

import { Readability } from "@mozilla/readability";
import { JSDOM } from "jsdom";
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

// ─── Metadata Extraction ────────────────────────────────────────────

/**
 * Extract metadata from HTML meta tags using jsdom
 */
function extractMetadata(
  doc: Document,
  url: string
): Partial<ScrapedArticle> {
  const getMeta = (name: string): string | null => {
    const el =
      doc.querySelector(`meta[property="${name}"]`) ||
      doc.querySelector(`meta[name="${name}"]`);
    return el?.getAttribute("content") || null;
  };

  return {
    title:
      getMeta("og:title") ||
      getMeta("twitter:title") ||
      doc.querySelector("title")?.textContent ||
      "",
    author: getMeta("author") || getMeta("article:author") || null,
    publishedDate:
      getMeta("article:published_time") || getMeta("date") || null,
    siteName: getMeta("og:site_name") || new URL(url).hostname,
    excerpt: getMeta("og:description") || getMeta("description") || "",
  };
}

// ─── Article Fetching ───────────────────────────────────────────────

/**
 * Fetches and extracts an article from a URL using Readability
 */
export async function scrapeArticle(url: string): Promise<ScrapedArticle> {
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; MediaSentinel/1.0; +https://github.com/SophistryDude/mediasentinel)",
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch article: ${res.status} ${res.statusText}`);
  }

  const html = await res.text();
  const dom = new JSDOM(html, { url });
  const metadata = extractMetadata(dom.window.document, url);

  // Use Readability for content extraction
  const reader = new Readability(dom.window.document);
  const article = reader.parse();

  const content = article?.textContent || "";
  const title = article?.title || metadata.title || url;
  const excerpt = article?.excerpt || metadata.excerpt || content.slice(0, 200);

  return {
    title,
    author: metadata.author || null,
    publishedDate: metadata.publishedDate || null,
    content,
    excerpt,
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
