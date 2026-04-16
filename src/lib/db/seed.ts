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

  // ─── Extra pundits not in PUNDIT_REGISTRY or seed-200 ───────────
  // These are referenced by SEED_PROFILES but missing from other seed
  // scripts. Insert them first so the profile FK constraint is satisfied.
  const EXTRA_PUNDITS = [
    { id: "krystal-ball", name: "Krystal Ball", slug: "krystal-ball", platforms: ["youtube", "podcast"], currentLeaning: "left", description: "Breaking Points co-host. Populist-left commentator.", knownFor: ["Breaking Points", "Rising"], tags: ["youtube", "podcast", "populist-left"] },
    { id: "saagar-enjeti", name: "Saagar Enjeti", slug: "saagar-enjeti", platforms: ["youtube", "podcast"], currentLeaning: "right", description: "Breaking Points co-host. National-conservative commentator.", knownFor: ["Breaking Points", "Rising"], tags: ["youtube", "podcast", "populist-right"] },
    { id: "victor-davis-hanson", name: "Victor Davis Hanson", slug: "victor-davis-hanson", platforms: ["other", "youtube"], currentLeaning: "right", description: "Hoover Institution fellow, classicist, author. Historical-inductive conservative intellectual.", knownFor: ["The Case for Trump", "The Dying Citizen"], tags: ["academic", "conservative", "hoover-institution"] },
    { id: "barack-obama", name: "Barack Obama", slug: "barack-obama", platforms: ["other"], currentLeaning: "center-left", description: "44th President of the United States. Constitutional-pragmatic institutionalist progressive.", knownFor: ["Presidency", "A Promised Land"], tags: ["politician", "president"] },
    { id: "elon-musk", name: "Elon Musk", slug: "elon-musk", platforms: ["other"], currentLeaning: "right", description: "CEO of Tesla, SpaceX, xAI. Owner of X. Head of DOGE.", knownFor: ["Tesla", "SpaceX", "X", "DOGE"], tags: ["tech", "billionaire", "platform-owner"] },
    { id: "nicholas-major", name: "Nicholas Major", slug: "nicholas-major", platforms: ["other"], currentLeaning: "center", description: "MediaSentinel project author. Classical-liberal pragmatist.", knownFor: ["MediaSentinel"], tags: ["project-author"] },
    { id: "donald-trump-pre-2015", name: "Donald Trump (pre-2015)", slug: "donald-trump-pre-2015", platforms: ["other"], currentLeaning: "center", description: "Donald Trump's political positions as expressed through ~35 years of public life before the 2015 campaign.", knownFor: ["The Apprentice", "The Art of the Deal"], tags: ["politician", "dual-profile"] },
    { id: "donald-trump-2016-2024", name: "Donald Trump (2016-2024)", slug: "donald-trump-2016-2024", platforms: ["other"], currentLeaning: "right", description: "Donald Trump's populist-nationalist-right political brand from the 2016 campaign through the 2024 victory.", knownFor: ["Presidency", "MAGA", "America First"], tags: ["politician", "dual-profile"] },
    { id: "destiny-bonnell", name: "Destiny (Steven Bonnell II)", slug: "destiny-bonnell", platforms: ["youtube", "streaming"], currentLeaning: "center-left", description: "Political streamer and debater. Method-coherent institutionalist center-left.", knownFor: ["Political debates", "Kick", "YouTube"], tags: ["streaming", "debate"] },
  ];

  console.log(`Seeding ${EXTRA_PUNDITS.length} extra pundits (SEED_PROFILES deps)...`);
  for (const p of EXTRA_PUNDITS) {
    await db
      .insert(schema.pundits)
      .values({
        id: p.id,
        name: p.name,
        slug: p.slug,
        platforms: p.platforms,
        currentLeaning: p.currentLeaning,
        description: p.description,
        knownFor: p.knownFor,
        tags: p.tags,
      })
      .onConflictDoNothing();
  }
  console.log("  Done.\n");

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
  // SEED_PROFILES entityIds don't always match pundits table IDs exactly
  // (e.g., "destiny-bonnell" vs "destiny", "donald-trump-pre-2015" vs
  // "donald-trump"). Skip profiles whose entityId has no matching pundit
  // row rather than crashing on the FK constraint.
  const allPunditIds = new Set(
    (await db.select({ id: schema.pundits.id }).from(schema.pundits)).map(
      (r) => r.id
    )
  );

  console.log(`Seeding ${SEED_PROFILES.length} political profiles...`);
  let profilesInserted = 0;
  let profilesSkipped = 0;
  for (const profile of SEED_PROFILES) {
    if (!allPunditIds.has(profile.entityId)) {
      console.log(
        `  SKIP profile "${profile.entityId}" — no matching pundit ID in DB`
      );
      profilesSkipped++;
      continue;
    }

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
    profilesInserted++;
  }
  console.log(
    `  Done. Inserted ${profilesInserted}, skipped ${profilesSkipped}.\n`
  );

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
  // Only insert sources whose owning pundit is actually present in the DB.
  // Some sources reference pundits that are seeded by db:seed-200, so if
  // seed-200 hasn't run yet those rows would fail a foreign key check and
  // abort the whole seed. We pre-filter and skip with a note instead.
  const existingPundits = new Set(
    (await db.select({ id: schema.pundits.id }).from(schema.pundits)).map(
      (r) => r.id
    )
  );
  let inserted = 0;
  let skipped = 0;
  for (const source of MONITORED_SOURCES) {
    if (!existingPundits.has(source.punditId)) {
      console.log(
        `  SKIP ${source.id} — pundit "${source.punditId}" not in DB. Run \`npm run db:seed-200\` first.`
      );
      skipped++;
      continue;
    }
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
    inserted++;
  }
  console.log(`  Done. Inserted ${inserted}, skipped ${skipped}.\n`);

  console.log("Seed complete.");
  await client.end();
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
