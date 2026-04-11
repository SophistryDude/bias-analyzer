/**
 * EBSCO Discovery Service (EDS) Integration
 *
 * Searches EBSCO databases for academic and news articles.
 * Supplements ProQuest coverage with additional sources.
 *
 * Setup requirements:
 * 1. Your WGU EBSCO account must be API-enabled
 *    (contact WGU Library or EBSCO support)
 * 2. Set EBSCO_USER_ID, EBSCO_PASSWORD, and EBSCO_PROFILE in .env.local
 *
 * API docs: https://developer.ebsco.com/eds-api/docs/introduction
 *
 * Authentication flow:
 * 1. Create session with credentials → get session token + auth token
 * 2. Use tokens for search/retrieve requests
 * 3. Session expires after inactivity
 */

import type { ContentItem } from "../models/types";

// ─── Types ──────────────────────────────────────────────────────────

export interface EBSCOArticle {
  id: string;
  dbId: string;
  title: string;
  abstract: string;
  fullText?: string;
  authors: string[];
  source: string;
  publishDate: string;
  url?: string;
  subjectTerms: string[];
  docType: string;
}

interface EBSCOSession {
  sessionToken: string;
  authToken: string;
  expiresAt: number;
}

// ─── Session Management ─────────────────────────────────────────────

let session: EBSCOSession | null = null;

const EDS_BASE = "https://eds-api.ebscohost.com";

async function getSession(): Promise<EBSCOSession> {
  if (session && Date.now() < session.expiresAt) {
    return session;
  }

  const userId = process.env.EBSCO_USER_ID;
  const password = process.env.EBSCO_PASSWORD;
  const profile = process.env.EBSCO_PROFILE;

  if (!userId || !password) {
    throw new Error(
      "EBSCO API not configured. Set EBSCO_USER_ID, EBSCO_PASSWORD, and EBSCO_PROFILE in .env.local.\n" +
        "To get access: contact WGU Library about EBSCO EDS API access."
    );
  }

  // Step 1: Authenticate
  const authRes = await fetch(`${EDS_BASE}/authservice/rest/uidauth`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ UserId: userId, Password: password }),
  });

  if (!authRes.ok) {
    throw new Error(`EBSCO auth failed: ${authRes.status}`);
  }

  const authData = await authRes.json();
  const authToken = authData.AuthToken;

  // Step 2: Create session
  const sessionRes = await fetch(`${EDS_BASE}/edsapi/rest/CreateSession`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-authenticationToken": authToken,
    },
    body: JSON.stringify({
      Profile: profile || "edsapi",
      Guest: "n",
    }),
  });

  if (!sessionRes.ok) {
    throw new Error(`EBSCO session creation failed: ${sessionRes.status}`);
  }

  const sessionData = await sessionRes.json();

  session = {
    authToken,
    sessionToken: sessionData.SessionToken,
    expiresAt: Date.now() + 20 * 60 * 1000, // 20 minutes
  };

  return session;
}

// ─── Search ─────────────────────────────────────────────────────────

/**
 * Search EBSCO for articles.
 */
export async function searchEBSCO(
  query: string,
  options?: {
    author?: string;
    source?: string;
    dateFrom?: string; // YYYY-MM
    dateTo?: string;
    limit?: number;
    offset?: number;
    fullTextOnly?: boolean;
  }
): Promise<{ articles: EBSCOArticle[]; totalHits: number }> {
  const sess = await getSession();

  // Build search actions
  const actions: string[] = [];
  let searchQuery = `TI "${query}" OR AB "${query}"`;

  if (options?.author) {
    searchQuery = `AU "${options.author}" AND (${searchQuery})`;
  }
  if (options?.source) {
    searchQuery = `SO "${options.source}" AND (${searchQuery})`;
  }

  const params = new URLSearchParams({
    query: searchQuery,
    resultsperpage: String(options?.limit ?? 20),
    pagenumber: String(Math.floor((options?.offset ?? 0) / (options?.limit ?? 20)) + 1),
    ...(options?.fullTextOnly ? { "limiter": "FT:Y" } : {}),
  });

  if (options?.dateFrom) {
    params.append("limiter", `DT1:${options.dateFrom}/`);
  }

  const res = await fetch(`${EDS_BASE}/edsapi/rest/Search?${params}`, {
    headers: {
      "x-authenticationToken": sess.authToken,
      "x-sessionToken": sess.sessionToken,
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    // Session may have expired
    if (res.status === 400 || res.status === 401) {
      session = null;
      throw new Error("EBSCO session expired. Retry will re-authenticate.");
    }
    throw new Error(`EBSCO search failed: ${res.status}`);
  }

  const data = await res.json();
  const records = data.SearchResult?.Data?.Records || [];
  const totalHits = data.SearchResult?.Statistics?.TotalHits || 0;

  return {
    articles: records.map(mapEBSCORecord),
    totalHits,
  };
}

/**
 * Search for articles by a specific author.
 */
export async function searchEBSCOByAuthor(
  authorName: string,
  options?: { dateFrom?: string; dateTo?: string; limit?: number }
): Promise<{ articles: EBSCOArticle[]; totalHits: number }> {
  return searchEBSCO("*", {
    author: authorName,
    ...options,
  });
}

/**
 * Convert an EBSCO article to a ContentItem.
 */
export function ebscoToContentItem(
  article: EBSCOArticle,
  sourceId: string,
  sourceName: string
): ContentItem {
  const text = article.fullText || article.abstract || article.title;

  return {
    id: `ebsco-${article.dbId}-${article.id}`,
    title: article.title,
    url: article.url || "",
    contentType: "article",
    sourceId,
    sourceName,
    publishedAt: article.publishDate,
    ingestedAt: new Date().toISOString(),
    rawText: text,
    wordCount: text.split(/\s+/).length,
    metadata: {
      author: article.authors.join("; ") || undefined,
      publication: article.source,
      subjectTerms: article.subjectTerms,
      ebscoId: article.id,
      ebscoDbId: article.dbId,
      hasFullText: !!article.fullText,
    } as Record<string, unknown>,
  };
}

// ─── Helpers ────────────────────────────────────────────────────────

function mapEBSCORecord(record: Record<string, unknown>): EBSCOArticle {
  const header = record.Header as Record<string, unknown> || {};
  const items = (record.Items as Array<Record<string, unknown>>) || [];

  const getItem = (label: string): string => {
    const item = items.find((i) => i.Label === label || i.Name === label);
    return item ? String(item.Data || "") : "";
  };

  // Strip HTML from item data
  const stripHtml = (s: string): string => s.replace(/<[^>]+>/g, "");

  return {
    id: String(header.An || ""),
    dbId: String(header.DbId || ""),
    title: stripHtml(getItem("Title") || String(header.ArticleTitle || "")),
    abstract: stripHtml(getItem("Abstract") || ""),
    fullText: record.FullText
      ? stripHtml(String((record.FullText as Record<string, unknown>).Text || ""))
      : undefined,
    authors: getItem("Authors")
      ? getItem("Authors").split(";").map((a: string) => stripHtml(a.trim()))
      : [],
    source: stripHtml(getItem("Source") || String(header.SourceTitle || "")),
    publishDate: String(header.PubDate || header.PublicationDate || ""),
    url: String(header.PLink || ""),
    subjectTerms: getItem("Subject Terms")
      ? getItem("Subject Terms").split(";").map((s: string) => stripHtml(s.trim()))
      : [],
    docType: String(header.PubType || ""),
  };
}
