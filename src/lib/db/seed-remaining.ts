/**
 * Remaining 54 Pundits & Organizations Seed
 *
 * Fills the gap from 146 → 200.
 * Run with: npx tsx src/lib/db/seed-remaining.ts
 */

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

interface PunditSeed {
  id: string;
  name: string;
  slug: string;
  platforms: string[];
  currentLeaning: string;
  description: string;
  knownFor: string[];
  tags: string[];
}

const REMAINING: PunditSeed[] = [
  // ─── Missing Political Figures ────────────────────────────────
  { id: "gavin-newsom", name: "Gavin Newsom", slug: "gavin-newsom", platforms: ["other"], currentLeaning: "left", description: "Governor of California. Heavy media presence, frequent foil to Republican figures.", knownFor: ["Governor", "California"], tags: ["politician", "governor"] },
  { id: "ron-desantis", name: "Ron DeSantis", slug: "ron-desantis", platforms: ["other"], currentLeaning: "right", description: "Governor of Florida. Major conservative media presence.", knownFor: ["Governor", "Florida", "Presidential campaign"], tags: ["politician", "governor"] },
  { id: "marco-rubio", name: "Marco Rubio", slug: "marco-rubio", platforms: ["other"], currentLeaning: "right", description: "U.S. Senator and Secretary of State. Foreign policy hawk.", knownFor: ["Senate", "Secretary of State"], tags: ["politician", "senate", "foreign-policy"] },
  { id: "nikki-haley", name: "Nikki Haley", slug: "nikki-haley", platforms: ["other"], currentLeaning: "center-right", description: "Former UN Ambassador and presidential candidate. Post-campaign media presence.", knownFor: ["UN Ambassador", "Presidential campaign"], tags: ["politician", "diplomat"] },
  { id: "matt-gaetz", name: "Matt Gaetz", slug: "matt-gaetz", platforms: ["other", "podcast"], currentLeaning: "right", description: "Former U.S. Representative. Provocative media presence.", knownFor: ["Congress", "Controversy"], tags: ["politician", "controversial"] },
  { id: "rashida-tlaib", name: "Rashida Tlaib", slug: "rashida-tlaib", platforms: ["other"], currentLeaning: "left", description: "U.S. Representative. Progressive Squad member. Focus on Palestinian issues.", knownFor: ["Congress", "The Squad"], tags: ["politician", "progressive"] },
  { id: "josh-hawley", name: "Josh Hawley", slug: "josh-hawley", platforms: ["other"], currentLeaning: "right", description: "U.S. Senator. Populist conservative. Known for Jan 6 fist pump photo.", knownFor: ["Senate", "Populist conservative"], tags: ["politician", "senate", "populist"] },
  { id: "kari-lake", name: "Kari Lake", slug: "kari-lake", platforms: ["other"], currentLeaning: "right", description: "Former news anchor turned MAGA political figure.", knownFor: ["Arizona politics", "Election denial"], tags: ["politician", "media-figure"] },
  { id: "ro-khanna", name: "Ro Khanna", slug: "ro-khanna", platforms: ["other"], currentLeaning: "center-left", description: "U.S. Representative. Tech-focused progressive, frequent media appearances.", knownFor: ["Congress", "Silicon Valley"], tags: ["politician", "tech"] },
  { id: "adam-schiff", name: "Adam Schiff", slug: "adam-schiff", platforms: ["other"], currentLeaning: "left", description: "U.S. Senator. Former House Intelligence Committee chair. Central to Trump impeachment.", knownFor: ["Senate", "Impeachment", "Intelligence Committee"], tags: ["politician", "senate"] },

  // ─── Missing Journalists / Writers ────────────────────────────
  { id: "jesse-lee-peterson", name: "Jesse Lee Peterson", slug: "jesse-lee-peterson", platforms: ["youtube", "podcast"], currentLeaning: "right", description: "Conservative radio host and YouTube commentator.", knownFor: ["The Jesse Lee Peterson Show"], tags: ["youtube", "radio", "conservative"] },
  { id: "hugh-hewitt", name: "Hugh Hewitt", slug: "hugh-hewitt", platforms: ["podcast", "cable-news"], currentLeaning: "right", description: "Conservative radio host, MSNBC contributor, and author.", knownFor: ["The Hugh Hewitt Show", "MSNBC"], tags: ["radio", "conservative"] },
  { id: "erick-erickson", name: "Erick Erickson", slug: "erick-erickson", platforms: ["podcast", "substack"], currentLeaning: "right", description: "Conservative commentator. Founded The Resurgent. Former RedState editor.", knownFor: ["The Resurgent", "RedState"], tags: ["conservative", "blogger"] },
  { id: "josh-marshall", name: "Josh Marshall", slug: "josh-marshall", platforms: ["other"], currentLeaning: "left", description: "Founder of Talking Points Memo. Progressive political journalist.", knownFor: ["Talking Points Memo"], tags: ["journalist", "progressive", "blogger"] },
  { id: "byron-york", name: "Byron York", slug: "byron-york", platforms: ["other"], currentLeaning: "center-right", description: "Washington Examiner chief political correspondent.", knownFor: ["Washington Examiner"], tags: ["journalist", "conservative"] },
  { id: "jonathan-swan", name: "Jonathan Swan", slug: "jonathan-swan", platforms: ["newspaper"], currentLeaning: "center", description: "NYT reporter. Formerly Axios. Known for direct interview style.", knownFor: ["NYT", "Axios", "HBO Axios interviews"], tags: ["journalist", "nyt"] },
  { id: "robert-costa", name: "Robert Costa", slug: "robert-costa", platforms: ["cable-news", "newspaper"], currentLeaning: "center", description: "CBS News chief election correspondent. Formerly WaPo.", knownFor: ["CBS News", "Washington Post"], tags: ["journalist", "reporter"] },
  { id: "jonathan-karl", name: "Jonathan Karl", slug: "jonathan-karl", platforms: ["cable-news"], currentLeaning: "center", description: "ABC News chief Washington correspondent.", knownFor: ["ABC News", "White House"], tags: ["journalist", "abc"] },
  { id: "peter-baker", name: "Peter Baker", slug: "peter-baker", platforms: ["newspaper"], currentLeaning: "center", description: "NYT chief White House correspondent.", knownFor: ["NYT", "White House"], tags: ["journalist", "nyt", "white-house"] },
  { id: "jake-sherman", name: "Jake Sherman", slug: "jake-sherman", platforms: ["other"], currentLeaning: "center", description: "Co-founder of Punchbowl News. Capitol Hill insider.", knownFor: ["Punchbowl News", "Playbook"], tags: ["journalist", "capitol-hill"] },
  { id: "nellie-bowles", name: "Nellie Bowles", slug: "nellie-bowles", platforms: ["substack"], currentLeaning: "center", description: "Writer at The Free Press. Formerly NYT. TGIF newsletter.", knownFor: ["The Free Press", "TGIF", "NYT"], tags: ["journalist", "heterodox"] },
  { id: "glenn-loury", name: "Glenn Loury", slug: "glenn-loury", platforms: ["podcast", "substack"], currentLeaning: "center-right", description: "Economist and podcaster. Heterodox voice on race and public policy.", knownFor: ["The Glenn Show"], tags: ["podcast", "intellectual", "heterodox"] },
  { id: "briahna-joy-gray", name: "Briahna Joy Gray", slug: "briahna-joy-gray", platforms: ["youtube", "podcast"], currentLeaning: "left", description: "Political commentator. Former Bernie Sanders press secretary.", knownFor: ["Bad Faith podcast", "Rising"], tags: ["youtube", "progressive"] },
  { id: "kim-iversen", name: "Kim Iversen", slug: "kim-iversen", platforms: ["youtube"], currentLeaning: "center", description: "Independent political commentator. Formerly on The Hill's Rising.", knownFor: ["Kim Iversen Show", "Rising"], tags: ["youtube", "independent"] },
  { id: "michael-tracey", name: "Michael Tracey", slug: "michael-tracey", platforms: ["substack"], currentLeaning: "center", description: "Independent journalist. Contrarian perspectives on political events.", knownFor: ["Independent journalism"], tags: ["journalist", "independent", "contrarian"] },
  { id: "katie-halper", name: "Katie Halper", slug: "katie-halper", platforms: ["youtube", "podcast"], currentLeaning: "left", description: "Independent journalist and commentator. Formerly co-host of Useful Idiots.", knownFor: ["Useful Idiots", "Tara Reade interview"], tags: ["journalist", "progressive"] },
  { id: "theo-von", name: "Theo Von", slug: "theo-von", platforms: ["podcast", "youtube"], currentLeaning: "center", description: "Comedian and podcaster. Political crossover appeal. Major podcast audience.", knownFor: ["This Past Weekend"], tags: ["podcast", "comedy", "crossover"] },
  { id: "v-spehar", name: "V Spehar", slug: "v-spehar", platforms: ["other"], currentLeaning: "left", description: "TikTok news creator. Under the Desk News. Major Gen Z audience.", knownFor: ["Under the Desk News", "TikTok"], tags: ["tiktok", "news-creator", "gen-z"] },

  // ─── Missing Organizations ────────────────────────────────────
  { id: "epoch-times", name: "The Epoch Times", slug: "epoch-times", platforms: ["newspaper", "youtube"], currentLeaning: "right", description: "Right-leaning newspaper with ties to Falun Gong movement.", knownFor: ["The Epoch Times"], tags: ["newspaper", "organization", "right-leaning"] },
  { id: "the-new-yorker", name: "The New Yorker", slug: "the-new-yorker", platforms: ["other"], currentLeaning: "center-left", description: "Longform magazine. Literary and political journalism.", knownFor: ["The New Yorker", "Longform journalism"], tags: ["magazine", "organization", "longform"] },
  { id: "jacobin", name: "Jacobin", slug: "jacobin", platforms: ["other"], currentLeaning: "left", description: "Socialist magazine focused on politics, economics, and culture.", knownFor: ["Jacobin"], tags: ["magazine", "organization", "socialist"] },
  { id: "sky-news-australia", name: "Sky News Australia", slug: "sky-news-australia", platforms: ["youtube", "cable-news"], currentLeaning: "right", description: "Australian news channel with large YouTube presence. Right-leaning commentary.", knownFor: ["Sky News Australia", "YouTube"], tags: ["international", "organization", "conservative"] },
  { id: "al-jazeera", name: "Al Jazeera English", slug: "al-jazeera", platforms: ["cable-news", "youtube"], currentLeaning: "center-left", description: "Qatari-funded international news. Strong Middle East coverage.", knownFor: ["Al Jazeera"], tags: ["international", "organization"] },
  { id: "deutsche-welle", name: "Deutsche Welle", slug: "deutsche-welle", platforms: ["youtube"], currentLeaning: "center", description: "German public international broadcaster.", knownFor: ["DW News"], tags: ["international", "organization", "public-media"] },
  { id: "france24", name: "France 24", slug: "france24", platforms: ["youtube"], currentLeaning: "center", description: "French public international news channel.", knownFor: ["France 24"], tags: ["international", "organization", "public-media"] },
  { id: "snopes", name: "Snopes", slug: "snopes", platforms: ["other"], currentLeaning: "center", description: "Fact-checking website. One of the oldest online fact-checkers.", knownFor: ["Fact-checking"], tags: ["fact-check", "organization"] },
  { id: "politifact", name: "PolitiFact", slug: "politifact", platforms: ["other"], currentLeaning: "center", description: "Fact-checking organization. Truth-O-Meter ratings.", knownFor: ["PolitiFact", "Truth-O-Meter"], tags: ["fact-check", "organization"] },
  { id: "factcheck-org", name: "FactCheck.org", slug: "factcheck-org", platforms: ["other"], currentLeaning: "center", description: "Nonpartisan fact-checking project of the Annenberg Public Policy Center.", knownFor: ["FactCheck.org"], tags: ["fact-check", "organization", "academic"] },
  { id: "allsides", name: "AllSides", slug: "allsides", platforms: ["other"], currentLeaning: "center", description: "Media bias ratings organization. Competitor.", knownFor: ["Bias ratings", "Media balance"], tags: ["media-analysis", "organization", "competitor"] },
  { id: "media-bias-fact-check", name: "Media Bias/Fact Check", slug: "media-bias-fact-check", platforms: ["other"], currentLeaning: "center", description: "Media bias and factual accuracy ratings. Competitor.", knownFor: ["MBFC", "Bias ratings"], tags: ["media-analysis", "organization", "competitor"] },
  { id: "drudge-report", name: "Drudge Report", slug: "drudge-report", platforms: ["other"], currentLeaning: "center-right", description: "News aggregator. Historically right-leaning, shifted during Trump era.", knownFor: ["Drudge Report", "News aggregation"], tags: ["aggregator", "organization"] },
  { id: "salon", name: "Salon", slug: "salon", platforms: ["other"], currentLeaning: "left", description: "Left-leaning digital news and opinion.", knownFor: ["Salon"], tags: ["digital", "organization", "progressive"] },
  { id: "realclearpolitics", name: "RealClearPolitics", slug: "realclearpolitics", platforms: ["other"], currentLeaning: "center", description: "Political news aggregator and polling average tracker.", knownFor: ["RCP", "Polling averages"], tags: ["aggregator", "organization", "polling"] },
  { id: "daily-beast", name: "The Daily Beast", slug: "daily-beast", platforms: ["other"], currentLeaning: "left", description: "Left-leaning digital news and investigative reporting.", knownFor: ["The Daily Beast"], tags: ["digital", "organization", "progressive"] },
  { id: "turning-point-usa", name: "Turning Point USA", slug: "turning-point-usa", platforms: ["youtube", "other"], currentLeaning: "right", description: "Conservative youth organization and media operation. Founded by Charlie Kirk.", knownFor: ["TPUSA", "Charlie Kirk"], tags: ["organization", "conservative", "youth"] },
  { id: "prager-university", name: "PragerU", slug: "prager-university", platforms: ["youtube"], currentLeaning: "right", description: "Conservative educational media. Short-form video content.", knownFor: ["PragerU", "5-minute videos"], tags: ["youtube", "organization", "conservative", "education"] },
  { id: "los-angeles-times", name: "Los Angeles Times", slug: "los-angeles-times", platforms: ["newspaper"], currentLeaning: "center-left", description: "Major West Coast newspaper.", knownFor: ["LA Times"], tags: ["newspaper", "organization"] },
  { id: "the-guardian-us", name: "The Guardian (US)", slug: "the-guardian-us", platforms: ["other"], currentLeaning: "center-left", description: "British newspaper with growing US audience. Free access model.", knownFor: ["The Guardian"], tags: ["newspaper", "organization", "international"] },
  { id: "the-dispatch", name: "The Dispatch", slug: "the-dispatch", platforms: ["podcast", "substack"], currentLeaning: "center-right", description: "Center-right media outlet founded by Jonah Goldberg and Steve Hayes. Never-Trump conservative.", knownFor: ["The Dispatch", "The Remnant"], tags: ["digital", "organization", "never-trump"] },
  { id: "substack-platform", name: "Substack (platform)", slug: "substack-platform", platforms: ["other"], currentLeaning: "center", description: "Newsletter platform. Aggregated independent political writers.", knownFor: ["Substack"], tags: ["platform", "organization"] },
];

async function seedRemaining() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not set");

  const client = postgres(connectionString);
  const db = drizzle(client, { schema });

  console.log(`Seeding ${REMAINING.length} remaining pundits/organizations...\n`);

  let count = 0;
  for (const p of REMAINING) {
    try {
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
          externalLinks: [],
          tags: p.tags,
        })
        .onConflictDoNothing();
      count++;
    } catch (err) {
      console.error(`  Failed: ${p.name}`, err);
    }
  }

  console.log(`Done. ${count} entries inserted.`);
  await client.end();
  process.exit(0);
}

seedRemaining().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
