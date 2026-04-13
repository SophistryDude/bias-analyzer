import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

async function test() {
  const apiKey = process.env.NYT_API_KEY;
  console.log(`API key present: ${!!apiKey} (${apiKey?.slice(0, 8)}...)\n`);

  // Raw API call first to see what we get
  console.log("=== Raw NYT API Call ===\n");

  const url = `https://api.nytimes.com/svc/search/v2/articlesearch.json?q=Aleppo+hospital&begin_date=20160401&end_date=20160430&sort=newest&api-key=${apiKey}`;

  const res = await fetch(url);
  console.log(`Status: ${res.status}`);

  const data = await res.json();
  console.log(`Response keys: ${Object.keys(data)}`);

  if (data.fault) {
    console.log(`API Error: ${JSON.stringify(data.fault)}`);
    process.exit(1);
  }

  if (data.status !== "OK") {
    console.log(`Status: ${data.status}`);
    console.log(`Full response: ${JSON.stringify(data).slice(0, 500)}`);
    process.exit(1);
  }

  console.log(`Response keys: ${Object.keys(data.response)}`);
  console.log(`Meta: ${JSON.stringify(data.response.meta)}`);

  const articles = data.response.docs || [];
  const totalHits = data.response.meta?.hits ?? articles.length;

  console.log(`Total hits: ${totalHits}`);
  console.log(`Returned: ${articles.length} articles\n`);

  for (const a of articles) {
    console.log(`  [${a.pub_date?.slice(0, 10)}] ${a.headline?.main}`);
    console.log(`    URL: ${a.web_url}`);
    console.log(`    Byline: ${a.byline?.original || "N/A"}`);
    console.log("");
  }

  if (articles.length > 0) {
    console.log("=== Wayback Fetch for First Result ===\n");

    const articleUrl = articles[0].web_url;
    console.log(`Looking up: ${articleUrl}`);

    const cdxRes = await fetch(
      `https://web.archive.org/cdx/search/cdx?url=${encodeURIComponent(articleUrl)}&output=json&fl=timestamp,original&filter=statuscode:200&collapse=digest&limit=1`
    );
    const cdxData = (await cdxRes.json()) as string[][];

    if (cdxData.length < 2) {
      console.log("  Not found in Wayback Machine");
    } else {
      const ts = cdxData[1][0];
      const origUrl = cdxData[1][1];
      console.log(`  Found capture: ${ts}`);

      const { Readability } = await import("@mozilla/readability");
      const { JSDOM } = await import("jsdom");

      const archiveUrl = `https://web.archive.org/web/${ts}/${origUrl}`;
      const pageRes = await fetch(archiveUrl, {
        headers: { "User-Agent": "MediaSentinel/1.0" },
        redirect: "follow",
      });

      if (pageRes.ok) {
        const html = await pageRes.text();
        const dom = new JSDOM(html, { url: archiveUrl });
        const reader = new Readability(dom.window.document);
        const article = reader.parse();

        if (article?.textContent) {
          console.log(`\n  Title: ${article.title}`);
          console.log(`  Byline: ${article.byline}`);
          console.log(`  Words: ${article.textContent.split(/\s+/).length}`);
          console.log(`\n  First 300 chars:\n  ${article.textContent.slice(0, 300)}`);
        }
      }
    }
  }

  // Test Archive API
  console.log("\n=== NYT Archive API (April 2016) ===\n");

  const archiveRes = await fetch(
    `https://api.nytimes.com/svc/archive/v1/2016/4.json?api-key=${apiKey}`
  );
  console.log(`Archive API status: ${archiveRes.status}`);

  if (archiveRes.ok) {
    const archiveData = await archiveRes.json();
    const docs = archiveData.response?.docs || [];
    console.log(`Total articles in April 2016: ${docs.length}`);

    const aleppo = docs.filter(
      (a: { headline: { main: string }; abstract?: string }) =>
        a.headline?.main?.toLowerCase().includes("aleppo") ||
        a.abstract?.toLowerCase().includes("aleppo")
    );
    console.log(`Aleppo-related: ${aleppo.length}`);
    for (const a of aleppo.slice(0, 5)) {
      console.log(`  [${a.pub_date?.slice(0, 10)}] ${a.headline?.main}`);
    }
  }

  console.log("\n=== Done ===");
}

test().catch((e) => {
  console.error("Test failed:", e);
  process.exit(1);
});
