/**
 * Historical Ingestion CLI
 *
 * Usage:
 *   npx tsx scripts/ingest-history.ts "Tucker Carlson" --source tucker-carlson
 *   npx tsx scripts/ingest-history.ts "Ben Shapiro" --source ben-shapiro --from 2015 --to 2025
 *   npx tsx scripts/ingest-history.ts "CNN" --source cnn --max 100
 */

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { ingestPunditHistory } from "../src/lib/pipeline/historical-ingest";

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log("Usage: npx tsx scripts/ingest-history.ts <name> --source <id> [--from YYYY] [--to YYYY] [--max N] [--analyze]");
    console.log("");
    console.log("Examples:");
    console.log('  npx tsx scripts/ingest-history.ts "Tucker Carlson" --source tucker-carlson');
    console.log('  npx tsx scripts/ingest-history.ts "CNN Aleppo" --source cnn --from 2016 --to 2016 --max 50');
    console.log('  npx tsx scripts/ingest-history.ts "Ben Shapiro" --source ben-shapiro --from 2015 --analyze');
    process.exit(0);
  }

  const name = args[0];
  let sourceId = name.toLowerCase().replace(/\s+/g, "-");
  let startYear = 2006;
  let endYear = 2025;
  let maxArticles = 200;
  let analyze = false;

  for (let i = 1; i < args.length; i++) {
    switch (args[i]) {
      case "--source":
        sourceId = args[++i];
        break;
      case "--from":
        startYear = parseInt(args[++i], 10);
        break;
      case "--to":
        endYear = parseInt(args[++i], 10);
        break;
      case "--max":
        maxArticles = parseInt(args[++i], 10);
        break;
      case "--analyze":
        analyze = true;
        break;
    }
  }

  console.log(`Ingesting historical content for: ${name}`);
  console.log(`Source ID: ${sourceId}`);
  console.log(`Range: ${startYear}-${endYear}`);
  console.log(`Max articles per source: ${maxArticles}`);
  console.log(`Analyze immediately: ${analyze}`);
  console.log("");

  const result = await ingestPunditHistory(name, {
    sourceId,
    startYear,
    endYear,
    maxArticlesPerSource: maxArticles,
    analyzeImmediately: analyze,
    onProgress: (source, p) => {
      process.stdout.write(
        `\r[${source}] ${p.processed}/${p.total} processed, ${p.ingested} ingested, ${p.skipped} skipped`
      );
    },
  });

  console.log("\n\nDone.");
  process.exit(0);
}

main().catch((err) => {
  console.error("Ingestion failed:", err);
  process.exit(1);
});
