import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { discoverArticleUrls } from "../src/lib/pipeline/historical-ingest";

async function test() {
  console.log("Testing Google News URL discovery...\n");

  const queries = [
    "Tucker Carlson",
    "Rachel Maddow",
    "Ben Shapiro Daily Wire",
  ];

  for (const q of queries) {
    console.log(`Query: "${q}"`);
    const urls = await discoverArticleUrls(q, { maxResults: 5 });
    console.log(`  Found ${urls.length} URLs:`);
    for (const u of urls) {
      console.log(`    ${u}`);
    }
    console.log("");
  }

  // Now test Wayback lookup on discovered URLs
  if (true) {
    console.log("Testing Wayback CDX lookup on a known article...");
    const testUrl = "https://www.foxnews.com/politics/trump-calls-for-us-foreign-policy-shake-up-no-more-nation-building";

    const cdxRes = await fetch(
      `https://web.archive.org/cdx/search/cdx?url=${encodeURIComponent(testUrl)}&output=json&fl=timestamp,original&filter=statuscode:200&limit=3`
    );
    const cdxData = await cdxRes.json();
    console.log(`  Captures found: ${(cdxData as unknown[]).length - 1}`);
    if ((cdxData as unknown[][]).length > 1) {
      console.log(`  Latest: ${(cdxData as string[][])[1][0]} — ${(cdxData as string[][])[1][1]}`);
    }
  }

  console.log("\nDone.");
}

test().catch((e) => {
  console.error("Test failed:", e);
  process.exit(1);
});
