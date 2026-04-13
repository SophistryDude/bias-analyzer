import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { Readability } from "@mozilla/readability";
import { JSDOM } from "jsdom";

async function testWayback() {
  // Step 1: CDX search for archived NYT Aleppo article
  console.log("=== Step 1: CDX Search ===");
  const cdxUrl =
    "https://web.archive.org/cdx/search/cdx?url=nytimes.com/2016/04/29/world/middleeast/aleppo-syria-strikes.html&output=json&fl=timestamp,original,statuscode&filter=statuscode:200&limit=3";

  const cdxRes = await fetch(cdxUrl);
  const cdxData = await cdxRes.json();
  console.log(`Found ${cdxData.length - 1} captures`);

  if (cdxData.length < 2) {
    console.log("No captures found");
    process.exit(1);
  }

  // Use the first 200-status capture
  const timestamp = cdxData[1][0];
  const originalUrl = cdxData[1][1];
  console.log(`Using capture: ${timestamp} — ${originalUrl}\n`);

  // Step 2: Fetch the archived page
  console.log("=== Step 2: Fetch Archived Page ===");
  const archiveUrl = `https://web.archive.org/web/${timestamp}/${originalUrl}`;
  console.log(`Fetching: ${archiveUrl}`);

  const pageRes = await fetch(archiveUrl, {
    headers: { "User-Agent": "MediaSentinel/1.0 (academic research)" },
    redirect: "follow",
  });

  if (!pageRes.ok) {
    console.log(`Fetch failed: ${pageRes.status}`);
    process.exit(1);
  }

  const html = await pageRes.text();
  console.log(`HTML length: ${html.length} chars\n`);

  // Step 3: Extract with Readability
  console.log("=== Step 3: Readability Extraction ===");
  const dom = new JSDOM(html, { url: archiveUrl });
  const reader = new Readability(dom.window.document);
  const article = reader.parse();

  if (!article) {
    console.log("Readability failed to parse article");
    process.exit(1);
  }

  console.log(`Title: ${article.title}`);
  console.log(`Byline: ${article.byline}`);
  console.log(`Excerpt: ${article.excerpt?.slice(0, 150)}...`);
  console.log(`Content length: ${article.textContent!.length} chars`);
  console.log(`Word count: ${article.textContent!.split(/\s+/).length} words\n`);

  console.log("=== First 800 chars of extracted text ===");
  console.log(article.textContent!.slice(0, 800));

  console.log("\n=== Step 4: Test Another Outlet ===");

  // Fox News article from same period
  const foxCdxUrl =
    "https://web.archive.org/cdx/search/cdx?url=foxnews.com/politics/2016/04/27/trump-calls-for-us-foreign-policy*&output=json&fl=timestamp,original,statuscode&filter=statuscode:200&limit=3";

  const foxCdxRes = await fetch(foxCdxUrl);
  const foxCdxData = await foxCdxRes.json();
  console.log(`\nFox News captures found: ${foxCdxData.length - 1}`);

  if (foxCdxData.length >= 2) {
    const foxTs = foxCdxData[1][0];
    const foxUrl = foxCdxData[1][1];
    console.log(`Fox capture: ${foxTs} — ${foxUrl}`);

    const foxPageRes = await fetch(
      `https://web.archive.org/web/${foxTs}/${foxUrl}`,
      {
        headers: { "User-Agent": "MediaSentinel/1.0 (academic research)" },
        redirect: "follow",
      }
    );

    if (foxPageRes.ok) {
      const foxHtml = await foxPageRes.text();
      const foxDom = new JSDOM(foxHtml, {
        url: `https://web.archive.org/web/${foxTs}/${foxUrl}`,
      });
      const foxReader = new Readability(foxDom.window.document);
      const foxArticle = foxReader.parse();

      if (foxArticle) {
        console.log(`Fox Title: ${foxArticle.title}`);
        console.log(`Fox Content length: ${foxArticle.textContent!.length} chars`);
        console.log(`Fox Word count: ${foxArticle.textContent!.split(/\s+/).length} words`);
      }
    }
  }

  console.log("\n=== Wayback Machine Pipeline Test Complete ===");
}

testWayback().catch((e) => {
  console.error("Test failed:", e);
  process.exit(1);
});
