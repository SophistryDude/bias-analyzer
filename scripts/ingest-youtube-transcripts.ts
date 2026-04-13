/**
 * Bulk YouTube Transcript Ingestion (easy-wins #9)
 *
 * For a configured list of channel → pundit mappings:
 *   1. Fetch the N most recent videos from each channel (YouTube Data API v3)
 *   2. For each video, fetch transcript via youtube-transcript
 *   3. Upsert a ContentItem into the content_items table
 *   4. Track progress in scripts/.yt-transcript-progress.json so it can resume
 *
 * Does NOT run analysis — that's the ingest pipeline's job. This script is just
 * a content loader; downstream analyzers pick the new rows up.
 *
 * Requires YOUTUBE_API_KEY in .env.local.
 *
 * Usage:
 *   npx tsx scripts/ingest-youtube-transcripts.ts                 # 25 videos/channel
 *   npx tsx scripts/ingest-youtube-transcripts.ts --per 50        # 50 videos/channel
 *   npx tsx scripts/ingest-youtube-transcripts.ts --channel ben-shapiro
 *   npx tsx scripts/ingest-youtube-transcripts.ts --reset         # clear progress
 *
 * Notes on scale:
 *   - YouTube Data API free quota is 10,000 units/day; each search = 100 units,
 *     so you can hit ~100 channels/day at 5 videos each without quota issues.
 *   - youtube-transcript is not rate-limited by API; it scrapes the caption
 *     endpoint. Long videos can time out. Failures are logged and skipped.
 */

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { readFileSync, writeFileSync, existsSync } from "fs";
import { resolve } from "path";

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../src/lib/db/schema";

import { fetchChannelVideos } from "../src/lib/scrapers/youtube-channel";
import { ingestYouTubeVideo } from "../src/lib/scrapers/youtube";

// ─── Channel → Pundit Mapping ───────────────────────────────────────
// Top pundits with substantial YouTube back catalogs.
// Pundit IDs must exist in the pundits table (seeded via db:seed + db:seed-200).

interface ChannelTarget {
  punditId: string; // FK into pundits.id
  channelUrl: string;
  displayName: string;
}

const CHANNEL_TARGETS: ChannelTarget[] = [
  // Already seeded as monitored_sources
  { punditId: "philip-defranco", channelUrl: "https://youtube.com/@PhilipDeFranco", displayName: "Philip DeFranco" },
  { punditId: "tim-pool", channelUrl: "https://youtube.com/@Timcast", displayName: "Tim Pool" },
  { punditId: "breaking-points", channelUrl: "https://youtube.com/@breakingpoints", displayName: "Breaking Points" },
  { punditId: "ben-shapiro", channelUrl: "https://youtube.com/@BenShapiro", displayName: "Ben Shapiro" },

  // High-priority additions with large back catalogs
  { punditId: "steven-crowder", channelUrl: "https://youtube.com/@StevenCrowder", displayName: "Steven Crowder" },
  { punditId: "tyt-network", channelUrl: "https://youtube.com/@TheYoungTurks", displayName: "The Young Turks" },
  { punditId: "david-pakman", channelUrl: "https://youtube.com/@thedavidpakmanshow", displayName: "David Pakman" },
  { punditId: "hasan-piker", channelUrl: "https://youtube.com/@HasanAbi", displayName: "Hasan Piker" },
  { punditId: "matt-walsh", channelUrl: "https://youtube.com/@MattWalshShow", displayName: "Matt Walsh" },
  { punditId: "michael-knowles", channelUrl: "https://youtube.com/@MichaelKnowlesShow", displayName: "Michael Knowles" },
  { punditId: "jordan-peterson", channelUrl: "https://youtube.com/@JordanBPeterson", displayName: "Jordan Peterson" },
  { punditId: "dave-rubin", channelUrl: "https://youtube.com/@RubinReport", displayName: "The Rubin Report" },
  { punditId: "candace-owens", channelUrl: "https://youtube.com/@RealCandaceOwens", displayName: "Candace Owens" },
  { punditId: "tucker-carlson", channelUrl: "https://youtube.com/@TuckerCarlson", displayName: "Tucker Carlson Network" },
  { punditId: "dennis-prager", channelUrl: "https://youtube.com/@PragerU", displayName: "PragerU" },
  { punditId: "kyle-kulinski", channelUrl: "https://youtube.com/@SecularTalk", displayName: "Secular Talk (Kyle Kulinski)" },
  { punditId: "sam-seder", channelUrl: "https://youtube.com/@TheMajorityReport", displayName: "The Majority Report (Sam Seder)" },
  { punditId: "brian-tyler-cohen", channelUrl: "https://youtube.com/@briantylercohen", displayName: "Brian Tyler Cohen" },
];

// ─── Progress tracking ──────────────────────────────────────────────
interface ProgressState {
  processedVideoIds: Record<string, string[]>; // punditId → videoIds already ingested
  stats: {
    videosAttempted: number;
    videosIngested: number;
    videosSkipped: number;
    videosFailed: number;
    startedAt: string;
    lastRunAt: string;
  };
}

const PROGRESS_PATH = resolve("scripts/.yt-transcript-progress.json");

function loadProgress(): ProgressState {
  if (!existsSync(PROGRESS_PATH)) {
    return {
      processedVideoIds: {},
      stats: {
        videosAttempted: 0,
        videosIngested: 0,
        videosSkipped: 0,
        videosFailed: 0,
        startedAt: new Date().toISOString(),
        lastRunAt: new Date().toISOString(),
      },
    };
  }
  return JSON.parse(readFileSync(PROGRESS_PATH, "utf-8"));
}

function saveProgress(state: ProgressState): void {
  state.stats.lastRunAt = new Date().toISOString();
  writeFileSync(PROGRESS_PATH, JSON.stringify(state, null, 2));
}

// ─── Main ───────────────────────────────────────────────────────────
async function main() {
  // Parse args
  const args = process.argv.slice(2);
  if (args.includes("--reset")) {
    if (existsSync(PROGRESS_PATH)) {
      writeFileSync(PROGRESS_PATH, "");
      console.log("Progress file reset.");
    }
    process.exit(0);
  }

  const perIdx = args.indexOf("--per");
  const videosPerChannel = perIdx >= 0 ? parseInt(args[perIdx + 1], 10) : 25;

  const channelIdx = args.indexOf("--channel");
  const targetPunditId = channelIdx >= 0 ? args[channelIdx + 1] : null;

  // Validate env
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    console.error(
      "YOUTUBE_API_KEY is not set in .env.local. See easy-wins #2.",
    );
    process.exit(1);
  }

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("DATABASE_URL is not set in .env.local.");
    process.exit(1);
  }

  const client = postgres(connectionString);
  const db = drizzle(client, { schema });

  const targets = targetPunditId
    ? CHANNEL_TARGETS.filter((c) => c.punditId === targetPunditId)
    : CHANNEL_TARGETS;

  if (targets.length === 0) {
    console.error(
      `No channel matches --channel "${targetPunditId}". Valid IDs: ${CHANNEL_TARGETS.map((c) => c.punditId).join(", ")}`,
    );
    process.exit(1);
  }

  console.log(
    `Ingesting up to ${videosPerChannel} videos from each of ${targets.length} channel(s).\n`,
  );

  const progress = loadProgress();

  for (const target of targets) {
    console.log(`─── ${target.displayName} (${target.punditId}) ───`);

    // Fetch recent video list
    let videos: Awaited<ReturnType<typeof fetchChannelVideos>>;
    try {
      videos = await fetchChannelVideos(target.channelUrl, videosPerChannel);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.log(`  Channel lookup FAILED: ${msg}`);
      continue;
    }

    console.log(`  Found ${videos.length} video(s) via API.`);
    const alreadySeen = new Set(progress.processedVideoIds[target.punditId] || []);

    for (const v of videos) {
      progress.stats.videosAttempted++;

      if (alreadySeen.has(v.videoId)) {
        progress.stats.videosSkipped++;
        continue;
      }

      const videoUrl = `https://youtube.com/watch?v=${v.videoId}`;

      try {
        const item = await ingestYouTubeVideo(
          videoUrl,
          target.punditId,
          target.displayName,
        );

        // Upsert content item. Uses onConflictDoNothing so re-running is safe.
        await db
          .insert(schema.contentItems)
          .values({
            id: item.id,
            title: item.title,
            url: item.url,
            contentType: item.contentType,
            sourceId: item.sourceId || null,
            sourceName: item.sourceName,
            publishedAt: new Date(item.publishedAt),
            ingestedAt: new Date(item.ingestedAt),
            rawText: item.rawText,
            wordCount: item.wordCount,
            metadata: item.metadata as Record<string, unknown>,
          })
          .onConflictDoNothing();

        alreadySeen.add(v.videoId);
        progress.processedVideoIds[target.punditId] = Array.from(alreadySeen);
        progress.stats.videosIngested++;

        console.log(
          `  OK   [${v.publishedAt.slice(0, 10)}] ${item.wordCount.toString().padStart(5)} words — ${v.title.slice(0, 70)}`,
        );
      } catch (err) {
        progress.stats.videosFailed++;
        const msg = err instanceof Error ? err.message : String(err);
        console.log(
          `  FAIL [${v.publishedAt.slice(0, 10)}] ${v.title.slice(0, 60)} — ${msg.slice(0, 100)}`,
        );
      }

      // Save progress after every successful video so interrupts don't lose work.
      saveProgress(progress);
    }

    console.log();
  }

  console.log("─── Summary ───");
  console.log(`  Attempted: ${progress.stats.videosAttempted}`);
  console.log(`  Ingested:  ${progress.stats.videosIngested}`);
  console.log(`  Skipped:   ${progress.stats.videosSkipped} (already seen)`);
  console.log(`  Failed:    ${progress.stats.videosFailed}`);
  console.log(`  Progress:  ${PROGRESS_PATH}`);

  await client.end();
  process.exit(0);
}

main().catch((err) => {
  console.error("Bulk transcript ingest failed:", err);
  process.exit(1);
});
