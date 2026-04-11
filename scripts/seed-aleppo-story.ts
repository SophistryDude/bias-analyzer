/**
 * Seed the April 2016 Aleppo Story
 *
 * Creates the first story in the system with 4 source coverages
 * from our case study: Fox News, CNN, NYT, Breitbart.
 * This validates the cross-source comparison pipeline end-to-end.
 */

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../src/lib/db/schema";

async function seed() {
  const client = postgres(process.env.DATABASE_URL!);
  const db = drizzle(client, { schema });

  console.log("Creating April 2016 Aleppo story...\n");

  // Create the story
  await db.insert(schema.stories).values({
    id: "aleppo-hospital-april-2016",
    title: "Aleppo Hospital Airstrike & Trump Foreign Policy Speech",
    slug: "aleppo-hospital-april-2016",
    description: "Two simultaneous events: Al Quds Hospital in rebel-held Aleppo struck by airstrike killing 27-50 people, while Trump delivers 'America First' foreign policy speech at the Mayflower Hotel. Coverage patterns reveal how outlets select which events to cover and how they frame them.",
    occurredAt: new Date("2016-04-27T00:00:00Z"),
    topics: ["syria", "aleppo", "foreign-policy", "trump", "2016-election", "military", "humanitarian"],
  }).onConflictDoNothing();

  console.log("  Story created.\n");

  // Insert content items FIRST (foreign key requirement)
  const manualContents = [
    {
      id: "manual-fox-trump-speech",
      title: "Trump calls for US foreign policy shake-up, no more 'nation-building'",
      url: "https://www.foxnews.com/politics/trump-calls-for-us-foreign-policy-shake-up-no-more-nation-building",
      contentType: "article",
      sourceId: "fox-news",
      sourceName: "Fox News",
      publishedAt: new Date("2016-04-27T11:51:00Z"),
      rawText: "Fox News article about Trump foreign policy speech at Mayflower Hotel.",
      wordCount: 751,
      metadata: { ingestSource: "manual" },
    },
    {
      id: "manual-cnn-aleppo",
      title: "Kerry expresses outrage after 50 killed in strike on Syrian hospital",
      url: "https://www.cnn.com/2016/04/28/middleeast/syria-aleppo-hospital-airstrike",
      contentType: "article",
      sourceId: "cnn",
      sourceName: "CNN",
      publishedAt: new Date("2016-04-28T12:00:00Z"),
      rawText: "CNN article about Aleppo hospital airstrike.",
      wordCount: 1200,
      metadata: { ingestSource: "manual" },
    },
    {
      id: "manual-nyt-aleppo",
      title: "Divided Aleppo Plunges Back Into War as Syrian Hospital Is Hit",
      url: "https://www.nytimes.com/2016/04/29/world/middleeast/aleppo-syria-strikes.html",
      contentType: "article",
      sourceId: "nyt",
      sourceName: "The New York Times",
      publishedAt: new Date("2016-04-28T00:00:00Z"),
      rawText: "NYT article covering both sides of Aleppo fighting.",
      wordCount: 1315,
      metadata: { ingestSource: "manual" },
    },
    {
      id: "manual-breitbart-trump-speech",
      title: "Donald Trump Rejects 'False Song of Globalism' in Nationalist 'America First' Foreign Policy Speech",
      url: "https://www.breitbart.com/politics/2016/04/27/donald-trump-rejects-false-song-globalism-nationalist-foreign-policy-speech-2/",
      contentType: "article",
      sourceId: null,
      sourceName: "Breitbart",
      publishedAt: new Date("2016-04-27T00:00:00Z"),
      rawText: "Breitbart article amplifying Trump foreign policy speech.",
      wordCount: 450,
      metadata: { ingestSource: "manual" },
    },
  ];

  for (const c of manualContents) {
    await db.insert(schema.contentItems).values({
      id: c.id,
      title: c.title,
      url: c.url,
      contentType: c.contentType,
      sourceId: c.sourceId,
      sourceName: c.sourceName,
      publishedAt: c.publishedAt,
      ingestedAt: new Date(),
      rawText: c.rawText,
      wordCount: c.wordCount,
      metadata: c.metadata as Record<string, unknown>,
    }).onConflictDoNothing();
  }
  console.log("  4 content items created.\n");

  // Fox News coverage — Trump speech only
  await db.insert(schema.storyCoverages).values({
    id: "coverage-fox-aleppo-2016",
    storyId: "aleppo-hospital-april-2016",
    contentId: "manual-fox-trump-speech",
    sourceId: "fox-news",
    keyTerms: ["America First", "nation-building", "NATO", "fair share", "radical Islam", "ISIS", "teleprompter", "presumptive nominee", "shake the rust off"],
    headline: "Trump calls for US foreign policy shake-up, no more 'nation-building'",
    toneScore: 0.3, // favorable toward Trump
    framingType: "neutral-report", // news report style, favorable framing
    axisEconomic: -0.3,
    axisSpeech: null,
    axisProgressive: null,
    axisLiberalConservative: null,
    axisForeignPolicy: -0.6, // isolationist framing
    firstPublishedAt: new Date("2016-04-27T11:51:00Z"),
    coverageOrder: "early",
    comparisonNotes: "Covered Trump speech only. Did not cover Aleppo hospital strike. Included Ted Cruz critical response and context about foreign leaders being 'stunned.' AP wire contribution noted. Omitted Trump's criticism of George W. Bush (which Breitbart included).",
  }).onConflictDoNothing();

  // CNN coverage — Aleppo hospital only
  await db.insert(schema.storyCoverages).values({
    id: "coverage-cnn-aleppo-2016",
    storyId: "aleppo-hospital-april-2016",
    contentId: "manual-cnn-aleppo",
    sourceId: "cnn",
    keyTerms: ["airstrike", "pediatric hospital", "catastrophic", "cessation of hostilities", "barrel bombs", "Doctors Without Borders", "MSF", "ICRC", "outrage", "brink of humanitarian disaster"],
    headline: "Kerry expresses outrage after 50 killed in strike on Syrian hospital",
    toneScore: -0.6, // hostile toward perpetrators (Syrian govt implied)
    framingType: "crisis", // humanitarian crisis framing
    axisEconomic: null,
    axisSpeech: null,
    axisProgressive: -0.5, // equity-framed (victims, humanitarian)
    axisLiberalConservative: -0.4,
    axisForeignPolicy: 0.3, // implicitly interventionist (stop the carnage)
    firstPublishedAt: new Date("2016-04-28T12:00:00Z"),
    coverageOrder: "mainstream",
    comparisonNotes: "Covered Aleppo hospital strike only. Did not cover Trump speech. Kerry's condemnation prominently placed. Cited MSF (50 dead) and Syrian Observatory (27 dead) — different numbers, both credible. CRITICAL OMISSION: Did not report rebel mortar attacks on government-held areas that killed 14 civilians (NYT reported this). Single-perspective humanitarian framing.",
  }).onConflictDoNothing();

  // NYT coverage — Aleppo (both sides)
  await db.insert(schema.storyCoverages).values({
    id: "coverage-nyt-aleppo-2016",
    storyId: "aleppo-hospital-april-2016",
    contentId: "manual-nyt-aleppo",
    sourceId: "nyt",
    keyTerms: ["divided city", "all-out war", "insurgent-held", "government airstrikes", "retaliatory mortar assaults", "Doctors Without Borders", "ceasefire collapse", "Jan Egeland", "Al Razi hospital", "both sides"],
    headline: "Divided Aleppo Plunges Back Into War as Syrian Hospital Is Hit",
    toneScore: -0.4, // hostile toward violence generally, not one side
    framingType: "neutral-report", // war reporting, both sides
    axisEconomic: null,
    axisSpeech: null,
    axisProgressive: -0.3,
    axisLiberalConservative: -0.3,
    axisForeignPolicy: 0.1, // slight interventionist lean (stop the violence)
    firstPublishedAt: new Date("2016-04-28T00:00:00Z"),
    coverageOrder: "early",
    comparisonNotes: "Most balanced coverage. Reported from BOTH sides of the front line: hospital strike on rebel side AND rebel mortar attacks killing 14 on government side (including at Al Razi hospital). Named victims on both sides. Only outlet to include government-side casualties. Headline centers hospital strike but body gives full picture.",
  }).onConflictDoNothing();

  // Breitbart coverage — Trump speech (amplification)
  await db.insert(schema.storyCoverages).values({
    id: "coverage-breitbart-aleppo-2016",
    storyId: "aleppo-hospital-april-2016",
    contentId: "manual-breitbart-trump-speech",
    sourceId: null,
    keyTerms: ["America First", "false song of globalism", "nationalist", "foreign policy speech", "Mayflower Hotel", "Center for the National Interest", "Western democracies"],
    headline: "Donald Trump Rejects 'False Song of Globalism' in Nationalist 'America First' Foreign Policy Speech",
    toneScore: 0.7, // strongly favorable toward Trump
    framingType: "opinion", // advocacy journalism
    axisEconomic: -0.5,
    axisSpeech: null,
    axisProgressive: null,
    axisLiberalConservative: null,
    axisForeignPolicy: -0.7, // strongly isolationist
    firstPublishedAt: new Date("2016-04-27T00:00:00Z"),
    coverageOrder: "first-mover",
    comparisonNotes: "Covered Trump speech only — pure amplification. No critical voices whatsoever. Ted Cruz response omitted entirely (Fox included it). No mention of foreign leaders being concerned. DID include Trump's criticism of George W. Bush (which Fox omitted). Nearly all Trump quotes, no opposing perspective. Advocacy journalism, not news reporting.",
  }).onConflictDoNothing();

  console.log("  4 coverages created.\n");
  console.log("Aleppo story seeded. Run blindspot detection and claim classification next.");

  await client.end();
  process.exit(0);
}

seed().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});
