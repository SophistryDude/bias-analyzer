/**
 * Ownership Seed Script
 *
 * Populates corporate_parent, ownership_type, financial_interests, funding_sources
 * for major media organizations and independent pundits.
 *
 * Implements easy-wins #10 and #11. Schema fields were added in migration 0001.
 *
 * Run with: npm run db:seed-ownership
 *
 * Idempotent: uses UPDATE, so re-running overwrites with the latest values here.
 * Rows for pundit/org IDs that don't exist are silently skipped.
 */

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { eq } from "drizzle-orm";
import * as schema from "../src/lib/db/schema";

interface OwnershipRow {
  id: string;
  corporateParent: string | null;
  ownershipType:
    | "corporate"
    | "independent"
    | "nonprofit"
    | "state-funded"
    | "private-equity"
    | "family-trust";
  financialInterests: string[];
  fundingSources: string[];
  country?: string;
}

// ─── Major Organizations (easy-wins #10) ────────────────────────────
const ORGANIZATIONS: OwnershipRow[] = [
  {
    id: "cnn",
    corporateParent: "Warner Bros. Discovery",
    ownershipType: "corporate",
    financialInterests: [
      "WBD shareholder pressure",
      "advertiser sensitivity",
      "merger/acquisition cycles",
    ],
    fundingSources: ["advertising", "cable carriage fees", "streaming subscription (Max)"],
  },
  {
    id: "fox-news",
    corporateParent: "Fox Corporation",
    ownershipType: "corporate",
    financialInterests: [
      "Murdoch family control",
      "Dominion settlement exposure ($787.5M, 2023)",
      "Smartmatic litigation",
    ],
    fundingSources: ["advertising", "cable carriage fees"],
  },
  {
    id: "msnbc",
    corporateParent: "Comcast / NBCUniversal (spinning off to Versant)",
    ownershipType: "corporate",
    financialInterests: [
      "Comcast broadband/regulatory exposure",
      "pending spinoff to standalone Versant entity",
    ],
    fundingSources: ["advertising", "cable carriage fees"],
  },
  {
    id: "nyt",
    corporateParent: "The New York Times Company",
    ownershipType: "family-trust",
    financialInterests: [
      "Sulzberger family control via Class B supervoting shares",
      "subscription-driven model (~10M digital subs)",
    ],
    fundingSources: ["subscription", "advertising", "crossword/games/cooking verticals"],
  },
  {
    id: "washington-post",
    corporateParent: "Nash Holdings (Jeff Bezos)",
    ownershipType: "independent",
    financialInterests: [
      "Bezos ownership since 2013",
      "Amazon regulatory exposure (FTC, antitrust)",
      "Blue Origin government contracts",
      "2024 presidential endorsement killed by Bezos",
    ],
    fundingSources: ["subscription", "advertising"],
  },
  {
    id: "wsj",
    corporateParent: "News Corp",
    ownershipType: "corporate",
    financialInterests: ["Murdoch family control (same as Fox Corp)", "Dow Jones"],
    fundingSources: ["subscription", "advertising"],
  },
  {
    id: "ap-news",
    corporateParent: "Associated Press (cooperative)",
    ownershipType: "nonprofit",
    financialInterests: ["member newspaper dues", "content licensing to tech platforms"],
    fundingSources: ["member fees", "licensing", "grants"],
  },
  {
    id: "reuters",
    corporateParent: "Thomson Reuters Corporation",
    ownershipType: "corporate",
    financialInterests: [
      "Woodbridge (Thomson family) holding company",
      "financial terminal business dominates revenue",
    ],
    fundingSources: ["terminal subscriptions (Eikon)", "content licensing", "advertising"],
  },
  {
    id: "politico",
    corporateParent: "Axel Springer SE",
    ownershipType: "corporate",
    financialInterests: [
      "German conglomerate ownership since 2021 ($1B acquisition)",
      "Pro subscription tier (Capitol Hill insiders)",
    ],
    fundingSources: ["subscription (Politico Pro)", "advertising", "events"],
  },
  {
    id: "the-hill",
    corporateParent: "Nexstar Media Group",
    ownershipType: "corporate",
    financialInterests: [
      "Nexstar is largest US TV station owner",
      "broadcast-regulation exposure (FCC)",
    ],
    fundingSources: ["advertising"],
  },
  {
    id: "axios",
    corporateParent: "Cox Enterprises",
    ownershipType: "corporate",
    financialInterests: ["Cox family ownership", "acquired 2022 for $525M"],
    fundingSources: ["subscription (Pro)", "advertising", "events"],
  },
  {
    id: "vox",
    corporateParent: "Vox Media",
    ownershipType: "corporate",
    financialInterests: ["Penske Media investment", "Group Nine merger"],
    fundingSources: ["advertising", "subscription"],
  },
  {
    id: "huffpost",
    corporateParent: "BuzzFeed Inc.",
    ownershipType: "corporate",
    financialInterests: ["BuzzFeed acquired 2020", "shrinking ad-revenue model"],
    fundingSources: ["advertising"],
  },
  {
    id: "breitbart",
    corporateParent: "Breitbart News Network, LLC",
    ownershipType: "private-equity",
    financialInterests: [
      "Mercer family investment (Robert & Rebekah Mercer)",
      "Bannon former executive chairman",
    ],
    fundingSources: ["advertising", "Mercer family backing"],
  },
  {
    id: "daily-caller",
    corporateParent: "Daily Caller, Inc.",
    ownershipType: "independent",
    financialInterests: ["co-founded by Tucker Carlson (divested)", "Foster Friess investment"],
    fundingSources: ["advertising", "subscription"],
  },
  {
    id: "the-intercept",
    corporateParent: "First Look Media (Pierre Omidyar)",
    ownershipType: "nonprofit",
    financialInterests: [
      "Omidyar Network founder dependency",
      "Greenwald departure over Biden-story editing",
    ],
    fundingSources: ["Omidyar funding", "donations"],
  },
  {
    id: "the-federalist",
    corporateParent: "FDRLST Media",
    ownershipType: "independent",
    financialInterests: ["Ben Domenech / Sean Davis control"],
    fundingSources: ["advertising", "donations"],
  },
  {
    id: "national-review",
    corporateParent: "National Review Institute",
    ownershipType: "nonprofit",
    financialInterests: ["Buckley family legacy", "donor-driven conservative magazine"],
    fundingSources: ["subscription", "donations", "NRI institutional support"],
  },
  {
    id: "the-atlantic",
    corporateParent: "Emerson Collective (Laurene Powell Jobs)",
    ownershipType: "independent",
    financialInterests: [
      "Powell Jobs majority owner since 2017",
      "Emerson Collective invests in immigration/education causes",
    ],
    fundingSources: ["subscription", "advertising"],
  },
  {
    id: "daily-wire",
    corporateParent: "Daily Wire, LLC",
    ownershipType: "independent",
    financialInterests: [
      "co-founders Ben Shapiro, Jeremy Boreing control",
      "Tennessee oil/gas family (Farris, Wilks) early backers",
    ],
    fundingSources: ["subscription (DailyWire+)", "advertising", "merchandise"],
  },
  {
    id: "tyt-network",
    corporateParent: "TYT Network, Inc.",
    ownershipType: "independent",
    financialInterests: ["Cenk Uygur control", "member-supported model"],
    fundingSources: ["member subscription", "advertising", "YouTube revenue"],
  },
  {
    id: "meidas-touch-network",
    corporateParent: "MeidasTouch LLC (Meiselas family)",
    ownershipType: "independent",
    financialInterests: ["Ben Meiselas / brothers control"],
    fundingSources: ["advertising", "YouTube revenue", "merchandise"],
  },
  {
    id: "blaze-tv",
    corporateParent: "Blaze Media",
    ownershipType: "private-equity",
    financialInterests: [
      "Glenn Beck founder",
      "merged with CRTV 2018",
    ],
    fundingSources: ["subscription", "advertising"],
  },
  {
    id: "the-free-press",
    corporateParent: "The Free Press LLC",
    ownershipType: "independent",
    financialInterests: ["Bari Weiss founder/editor", "Substack-origin publication"],
    fundingSources: ["subscription", "events"],
  },
  {
    id: "crooked-media",
    corporateParent: "Crooked Media LLC",
    ownershipType: "independent",
    financialInterests: ["Favreau / Lovett / Vietor founders", "former Obama staff"],
    fundingSources: ["advertising", "subscription", "merchandise"],
  },
  {
    id: "npr",
    corporateParent: "National Public Radio, Inc.",
    ownershipType: "nonprofit",
    financialInterests: [
      "CPB federal funding (~1% direct, more via member stations)",
      "recurring Republican defund-NPR pushes",
    ],
    fundingSources: ["member station fees", "corporate underwriting", "donations", "CPB grants"],
  },
  {
    id: "pbs",
    corporateParent: "Public Broadcasting Service",
    ownershipType: "nonprofit",
    financialInterests: ["CPB federal funding", "member station model"],
    fundingSources: ["member station fees", "CPB grants", "corporate underwriting", "donations"],
  },
  {
    id: "bbc-news",
    corporateParent: "British Broadcasting Corporation",
    ownershipType: "state-funded",
    financialInterests: ["UK license fee (~£3.7B/yr)", "Royal Charter review cycle"],
    fundingSources: ["license fee", "BBC Studios commercial arm"],
    country: "UK",
  },
  {
    id: "al-jazeera",
    corporateParent: "Qatar Media Corporation",
    ownershipType: "state-funded",
    financialInterests: [
      "Qatari government ownership",
      "editorial independence contested",
    ],
    fundingSources: ["Qatari state funding"],
    country: "QA",
  },
  {
    id: "france24",
    corporateParent: "France Médias Monde",
    ownershipType: "state-funded",
    financialInterests: ["French state ownership via audiovisual tax"],
    fundingSources: ["French state budget"],
    country: "FR",
  },
  {
    id: "deutsche-welle",
    corporateParent: "Deutsche Welle (public broadcaster)",
    ownershipType: "state-funded",
    financialInterests: ["German federal budget funding"],
    fundingSources: ["German federal budget"],
    country: "DE",
  },
  {
    id: "epoch-times",
    corporateParent: "Epoch Media Group",
    ownershipType: "nonprofit",
    financialInterests: [
      "Falun Gong affiliation",
      "anti-CCP editorial line",
      "aggressive digital advertising history",
    ],
    fundingSources: ["subscription", "advertising", "donations"],
  },
  {
    id: "daily-beast",
    corporateParent: "IAC",
    ownershipType: "corporate",
    financialInterests: ["Barry Diller / IAC ownership"],
    fundingSources: ["advertising", "subscription"],
  },
  {
    id: "newsmax",
    corporateParent: "Newsmax Media",
    ownershipType: "independent",
    financialInterests: [
      "Chris Ruddy founder/CEO",
      "Smartmatic litigation exposure",
    ],
    fundingSources: ["advertising", "cable carriage fees", "subscription"],
  },
  {
    id: "oan",
    corporateParent: "Herring Networks",
    ownershipType: "independent",
    financialInterests: [
      "Herring family ownership",
      "dropped by major carriers (DirecTV, Verizon)",
      "defamation litigation exposure",
    ],
    fundingSources: ["advertising", "shrinking cable carriage"],
  },
];

// ─── Individual Pundits' Platform Affiliations (easy-wins #11) ──────
const PUNDITS: OwnershipRow[] = [
  {
    id: "ben-shapiro",
    corporateParent: "Daily Wire (co-founder)",
    ownershipType: "independent",
    financialInterests: [
      "Daily Wire co-founder and equity holder",
      "DailyWire+ subscription dependency",
    ],
    fundingSources: ["Daily Wire salary/equity", "book royalties", "speaking fees"],
  },
  {
    id: "matt-walsh",
    corporateParent: "Daily Wire",
    ownershipType: "independent",
    financialInterests: ["Daily Wire host (employed)", "What Is a Woman? film revenue"],
    fundingSources: ["Daily Wire salary", "book royalties"],
  },
  {
    id: "michael-knowles",
    corporateParent: "Daily Wire",
    ownershipType: "independent",
    financialInterests: ["Daily Wire host (employed)"],
    fundingSources: ["Daily Wire salary"],
  },
  {
    id: "jordan-peterson",
    corporateParent: "Daily Wire+",
    ownershipType: "independent",
    financialInterests: [
      "Daily Wire+ content deal",
      "Peterson Academy launch",
      "independent book/speaking income",
    ],
    fundingSources: ["Daily Wire deal", "book royalties", "speaking fees", "Peterson Academy"],
  },
  {
    id: "steven-crowder",
    corporateParent: "Louder with Crowder / Mug Club (independent)",
    ownershipType: "independent",
    financialInterests: [
      "independent after public Daily Wire dispute",
      "Mug Club subscription revenue",
      "Rumble platform relationship",
    ],
    fundingSources: ["Mug Club subscription", "advertising", "Rumble revenue"],
  },
  {
    id: "tim-pool",
    corporateParent: "Timcast Media (independent)",
    ownershipType: "independent",
    financialInterests: [
      "independent operation",
      "Tenet Media indictment exposure (allegedly received Russian-funded content)",
    ],
    fundingSources: ["YouTube revenue", "membership", "advertising"],
  },
  {
    id: "tucker-carlson",
    corporateParent: "Tucker Carlson Network (independent)",
    ownershipType: "independent",
    financialInterests: [
      "independent after Fox News termination 2023",
      "TCN subscription launch",
      "Dubai and foreign trip funding questions",
    ],
    fundingSources: ["TCN subscription", "advertising", "interview revenue"],
  },
  {
    id: "candace-owens",
    corporateParent: "independent (post Daily Wire)",
    ownershipType: "independent",
    financialInterests: [
      "independent since March 2024 Daily Wire departure",
      "YouTube demonetization/restrictions",
    ],
    fundingSources: ["subscription", "advertising", "sponsorships"],
  },
  {
    id: "dave-rubin",
    corporateParent: "Rubin Report / BlazeTV",
    ownershipType: "independent",
    financialInterests: ["BlazeTV deal", "Locals platform equity (Rumble-owned)"],
    fundingSources: ["BlazeTV", "Locals subscription", "advertising"],
  },
  {
    id: "glenn-beck",
    corporateParent: "Blaze Media (founder)",
    ownershipType: "independent",
    financialInterests: ["Blaze Media founder and controlling interest"],
    fundingSources: ["Blaze Media salary/equity", "book royalties"],
  },
  {
    id: "dennis-prager",
    corporateParent: "PragerU (co-founder)",
    ownershipType: "nonprofit",
    financialInterests: [
      "PragerU 501(c)(3) nonprofit",
      "Wilks family major donor",
      "Dan and Farris Wilks oil/gas wealth",
    ],
    fundingSources: ["PragerU donations", "radio syndication", "book royalties"],
  },
  {
    id: "charlie-kirk",
    corporateParent: "Turning Point USA",
    ownershipType: "nonprofit",
    financialInterests: ["TPUSA nonprofit (501(c)(3) + 501(c)(4))", "GOP donor network"],
    fundingSources: ["TPUSA donations", "speaking fees", "book royalties"],
  },
  {
    id: "dan-bongino",
    corporateParent: "Fox News / Cumulus Media (radio)",
    ownershipType: "corporate",
    financialInterests: [
      "Fox News contributor",
      "Cumulus syndicated radio (Rush Limbaugh slot successor)",
      "Rumble equity",
    ],
    fundingSources: ["Fox News salary", "Cumulus radio", "Rumble equity"],
  },
  {
    id: "rachel-maddow",
    corporateParent: "MSNBC / Comcast",
    ownershipType: "corporate",
    financialInterests: [
      "MSNBC Monday-only contract (~$30M/yr)",
      "spinoff to Versant creates contract re-negotiation moment",
    ],
    fundingSources: ["MSNBC salary", "book royalties", "podcast revenue"],
  },
  {
    id: "joy-reid",
    corporateParent: "MSNBC / Comcast (show cancelled 2025)",
    ownershipType: "corporate",
    financialInterests: ["MSNBC ReidOut show cancelled Feb 2025"],
    fundingSources: ["MSNBC salary", "book royalties"],
  },
  {
    id: "chris-hayes",
    corporateParent: "MSNBC / Comcast",
    ownershipType: "corporate",
    financialInterests: ["MSNBC primetime host", "podcast revenue"],
    fundingSources: ["MSNBC salary", "book royalties", "podcast"],
  },
  {
    id: "lawrence-odonnell",
    corporateParent: "MSNBC / Comcast",
    ownershipType: "corporate",
    financialInterests: ["MSNBC primetime host"],
    fundingSources: ["MSNBC salary"],
  },
  {
    id: "sean-hannity",
    corporateParent: "Fox News / Fox Corp",
    ownershipType: "corporate",
    financialInterests: [
      "Fox News primetime host",
      "Premiere Networks radio",
      "longest-tenured cable primetime host",
    ],
    fundingSources: ["Fox salary", "radio syndication"],
  },
  {
    id: "laura-ingraham",
    corporateParent: "Fox News / Fox Corp",
    ownershipType: "corporate",
    financialInterests: ["Fox News primetime host"],
    fundingSources: ["Fox salary", "book royalties"],
  },
  {
    id: "jesse-watters",
    corporateParent: "Fox News / Fox Corp",
    ownershipType: "corporate",
    financialInterests: ["Fox News primetime host (inherited Carlson slot)"],
    fundingSources: ["Fox salary", "book royalties"],
  },
  {
    id: "greg-gutfeld",
    corporateParent: "Fox News / Fox Corp",
    ownershipType: "corporate",
    financialInterests: ["Gutfeld!", "The Five co-host"],
    fundingSources: ["Fox salary", "book royalties"],
  },
  {
    id: "jake-tapper",
    corporateParent: "CNN / Warner Bros. Discovery",
    ownershipType: "corporate",
    financialInterests: ["CNN lead anchor"],
    fundingSources: ["CNN salary", "book royalties"],
  },
  {
    id: "anderson-cooper",
    corporateParent: "CNN / Warner Bros. Discovery",
    ownershipType: "corporate",
    financialInterests: ["CNN primetime", "60 Minutes correspondent"],
    fundingSources: ["CNN salary", "CBS salary", "book royalties"],
  },
  {
    id: "kaitlan-collins",
    corporateParent: "CNN / Warner Bros. Discovery",
    ownershipType: "corporate",
    financialInterests: ["CNN primetime"],
    fundingSources: ["CNN salary"],
  },
  {
    id: "cenk-uygur",
    corporateParent: "The Young Turks (co-founder)",
    ownershipType: "independent",
    financialInterests: ["TYT co-founder and majority owner", "Justice Democrats co-founder"],
    fundingSources: ["TYT member subscription", "advertising", "YouTube revenue"],
  },
  {
    id: "ana-kasparian",
    corporateParent: "The Young Turks",
    ownershipType: "independent",
    financialInterests: ["TYT co-host (employee/equity partner)"],
    fundingSources: ["TYT salary"],
  },
  {
    id: "david-pakman",
    corporateParent: "The David Pakman Show (independent)",
    ownershipType: "independent",
    financialInterests: ["solo independent operation"],
    fundingSources: ["YouTube revenue", "membership", "advertising"],
  },
  {
    id: "hasan-piker",
    corporateParent: "Twitch (independent streamer)",
    ownershipType: "independent",
    financialInterests: [
      "Twitch partnership (Amazon-owned)",
      "former TYT contributor",
    ],
    fundingSources: ["Twitch subscription/bits", "YouTube revenue", "sponsorships"],
  },
  {
    id: "philip-defranco",
    corporateParent: "Rogue Rocket Media (independent)",
    ownershipType: "independent",
    financialInterests: ["Rogue Rocket Media owner"],
    fundingSources: ["YouTube revenue", "advertising", "merchandise"],
  },
  {
    id: "joe-rogan",
    corporateParent: "Spotify exclusive (as of 2020, non-exclusive as of 2024)",
    ownershipType: "independent",
    financialInterests: [
      "original Spotify deal ~$200M",
      "renewed 2024 non-exclusive for ~$250M",
      "world's largest podcast audience",
    ],
    fundingSources: ["Spotify licensing", "advertising", "YouTube revenue"],
  },
  {
    id: "megyn-kelly",
    corporateParent: "The Megyn Kelly Show (SiriusXM, independent)",
    ownershipType: "independent",
    financialInterests: ["SiriusXM deal", "YouTube independent distribution"],
    fundingSources: ["SiriusXM salary", "YouTube revenue", "advertising"],
  },
  {
    id: "bill-maher",
    corporateParent: "HBO / Warner Bros. Discovery",
    ownershipType: "corporate",
    financialInterests: ["Real Time (HBO)", "Club Random (independent podcast)"],
    fundingSources: ["HBO salary", "podcast advertising"],
  },
  {
    id: "matt-taibbi",
    corporateParent: "Racket News (Substack)",
    ownershipType: "independent",
    financialInterests: ["solo Substack", "Twitter Files co-reporter"],
    fundingSources: ["Substack subscription"],
  },
  {
    id: "glenn-greenwald",
    corporateParent: "System Update / Rumble",
    ownershipType: "independent",
    financialInterests: [
      "Rumble platform relationship",
      "left The Intercept 2020 over Biden-story editing dispute",
    ],
    fundingSources: ["Rumble deal", "subscription", "book royalties"],
  },
  {
    id: "bari-weiss",
    corporateParent: "The Free Press (founder)",
    ownershipType: "independent",
    financialInterests: ["Free Press founder", "Substack-origin"],
    fundingSources: ["Free Press subscription", "events"],
  },
  {
    id: "nate-silver",
    corporateParent: "Silver Bulletin (Substack)",
    ownershipType: "independent",
    financialInterests: [
      "left FiveThirtyEight/ABC 2023",
      "Polymarket advisory role",
    ],
    fundingSources: ["Substack subscription", "Polymarket advisory"],
  },
  {
    id: "ezra-klein",
    corporateParent: "The New York Times",
    ownershipType: "corporate",
    financialInterests: ["NYT columnist and podcast host"],
    fundingSources: ["NYT salary", "book royalties"],
  },
  {
    id: "tulsi-gabbard",
    corporateParent: "DNI (US government)",
    ownershipType: "state-funded",
    financialInterests: ["Director of National Intelligence (2025-)"],
    fundingSources: ["federal government salary"],
  },
  {
    id: "vivek-ramaswamy",
    corporateParent: "Roivant Sciences / Strive Asset Management (founder)",
    ownershipType: "independent",
    financialInterests: [
      "Roivant Sciences founder (biotech)",
      "Strive anti-ESG asset manager",
    ],
    fundingSources: ["Roivant equity", "Strive equity"],
  },
  {
    id: "elon-musk",
    corporateParent: "Tesla / SpaceX / X Corp (controlling owner)",
    ownershipType: "independent",
    financialInterests: [
      "Tesla CEO",
      "SpaceX CEO",
      "X (formerly Twitter) owner",
      "xAI founder",
      "DOGE government role 2025",
      "~$1T net worth (volatile)",
    ],
    fundingSources: ["Tesla equity", "SpaceX equity", "X revenue", "government contracts"],
  },
  {
    id: "rfk-jr",
    corporateParent: "HHS (US government)",
    ownershipType: "state-funded",
    financialInterests: [
      "HHS Secretary (2025-)",
      "Children's Health Defense founder (on leave)",
      "family trust income",
    ],
    fundingSources: ["federal government salary", "Kennedy family trusts"],
  },
];

// ─── Apply ──────────────────────────────────────────────────────────
async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }

  const client = postgres(connectionString);
  const db = drizzle(client, { schema });

  const allRows = [...ORGANIZATIONS, ...PUNDITS];
  console.log(
    `Seeding ownership data: ${ORGANIZATIONS.length} organizations + ${PUNDITS.length} pundits = ${allRows.length} rows.\n`,
  );

  let updated = 0;
  let skipped = 0;

  for (const row of allRows) {
    const existing = await db
      .select({ id: schema.pundits.id })
      .from(schema.pundits)
      .where(eq(schema.pundits.id, row.id))
      .limit(1);

    if (existing.length === 0) {
      console.log(`  SKIP ${row.id} (not in pundits table — run db:seed-200 first)`);
      skipped++;
      continue;
    }

    await db
      .update(schema.pundits)
      .set({
        corporateParent: row.corporateParent,
        ownershipType: row.ownershipType,
        financialInterests: row.financialInterests,
        fundingSources: row.fundingSources,
        country: row.country ?? "US",
        updatedAt: new Date(),
      })
      .where(eq(schema.pundits.id, row.id));

    console.log(`  OK   ${row.id} → ${row.corporateParent ?? "(independent)"}`);
    updated++;
  }

  console.log(`\nDone. Updated ${updated}, skipped ${skipped}.`);
  await client.end();
  process.exit(0);
}

main().catch((err) => {
  console.error("Ownership seed failed:", err);
  process.exit(1);
});
