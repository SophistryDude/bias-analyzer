/**
 * Test YouTube Channel Monitoring (easy-wins #8)
 *
 * Verifies the full pipeline for the 4 seeded YouTube channels:
 *   1. Fetch recent videos from each channel via Data API v3
 *   2. Optionally fetch transcript + metadata for the most recent video
 *
 * Requires YOUTUBE_API_KEY in .env.local.
 *
 * Run with:
 *   npx tsx scripts/test-youtube-channels.ts         # just list recent videos
 *   npx tsx scripts/test-youtube-channels.ts --deep  # also fetch a transcript
 */

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { fetchChannelVideos } from "../src/lib/scrapers/youtube-channel";
import { ingestYouTubeVideo } from "../src/lib/scrapers/youtube";

const SEEDED_CHANNELS = [
  { id: "yt-philip-defranco", name: "Philip DeFranco", url: "https://youtube.com/@PhilipDeFranco" },
  { id: "yt-tim-pool", name: "Tim Pool", url: "https://youtube.com/@Timcast" },
  { id: "yt-breaking-points", name: "Breaking Points", url: "https://youtube.com/@breakingpoints" },
  { id: "yt-ben-shapiro", name: "Ben Shapiro", url: "https://youtube.com/@BenShapiro" },
];

async function main() {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    console.error(
      "YOUTUBE_API_KEY is not set in .env.local.\n" +
        "Get a key at https://console.developers.google.com/, enable YouTube Data API v3, " +
        "then add it to .env.local as YOUTUBE_API_KEY=...",
    );
    process.exit(1);
  }

  const deep = process.argv.includes("--deep");
  console.log(
    `Testing ${SEEDED_CHANNELS.length} YouTube channels (deep=${deep}).\n`,
  );

  let channelsOk = 0;
  let channelsFailed = 0;
  const problems: string[] = [];

  for (const ch of SEEDED_CHANNELS) {
    console.log(`─── ${ch.name} (${ch.url}) ───`);
    try {
      const videos = await fetchChannelVideos(ch.url, 5);
      console.log(`  Found ${videos.length} recent video(s).`);
      for (const v of videos.slice(0, 3)) {
        console.log(`    • [${v.publishedAt.slice(0, 10)}] ${v.title}`);
      }

      if (deep && videos.length > 0) {
        const first = videos[0];
        const url = `https://youtube.com/watch?v=${first.videoId}`;
        console.log(`  Fetching transcript for most recent video...`);
        try {
          const item = await ingestYouTubeVideo(url, ch.id, ch.name);
          console.log(
            `  Transcript: ${item.wordCount} words, title="${item.title.slice(0, 60)}"`,
          );
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          console.log(`  Transcript FAILED: ${msg}`);
          problems.push(`${ch.name} transcript: ${msg}`);
        }
      }

      channelsOk++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.log(`  FAILED: ${msg}`);
      problems.push(`${ch.name}: ${msg}`);
      channelsFailed++;
    }
    console.log();
  }

  console.log("─── Summary ───");
  console.log(`  OK:     ${channelsOk}/${SEEDED_CHANNELS.length}`);
  console.log(`  Failed: ${channelsFailed}/${SEEDED_CHANNELS.length}`);
  if (problems.length > 0) {
    console.log("\nProblems:");
    for (const p of problems) console.log(`  - ${p}`);
  }

  process.exit(channelsFailed === 0 ? 0 : 2);
}

main().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
