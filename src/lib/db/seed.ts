/**
 * Seed Script
 *
 * Migrates static data from the TypeScript seed arrays into PostgreSQL.
 * Run with: npx tsx src/lib/db/seed.ts
 */

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";
import { PUNDIT_REGISTRY } from "../../data/pundits/registry";
import { SEED_PROFILES } from "../models/political-axes";
import { WINDOW_HISTORY } from "../models/overton";

async function seed() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }

  const client = postgres(connectionString);
  const db = drizzle(client, { schema });

  console.log("Seeding database...\n");

  // ─── Pundits ────────────────────────────────────────────────────
  console.log(`Seeding ${PUNDIT_REGISTRY.length} pundits...`);
  for (const pundit of PUNDIT_REGISTRY) {
    await db
      .insert(schema.pundits)
      .values({
        id: pundit.id,
        name: pundit.name,
        slug: pundit.slug,
        platforms: pundit.platforms,
        currentLeaning: pundit.currentLeaning,
        description: pundit.description,
        knownFor: pundit.knownFor,
        imageUrl: pundit.imageUrl,
        externalLinks: pundit.externalLinks,
        tags: pundit.tags,
      })
      .onConflictDoNothing();

    for (const snapshot of pundit.leaningHistory) {
      await db
        .insert(schema.leaningSnapshots)
        .values({
          id: `${pundit.id}-${snapshot.date}`,
          punditId: pundit.id,
          date: snapshot.date,
          leaning: snapshot.leaning,
          evidence: snapshot.evidence,
        })
        .onConflictDoNothing();
    }
  }
  console.log("  Done.\n");

  // ─── Political Profiles ─────────────────────────────────────────
  console.log(`Seeding ${SEED_PROFILES.length} political profiles...`);
  for (const profile of SEED_PROFILES) {
    const profileId = `seed-${profile.entityId}`;
    await db
      .insert(schema.politicalProfiles)
      .values({
        id: profileId,
        punditId: profile.entityId,
        assessedAt: new Date(profile.assessedAt),
        ideologicalCoherence: profile.ideologicalCoherence,
        notes: profile.notes,
      })
      .onConflictDoNothing();

    for (const axis of profile.axes) {
      await db
        .insert(schema.axisPositions)
        .values({
          id: `${profileId}-${axis.axisId}`,
          profileId,
          axisId: axis.axisId,
          value: axis.value,
          confidence: axis.confidence,
          evidence: axis.evidence,
          trend: axis.trend,
        })
        .onConflictDoNothing();
    }
  }
  console.log("  Done.\n");

  // ─── Overton Window Snapshots ───────────────────────────────────
  console.log(`Seeding ${WINDOW_HISTORY.length} Overton window snapshots...`);
  for (let i = 0; i < WINDOW_HISTORY.length; i++) {
    const snapshot = WINDOW_HISTORY[i];
    await db
      .insert(schema.overtonSnapshots)
      .values({
        id: `overton-${snapshot.domain}-${snapshot.date}`,
        domain: snapshot.domain,
        date: snapshot.date,
        leftEdge: snapshot.leftEdge,
        rightEdge: snapshot.rightEdge,
        center: snapshot.center,
        width: snapshot.width,
        evidence: snapshot.evidence,
        keyEvents: snapshot.keyEvents,
      })
      .onConflictDoNothing();
  }
  console.log("  Done.\n");

  // ─── Monitored Sources ──────────────────────────────────────────
  const MONITORED_SOURCES = [
    {
      id: "yt-philip-defranco",
      punditId: "philip-defranco",
      type: "youtube-channel",
      name: "Philip DeFranco (YouTube)",
      url: "https://youtube.com/@PhilipDeFranco",
    },
    {
      id: "yt-tim-pool",
      punditId: "tim-pool",
      type: "youtube-channel",
      name: "Tim Pool (YouTube)",
      url: "https://youtube.com/@Timcast",
    },
    {
      id: "yt-breaking-points",
      punditId: "breaking-points",
      type: "youtube-channel",
      name: "Breaking Points (YouTube)",
      url: "https://youtube.com/@breakingpoints",
    },
    {
      id: "yt-ben-shapiro",
      punditId: "ben-shapiro",
      type: "youtube-channel",
      name: "Ben Shapiro (YouTube)",
      url: "https://youtube.com/@BenShapiro",
    },
    {
      id: "rss-nyt",
      punditId: "nyt",
      type: "rss",
      name: "NYT Top Stories",
      url: "https://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml",
    },
    {
      id: "rss-cnn",
      punditId: "cnn",
      type: "rss",
      name: "CNN Top Stories",
      url: "http://rss.cnn.com/rss/cnn_topstories.rss",
    },
    {
      id: "rss-fox",
      punditId: "fox-news",
      type: "rss",
      name: "Fox News Latest",
      url: "https://moxie.foxnews.com/google-publisher/latest.xml",
    },
    // Added via easy-wins #4. These orgs are seeded by seed-200.ts, so run
    // `npm run db:seed-200` before `npm run db:seed` if they're missing.
    {
      id: "rss-wapo",
      punditId: "washington-post",
      type: "rss",
      name: "Washington Post — Politics",
      url: "https://feeds.washingtonpost.com/rss/politics",
    },
    {
      id: "rss-breitbart",
      punditId: "breitbart",
      type: "rss",
      name: "Breitbart — Latest",
      url: "https://feeds.feedburner.com/breitbart",
    },
    {
      id: "rss-politico",
      punditId: "politico",
      type: "rss",
      name: "Politico — Politics",
      url: "https://rss.politico.com/politics-news.xml",
    },
    {
      id: "rss-the-hill",
      punditId: "the-hill",
      type: "rss",
      name: "The Hill — Homenews",
      url: "https://thehill.com/homenews/feed/",
    },
    {
      id: "rss-ap-top",
      punditId: "ap-news",
      type: "rss",
      name: "AP News — Top News",
      url: "https://feeds.apnews.com/rss/apf-topnews",
    },
    {
      id: "rss-reuters-world",
      punditId: "reuters",
      type: "rss",
      name: "Reuters — World News",
      url: "https://www.reutersagency.com/feed/?best-topics=political-general&post_type=best",
    },
    {
      id: "rss-daily-wire",
      punditId: "daily-wire",
      type: "rss",
      name: "Daily Wire — News",
      url: "https://www.dailywire.com/feeds/rss.xml",
    },
  ];

  console.log(`Seeding ${MONITORED_SOURCES.length} monitored sources...`);
  for (const source of MONITORED_SOURCES) {
    await db
      .insert(schema.monitoredSources)
      .values({
        id: source.id,
        punditId: source.punditId,
        type: source.type,
        name: source.name,
        url: source.url,
        enabled: true,
        scrapeIntervalMinutes: 60,
        metadata: {},
      })
      .onConflictDoNothing();
  }
  console.log("  Done.\n");

  console.log("Seed complete.");
  await client.end();
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
