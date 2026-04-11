/**
 * NYT Article Search API Scraper
 *
 * Free API that returns article metadata (headlines, abstracts, bylines,
 * keywords, dates) going back to 1851. Full text is NOT available through
 * the API, but abstracts + headlines are enough for claim extraction
 * and framing analysis.
 *
 * Setup: Register at https://developer.nytimes.com/accounts/create
 * Create an app and enable Article Search + Archive APIs.
 * Set NYT_API_KEY in .env.local
 *
 * Rate limit: 10 requests/minute, 4,000 requests/day
 */

import type { ContentItem } from "../models/types";

interface NYTArticle {
  _id: string;
  headline: { main: string; kicker?: string; print_headline?: string };
  abstract: string;
  lead_paragraph: string;
  web_url: string;
  pub_date: string; // ISO date
  byline: { original: string; person: { firstname: string; lastname: string }[] };
  section_name: string;
  subsection_name?: string;
  source: string;
  word_count: number;
  keywords: { name: string; value: string; rank: number }[];
  document_type: string;
  news_desk: string;
  type_of_material: string;
  snippet: string;
}

interface NYTSearchResponse {
  status: string;
  response: {
    docs: NYTArticle[];
    meta: { hits: number; offset: number; time: number };
  };
}

interface NYTArchiveResponse {
  status: string;
  response: {
    docs: NYTArticle[];
  };
}

/**
 * Search NYT articles by query.
 * Returns metadata including headlines, abstracts, and lead paragraphs.
 */
export async function searchNYTArticles(
  query: string,
  options?: {
    beginDate?: string; // YYYYMMDD
    endDate?: string;
    page?: number; // 0-99 (100 results per page, max 1000 results)
    sort?: "newest" | "oldest" | "relevance";
    filterQuery?: string; // Lucene syntax filter
  }
): Promise<{ articles: NYTArticle[]; totalHits: number }> {
  const apiKey = process.env.NYT_API_KEY;
  if (!apiKey) {
    throw new Error("NYT_API_KEY environment variable is required");
  }

  const params = new URLSearchParams({
    q: query,
    "api-key": apiKey,
    ...(options?.beginDate ? { begin_date: options.beginDate } : {}),
    ...(options?.endDate ? { end_date: options.endDate } : {}),
    ...(options?.page !== undefined ? { page: String(options.page) } : {}),
    ...(options?.sort ? { sort: options.sort } : {}),
    ...(options?.filterQuery ? { fq: options.filterQuery } : {}),
  });

  const res = await fetch(
    `https://api.nytimes.com/svc/search/v2/articlesearch.json?${params}`
  );

  if (!res.ok) {
    if (res.status === 429) {
      throw new Error("NYT API rate limit reached. Wait before retrying.");
    }
    throw new Error(`NYT API error: ${res.status} ${res.statusText}`);
  }

  const data: NYTSearchResponse = await res.json();
  return {
    articles: data.response.docs,
    totalHits: data.response.meta.hits,
  };
}

/**
 * Get all NYT articles for a given month (Archive API).
 * Returns metadata for every article published that month.
 * Useful for bulk historical analysis.
 */
export async function getNYTArchiveMonth(
  year: number,
  month: number
): Promise<NYTArticle[]> {
  const apiKey = process.env.NYT_API_KEY;
  if (!apiKey) {
    throw new Error("NYT_API_KEY environment variable is required");
  }

  const res = await fetch(
    `https://api.nytimes.com/svc/archive/v1/${year}/${month}.json?api-key=${apiKey}`
  );

  if (!res.ok) {
    throw new Error(`NYT Archive API error: ${res.status} ${res.statusText}`);
  }

  const data: NYTArchiveResponse = await res.json();
  return data.response.docs;
}

/**
 * Search for articles by a specific author/byline.
 */
export async function searchNYTByAuthor(
  authorName: string,
  options?: { beginDate?: string; endDate?: string; page?: number }
): Promise<{ articles: NYTArticle[]; totalHits: number }> {
  return searchNYTArticles(authorName, {
    ...options,
    filterQuery: `byline:("${authorName}")`,
    sort: "newest",
  });
}

/**
 * Search for articles about a specific person/topic.
 */
export async function searchNYTBySubject(
  subject: string,
  options?: { beginDate?: string; endDate?: string; page?: number }
): Promise<{ articles: NYTArticle[]; totalHits: number }> {
  return searchNYTArticles(subject, {
    ...options,
    sort: "newest",
  });
}

/**
 * Convert a NYT article metadata to a ContentItem.
 * Note: the "full text" here is abstract + lead paragraph, not the full article.
 * This is enough for framing analysis and claim extraction on headlines/ledes.
 */
export function nytArticleToContentItem(
  article: NYTArticle,
  sourceId: string
): ContentItem {
  const text = [
    article.headline.main,
    article.abstract,
    article.lead_paragraph,
    article.snippet,
  ]
    .filter(Boolean)
    .join("\n\n");

  return {
    id: `nyt-${article._id}`,
    title: article.headline.main,
    url: article.web_url,
    contentType: "article",
    sourceId,
    sourceName: "The New York Times",
    publishedAt: article.pub_date,
    ingestedAt: new Date().toISOString(),
    rawText: text,
    wordCount: article.word_count || text.split(/\s+/).length,
    metadata: {
      author: article.byline?.original || undefined,
      publication: "The New York Times",
      section: article.section_name,
      subsection: article.subsection_name || undefined,
      keywords: article.keywords?.map((k) => `${k.name}:${k.value}`) || [],
      documentType: article.document_type,
      newsDesk: article.news_desk,
      typeOfMaterial: article.type_of_material,
      nytPartialText: true, // flag that this is abstract-only, not full text
    } as Record<string, unknown>,
  };
}
