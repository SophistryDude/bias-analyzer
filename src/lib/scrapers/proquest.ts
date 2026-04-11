/**
 * ProQuest Integration
 *
 * Accesses ProQuest databases through academic library credentials.
 * ProQuest has full-text archives of NYT, WaPo, WSJ, and ~2,000 other
 * news sources going back to the 1980s.
 *
 * Two integration paths:
 *
 * 1. TDM Studio (preferred) — ProQuest's text and data mining workbench.
 *    Python/R notebooks with full-text corpus access. Best for bulk analysis.
 *    Check WGU library → ProQuest → TDM Studio.
 *
 * 2. ProQuest Search API — programmatic search and retrieval.
 *    Requires API credentials from library/ProQuest.
 *    Set PROQUEST_API_KEY and PROQUEST_BASE_URL in .env.local
 *
 * For now: this module provides the typed interface and search functions.
 * Authentication will be configured once API access is obtained.
 *
 * Getting API access:
 * - Contact WGU Library and ask about ProQuest API/TDM Studio access
 * - Or contact ProQuest directly: https://apidocs-dialog.proquest.com/
 * - Academic institutions often have this bundled in their subscription
 */

import type { ContentItem } from "../models/types";

// ─── Types ──────────────────────────────────────────────────────────

export interface ProQuestArticle {
  id: string;
  title: string;
  abstract: string;
  fullText?: string; // only available with full-text access
  author: string | null;
  publicationTitle: string;
  publishDate: string;
  url: string;
  sourceType: string; // "Newspapers", "Wire Feeds", "Magazines", etc.
  documentType: string; // "News", "Editorial", "Feature", etc.
  subjectTerms: string[];
  wordCount: number;
}

export interface ProQuestSearchOptions {
  query: string;
  author?: string;
  publication?: string;
  dateFrom?: string; // YYYY-MM-DD
  dateTo?: string;
  sourceType?: "newspapers" | "wire-feeds" | "magazines" | "all";
  limit?: number;
  offset?: number;
}

// ─── API Client ─────────────────────────────────────────────────────

/**
 * Search ProQuest for articles matching the given criteria.
 *
 * Requires PROQUEST_API_KEY and PROQUEST_BASE_URL in environment.
 * These will be provided by WGU library or ProQuest directly.
 */
export async function searchProQuest(
  options: ProQuestSearchOptions
): Promise<{ articles: ProQuestArticle[]; totalHits: number }> {
  const apiKey = process.env.PROQUEST_API_KEY;
  const baseUrl = process.env.PROQUEST_BASE_URL;

  if (!apiKey || !baseUrl) {
    throw new Error(
      "ProQuest API not configured. Set PROQUEST_API_KEY and PROQUEST_BASE_URL in .env.local.\n" +
        "To get access: contact WGU Library about ProQuest API/TDM Studio access."
    );
  }

  // Build ProQuest search query
  let queryParts: string[] = [options.query];
  if (options.author) {
    queryParts.push(`AU(${options.author})`);
  }
  if (options.publication) {
    queryParts.push(`PUB(${options.publication})`);
  }

  const params = new URLSearchParams({
    q: queryParts.join(" AND "),
    ...(options.dateFrom ? { startDate: options.dateFrom } : {}),
    ...(options.dateTo ? { endDate: options.dateTo } : {}),
    ...(options.limit ? { count: String(options.limit) } : {}),
    ...(options.offset ? { offset: String(options.offset) } : {}),
  });

  const res = await fetch(`${baseUrl}/search?${params}`, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    throw new Error(`ProQuest API error: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();
  return {
    articles: (data.documents || []).map(mapProQuestArticle),
    totalHits: data.totalCount || 0,
  };
}

/**
 * Search for all articles by a specific author.
 */
export async function searchProQuestByAuthor(
  authorName: string,
  options?: { dateFrom?: string; dateTo?: string; publication?: string; limit?: number }
): Promise<{ articles: ProQuestArticle[]; totalHits: number }> {
  return searchProQuest({
    query: "*",
    author: authorName,
    ...options,
  });
}

/**
 * Search for articles about a specific topic in a specific publication.
 */
export async function searchProQuestByPublication(
  publication: string,
  topic: string,
  options?: { dateFrom?: string; dateTo?: string; limit?: number }
): Promise<{ articles: ProQuestArticle[]; totalHits: number }> {
  return searchProQuest({
    query: topic,
    publication,
    ...options,
  });
}

/**
 * Convert a ProQuest article to a ContentItem.
 */
export function proQuestToContentItem(
  article: ProQuestArticle,
  sourceId: string,
  sourceName: string
): ContentItem {
  const text = article.fullText || article.abstract || article.title;

  return {
    id: `proquest-${article.id}`,
    title: article.title,
    url: article.url,
    contentType: "article",
    sourceId,
    sourceName,
    publishedAt: article.publishDate,
    ingestedAt: new Date().toISOString(),
    rawText: text,
    wordCount: article.wordCount || text.split(/\s+/).length,
    metadata: {
      author: article.author || undefined,
      publication: article.publicationTitle,
      sourceType: article.sourceType,
      documentType: article.documentType,
      subjectTerms: article.subjectTerms,
      proQuestId: article.id,
      hasFullText: !!article.fullText,
    } as Record<string, unknown>,
  };
}

// ─── Helpers ────────────────────────────────────────────────────────

function mapProQuestArticle(doc: Record<string, unknown>): ProQuestArticle {
  return {
    id: String(doc.id || doc.documentId || ""),
    title: String(doc.title || ""),
    abstract: String(doc.abstract || ""),
    fullText: doc.fullText ? String(doc.fullText) : undefined,
    author: doc.author ? String(doc.author) : null,
    publicationTitle: String(doc.publicationTitle || doc.publication || ""),
    publishDate: String(doc.publishDate || doc.date || ""),
    url: String(doc.url || doc.documentUrl || ""),
    sourceType: String(doc.sourceType || ""),
    documentType: String(doc.documentType || ""),
    subjectTerms: Array.isArray(doc.subjectTerms)
      ? doc.subjectTerms.map(String)
      : [],
    wordCount: Number(doc.wordCount || 0),
  };
}
