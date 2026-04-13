/**
 * Bulk Historical Ingestion
 *
 * Runs through multiple pundits and outlets systematically.
 * Designed to run for extended periods — saves progress and can resume.
 *
 * Usage:
 *   npx tsx scripts/bulk-ingest.ts                    # run all
 *   npx tsx scripts/bulk-ingest.ts --outlet nyt       # just NYT
 *   npx tsx scripts/bulk-ingest.ts --pundit "Tucker Carlson"  # one pundit
 *   npx tsx scripts/bulk-ingest.ts --year 2016        # specific year
 */

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { getNYTArchiveMonth } from "../src/lib/scrapers/nyt-api";
import { Readability } from "@mozilla/readability";
import { JSDOM } from "jsdom";
import * as fs from "fs";
import * as path from "path";

// ─── Progress Tracking ──────────────────────────────────────────────

const PROGRESS_FILE = path.join(__dirname, ".ingest-progress.json");

interface Progress {
  lastRun: string;
  nytArchiveMonths: Record<string, boolean>; // "2016-04": true
  waybackUrls: Record<string, boolean>;
  totalIngested: number;
  totalSkipped: number;
  totalFailed: number;
}

function loadProgress(): Progress {
  try {
    return JSON.parse(fs.readFileSync(PROGRESS_FILE, "utf-8"));
  } catch {
    return {
      lastRun: new Date().toISOString(),
      nytArchiveMonths: {},
      waybackUrls: {},
      totalIngested: 0,
      totalSkipped: 0,
      totalFailed: 0,
    };
  }
}

function saveProgress(progress: Progress): void {
  progress.lastRun = new Date().toISOString();
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2));
}

// ─── Rate Limiting ──────────────────────────────────────────────────

async function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

// ─── Wayback Fetch ──────────────────────────────────────────────────

async function cdxLookup(
  url: string
): Promise<{ timestamp: string; original: string } | null> {
  try {
    const res = await fetch(
      `https://web.archive.org/cdx/search/cdx?url=${encodeURIComponent(url)}&output=json&fl=timestamp,original&filter=statuscode:200&collapse=digest&limit=1`
    );
    if (!res.ok) return null;
    const data = (await res.json()) as string[][];
    if (data.length < 2) return null;
    return { timestamp: data[1][0], original: data[1][1] };
  } catch {
    return null;
  }
}

async function fetchFromWayback(
  timestamp: string,
  originalUrl: string
): Promise<{
  title: string;
  content: string;
  author: string | null;
  wordCount: number;
} | null> {
  try {
    const archiveUrl = `https://web.archive.org/web/${timestamp}/${originalUrl}`;
    const res = await fetch(archiveUrl, {
      headers: { "User-Agent": "MediaSentinel/1.0 (academic research)" },
      redirect: "follow",
    });
    if (!res.ok) return null;

    const html = await res.text();
    const dom = new JSDOM(html, { url: archiveUrl });
    const reader = new Readability(dom.window.document);
    const article = reader.parse();

    if (!article?.textContent || article.textContent.length < 200) return null;

    return {
      title: article.title || "",
      content: article.textContent,
      author: article.byline || null,
      wordCount: article.textContent.split(/\s+/).length,
    };
  } catch {
    return null;
  }
}

// ─── NYT Archive Sweep ─────────────────────────────────────────────

/**
 * Key pundits and topics to filter NYT articles for.
 * We pull entire months from the Archive API, then filter locally.
 */
const NYT_FILTER_TERMS = [
  // Individual pundits
  "tucker carlson", "ben shapiro", "rachel maddow", "sean hannity",
  "laura ingraham", "don lemon", "anderson cooper", "jake tapper",
  "candace owens", "alex jones", "steve bannon", "bernie sanders",
  "alexandria ocasio-cortez", "aoc", "joe rogan", "jordan peterson",
  "megyn kelly", "bill maher", "jon stewart", "john oliver",
  "glenn beck", "rush limbaugh", "ann coulter", "chris cuomo",
  "wolf blitzer", "brett baier", "jesse watters", "greg gutfeld",
  "tim pool", "cenk uygur", "young turks", "daily wire",
  "charlie kirk", "matt walsh", "steven crowder",
  // Organizations
  "fox news", "msnbc", "breitbart", "daily wire", "daily caller",
  // Key topics for bias analysis
  "media bias", "fake news", "misinformation", "fact check",
  "partisan", "polarization",
  // Major political events (cross-source comparison opportunities)
  "impeachment", "election fraud", "january 6", "capitol riot",
  "supreme court", "immigration", "border wall", "climate change",
  "gun control", "second amendment", "healthcare", "obamacare",
  "abortion", "roe v wade",
];

async function sweepNYTArchive(
  year: number,
  month: number,
  progress: Progress
): Promise<{ ingested: number; skipped: number; failed: number }> {
  const monthKey = `${year}-${String(month).padStart(2, "0")}`;

  if (progress.nytArchiveMonths[monthKey]) {
    console.log(`  [${monthKey}] Already processed, skipping`);
    return { ingested: 0, skipped: 0, failed: 0 };
  }

  console.log(`  [${monthKey}] Fetching archive...`);

  let articles;
  try {
    articles = await getNYTArchiveMonth(year, month);
  } catch (err) {
    console.log(`  [${monthKey}] Archive API failed: ${err}`);
    return { ingested: 0, skipped: 0, failed: 1 };
  }

  console.log(`  [${monthKey}] ${articles.length} total articles`);

  // Filter for articles matching our terms
  const relevant = articles.filter((a) => {
    const text = [
      a.headline?.main || "",
      a.abstract || "",
      a.lead_paragraph || "",
      a.snippet || "",
    ]
      .join(" ")
      .toLowerCase();

    return NYT_FILTER_TERMS.some((term) => text.includes(term));
  });

  console.log(`  [${monthKey}] ${relevant.length} relevant articles`);

  let ingested = 0;
  let skipped = 0;
  let failed = 0;

  for (const article of relevant) {
    const url = article.web_url;
    if (!url || progress.waybackUrls[url]) {
      skipped++;
      continue;
    }

    // CDX lookup
    const capture = await cdxLookup(url);
    await delay(1200);

    if (!capture) {
      skipped++;
      progress.waybackUrls[url] = true;
      continue;
    }

    // Fetch full text
    const fullArticle = await fetchFromWayback(capture.timestamp, capture.original);
    await delay(1200);

    if (!fullArticle) {
      skipped++;
      progress.waybackUrls[url] = true;
      continue;
    }

    // Log the ingestion (we're not writing to DB in this script —
    // just collecting and counting. The full pipeline handles persistence.)
    console.log(
      `    ✓ [${article.pub_date?.slice(0, 10)}] ${fullArticle.title.slice(0, 70)}... (${fullArticle.wordCount} words)`
    );

    ingested++;
    progress.waybackUrls[url] = true;
    progress.totalIngested++;

    // Save progress every 10 articles
    if (ingested % 10 === 0) {
      saveProgress(progress);
    }
  }

  progress.nytArchiveMonths[monthKey] = true;
  saveProgress(progress);

  console.log(
    `  [${monthKey}] Done: ${ingested} ingested, ${skipped} skipped, ${failed} failed`
  );

  return { ingested, skipped, failed };
}

// ─── Main ───────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  let startYear = 2006;
  let endYear = 2025;
  let specificOutlet: string | null = null;
  let specificPundit: string | null = null;

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--outlet":
        specificOutlet = args[++i];
        break;
      case "--pundit":
        specificPundit = args[++i];
        break;
      case "--year":
        startYear = parseInt(args[++i], 10);
        endYear = startYear;
        break;
      case "--from":
        startYear = parseInt(args[++i], 10);
        break;
      case "--to":
        endYear = parseInt(args[++i], 10);
        break;
    }
  }

  const progress = loadProgress();

  console.log("=== MediaSentinel Bulk Ingestion ===");
  console.log(`Range: ${startYear}-${endYear}`);
  console.log(`Previous progress: ${progress.totalIngested} articles ingested`);
  console.log("");

  if (!specificOutlet || specificOutlet === "nyt") {
    if (!process.env.NYT_API_KEY) {
      console.log("NYT_API_KEY not set, skipping NYT archive sweep");
    } else {
      console.log("=== NYT Archive Sweep ===\n");

      let totalIngested = 0;

      for (let year = startYear; year <= endYear; year++) {
        console.log(`Year ${year}:`);
        for (let month = 1; month <= 12; month++) {
          // Don't process future months
          const now = new Date();
          if (year > now.getFullYear() || (year === now.getFullYear() && month > now.getMonth() + 1)) {
            continue;
          }

          const result = await sweepNYTArchive(year, month, progress);
          totalIngested += result.ingested;

          // NYT API rate limit: 10 req/min for archive
          await delay(7000);
        }
      }

      console.log(`\nNYT sweep complete: ${totalIngested} articles ingested\n`);
    }
  }

  console.log("=== Bulk Ingestion Summary ===");
  console.log(`Total ingested (all time): ${progress.totalIngested}`);
  console.log(`Total skipped: ${progress.totalSkipped}`);
  console.log(`Total failed: ${progress.totalFailed}`);
  saveProgress(progress);
}

main().catch((err) => {
  console.error("Bulk ingestion failed:", err);
  process.exit(1);
});
