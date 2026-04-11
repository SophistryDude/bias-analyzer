import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import {
  discoverArticles,
  ingestFromWayback,
} from "../src/lib/pipeline/historical-ingest";

async function test() {
  // Step 1: Discover articles about Tucker Carlson via Google News
  console.log("=== Step 1: Google News Discovery ===\n");
  const articles = await discoverArticles("Tucker Carlson", { maxResults: 10 });
  console.log(`Found ${articles.length} articles:`);
  for (const a of articles) {
    console.log(`  "${a.title}" — ${a.source}`);
  }

  // Step 2: Test Wayback ingestion with known URLs
  console.log("\n=== Step 2: Wayback Machine Ingestion Test ===\n");

  const testUrls = [
    "https://www.foxnews.com/politics/trump-calls-for-us-foreign-policy-shake-up-no-more-nation-building",
    "https://www.nytimes.com/2016/04/29/world/middleeast/aleppo-syria-strikes.html",
    "https://www.cnn.com/2016/04/28/middleeast/syria-aleppo-hospital-airstrike/index.html",
    "https://www.breitbart.com/politics/2016/04/27/donald-trump-rejects-false-song-globalism-nationalist-foreign-policy-speech-2/",
    "https://www.nytimes.com/2016/04/28/us/politics/donald-trump-foreign-policy-speech.html",
  ];

  const progress = await ingestFromWayback(testUrls, {
    sourceId: "test",
    sourceName: "Historical Test",
    analyzeImmediately: false,
    onProgress: (p) => {
      console.log(
        `  Progress: ${p.processed}/${p.total} | ingested: ${p.ingested} | skipped: ${p.skipped} | failed: ${p.failed}`
      );
    },
  });

  console.log("\n=== Results ===");
  console.log(`Total: ${progress.total}`);
  console.log(`Ingested: ${progress.ingested}`);
  console.log(`Skipped: ${progress.skipped}`);
  console.log(`Failed: ${progress.failed}`);
  if (progress.errors.length > 0) {
    console.log("Errors:");
    for (const e of progress.errors) console.log(`  ${e}`);
  }

  console.log("\nDone.");
}

test().catch((e) => {
  console.error("Test failed:", e);
  process.exit(1);
});
