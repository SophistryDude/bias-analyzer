/**
 * End-to-end LLM smoke test — Aleppo case study.
 *
 * Runs the three tasks from docs/easy-wins.md in sequence:
 *
 *   #17 — Full analysis pipeline (rule engine + LLM enhancement) on one article
 *   #19 — Claim extraction + omission detection across the 4 Aleppo articles
 *   #18 — Story-comparison blog post draft
 *
 * Requires ANTHROPIC_API_KEY in .env.local. Run with:
 *
 *   npx tsx scripts/smoke-llm-pipeline.ts             # all three phases
 *   npx tsx scripts/smoke-llm-pipeline.ts --only=17
 *   npx tsx scripts/smoke-llm-pipeline.ts --only=19
 *   npx tsx scripts/smoke-llm-pipeline.ts --only=18
 *
 * The script assumes scripts/seed-aleppo-story.ts has already been run.
 * It does NOT overwrite existing analyses/claims/blog posts — each phase
 * inserts new rows tagged with a timestamped id, so it is safe to re-run.
 */

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import {
  configureLLMFromEnv,
  isLLMConfigured,
  extractClaims,
  detectOmissions,
} from "../src/lib/llm/analyze";
import { AnthropicProvider } from "../src/lib/llm/providers/anthropic";
import { configureBlogGenerator, generateStoryComparisonPost } from "../src/lib/blog/generator";
import { runAnalysis } from "../src/lib/pipeline/analyzer";
import { saveAnalysis } from "../src/lib/db/repositories/analyses";
import { createClaim, addSourceClaim, getOmissionReport } from "../src/lib/db/repositories/claims";
import type { ContentItem } from "../src/lib/models/types";
import type { StoryComparisonData } from "../src/lib/blog/templates";

// ─── Representative Aleppo article excerpts ─────────────────────────
// These are condensed from the real 2016-04-27/28 articles — enough
// substance for the LLM to extract meaningful claims and framing.

interface AleppoArticle {
  contentId: string; // must match seed-aleppo-story.ts
  coverageId: string; // must match seed-aleppo-story.ts
  sourceName: string;
  headline: string;
  text: string;
}

const ALEPPO_ARTICLES: AleppoArticle[] = [
  {
    contentId: "manual-cnn-aleppo",
    coverageId: "coverage-cnn-aleppo-2016",
    sourceName: "CNN",
    headline:
      "Kerry expresses outrage after 50 killed in strike on Syrian hospital",
    text: `An airstrike on a pediatric hospital in Syria has killed at least 50 people, rights and humanitarian groups say, and Secretary of State John Kerry expressed outrage over the attack. The Al Quds field hospital in rebel-held Aleppo was hit by a missile from a fighter jet Wednesday, witnesses said. Doctors Without Borders (MSF) said at least 50 were killed, while the Syrian Observatory for Human Rights put the toll at 27. "It appears to have been a deliberate strike on a known medical facility and follows the Assad regime's appalling record of striking such facilities," Kerry said. What we know, one analyst told CNN, is that it is the Syrian government that has been usually using these barrel bombs in the past. The United Nations warns that the situation in Aleppo has become "catastrophic" amid intensified fighting, and the cessation of hostilities agreement is collapsing. Doctors Without Borders condemned the strike. "Where is the outrage among those with the power and obligation to stop this carnage?" the organization asked. Russia's Defense Ministry issued a statement saying it had not carried out the strike. Syria's state-run SANA news agency ran a statement denying that government planes were responsible.`,
  },
  {
    contentId: "manual-nyt-aleppo",
    coverageId: "coverage-nyt-aleppo-2016",
    sourceName: "The New York Times",
    headline: "Divided Aleppo Plunges Back Into War as Syrian Hospital Is Hit",
    text: `The divided city of Aleppo plunged back into all-out war this week as Syrian government airstrikes destroyed Al Quds hospital in insurgent-held territory and retaliatory rebel mortar assaults killed civilians in government-held neighborhoods. At least 27 people died at Al Quds, a Doctors Without Borders-supported facility, according to the Syrian Observatory for Human Rights; MSF cited a higher figure. At least 14 people, mostly civilians, were killed in mortar attacks on government-controlled areas, including at Al Razi hospital on the government side of the front line, Syrian state media reported. Jan Egeland, a senior U.N. humanitarian adviser, warned that the cessation of hostilities was hanging "by a thread" and that civilians on both sides of the front were paying the price. The Times reported from both sides of the front line, naming victims at Al Quds and at Al Razi. The Assad government and opposition factions traded blame for the collapse of the February truce. Doctors Without Borders said the attack on Al Quds was deliberate; Syrian and Russian officials denied responsibility.`,
  },
  {
    contentId: "manual-fox-trump-speech",
    coverageId: "coverage-fox-aleppo-2016",
    sourceName: "Fox News",
    headline:
      "Trump calls for US foreign policy shake-up, no more 'nation-building'",
    text: `Presumptive Republican nominee Donald Trump called Wednesday for a drastic shake-up in America's foreign policy — including "getting out of the nation-building business" — in a speech delivered from a teleprompter at the Mayflower Hotel in Washington. "America First will be the major and overriding theme of my administration," Trump said. He stood by his controversial stance on NATO allies, complaining only four other member countries besides the U.S. spend the minimum 2 percent of GDP on defense. "Our friends and enemies must know that if I draw a line in the sand, I will enforce it," Trump said. He promised that "ISIS will be gone if I'm elected president." Sen. Ted Cruz, still in the primary race, responded that Trump's speech sounded like it was "written by a high school student." Foreign leaders told the Associated Press they were "stunned" by the speech's lack of detail. Trump said it was time to "shake the rust off" American foreign policy.`,
  },
  {
    contentId: "manual-breitbart-trump-speech",
    coverageId: "coverage-breitbart-aleppo-2016",
    sourceName: "Breitbart",
    headline:
      "Donald Trump Rejects 'False Song of Globalism' in Nationalist 'America First' Foreign Policy Speech",
    text: `Donald Trump delivered a landmark nationalist foreign policy address at the Mayflower Hotel, hosted by the Center for the National Interest, declaring: "We will no longer surrender this country, or its people, to the false song of globalism." "Both our friends and enemies put their countries above ours and we, while being fair to them, must do the same," Trump said. Trump criticized the foreign policy record of George W. Bush, saying decades of intervention had destabilized the Middle East and left America weaker. "America First will be the major and overriding theme of my administration," he declared to sustained applause. He promised renewed strength against ISIS and an end to what he called the naive nation-building of prior administrations. The speech was hailed by supporters as the clearest articulation yet of a nationalist alternative to the globalist consensus that has dominated Western democracies for a generation.`,
  },
];

// ─── Helpers ────────────────────────────────────────────────────────

function toContentItem(a: AleppoArticle): ContentItem {
  return {
    // Unique per run so we never conflict with the seeded row (different PK)
    id: `smoke-${a.contentId}-${Date.now()}`,
    title: a.headline,
    url: `https://example.invalid/${a.contentId}`,
    contentType: "article",
    // Empty → saveAnalysis() coerces to null, avoiding the pundits FK check
    sourceId: "",
    sourceName: a.sourceName,
    publishedAt: "2016-04-28T00:00:00Z",
    ingestedAt: new Date().toISOString(),
    rawText: a.text,
    wordCount: a.text.split(/\s+/).length,
    metadata: { ingestSource: "smoke-test" },
  };
}

function parseArgs(): { only: string | null } {
  const arg = process.argv.find((a) => a.startsWith("--only="));
  return { only: arg ? arg.split("=")[1] : null };
}

// ─── Phase #17 — Run full pipeline with LLM on one article ──────────

async function phase17(): Promise<void> {
  console.log("\n=== #17 — Full analysis pipeline on CNN Aleppo article ===\n");

  const cnn = ALEPPO_ARTICLES[0];
  const content = toContentItem(cnn);

  console.log(`Input: ${content.sourceName} — "${content.title}"`);
  console.log(`Word count: ${content.wordCount}`);
  console.log(`LLM configured: ${isLLMConfigured()}\n`);

  const analysis = await runAnalysis(content);

  console.log(`✓ Analysis complete (llmEnhanced=${analysis.llmEnhanced})`);
  console.log(`  Manipulation score: ${analysis.manipulationScore}/100`);
  console.log(`  Bias leaning: ${analysis.biasAssessment.overallLeaning}`);
  console.log(`  Tone score: ${analysis.biasAssessment.toneScore.toFixed(2)}`);
  console.log(`  Balance score: ${analysis.biasAssessment.balanceScore.toFixed(2)}`);
  console.log(`  Fallacies: ${analysis.fallacyDetections.length}`);
  for (const f of analysis.fallacyDetections) {
    console.log(`    - ${f.fallacyName} (${(f.confidence * 100).toFixed(0)}%)`);
  }
  console.log(`  Reframing: ${analysis.reframingDetections.length}`);
  for (const r of analysis.reframingDetections) {
    console.log(`    - ${r.techniqueName} (${(r.confidence * 100).toFixed(0)}%)`);
  }
  console.log(`\n  Overall: ${analysis.overallAssessment}\n`);

  try {
    await saveAnalysis(content, analysis);
    console.log(`  Persisted analysis id=${analysis.id}\n`);
  } catch (err) {
    const e = err as Error & { code?: string; detail?: string; constraint?: string; column?: string; table?: string; cause?: unknown };
    console.error(`  (persist skipped)`);
    console.error(`    message: ${e.message}`);
    if (e.code) console.error(`    pg code: ${e.code}`);
    if (e.detail) console.error(`    pg detail: ${e.detail}`);
    if (e.table) console.error(`    pg table: ${e.table}`);
    if (e.column) console.error(`    pg column: ${e.column}`);
    if (e.constraint) console.error(`    pg constraint: ${e.constraint}`);
    if (e.cause) console.error(`    cause:`, e.cause);
    console.error("");
  }
}

// ─── Phase #19 — Claim extraction + omission detection ──────────────

interface ExtractedForSource {
  article: AleppoArticle;
  claims: {
    statement: string;
    sourceWording: string;
    claimType: string;
    significance: string;
    verifiability: string;
    attributedTo?: string;
  }[];
}

async function phase19(): Promise<ExtractedForSource[]> {
  console.log("\n=== #19 — Claim extraction + omission detection ===\n");

  const extracted: ExtractedForSource[] = [];

  // Step 1: extract claims from each article
  for (const article of ALEPPO_ARTICLES) {
    console.log(`Extracting claims from ${article.sourceName}...`);
    const result = await extractClaims({
      text: article.text,
      title: article.headline,
      sourceName: article.sourceName,
      storyContext:
        "April 2016 — simultaneous Al Quds hospital airstrike in rebel-held Aleppo and Trump's 'America First' foreign policy speech at the Mayflower Hotel.",
    });
    if (!result) {
      console.error("  extractClaims returned null — aborting phase 19");
      return extracted;
    }
    console.log(`  ${result.claims.length} claims extracted`);
    extracted.push({ article, claims: result.claims });
  }

  // Step 2: build a master claim list, merging near-duplicates by statement
  interface MasterClaim {
    id: string;
    statement: string;
    claimType: string;
    significance: string;
    verifiability: string;
    foundIn: Set<string>;
    wordingBySource: Record<string, string>;
    attributedBySource: Record<string, string | undefined>;
  }

  const masterList: MasterClaim[] = [];
  const norm = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^a-z0-9 ]/g, "")
      .replace(/\s+/g, " ")
      .trim();

  for (const { article, claims: cs } of extracted) {
    for (const c of cs) {
      const key = norm(c.statement);
      let existing = masterList.find((m) => {
        const mKey = norm(m.statement);
        // merge if one is substring of the other or >70% token overlap
        if (mKey.includes(key) || key.includes(mKey)) return true;
        const a = new Set(key.split(" "));
        const b = new Set(mKey.split(" "));
        const inter = [...a].filter((x) => b.has(x)).length;
        const union = new Set([...a, ...b]).size;
        return inter / union > 0.7;
      });
      if (!existing) {
        existing = {
          id: `claim-aleppo-${masterList.length + 1}`,
          statement: c.statement,
          claimType: c.claimType,
          significance: c.significance,
          verifiability: c.verifiability,
          foundIn: new Set(),
          wordingBySource: {},
          attributedBySource: {},
        };
        masterList.push(existing);
      }
      existing.foundIn.add(article.sourceName);
      existing.wordingBySource[article.sourceName] = c.sourceWording;
      existing.attributedBySource[article.sourceName] = c.attributedTo;
    }
  }

  console.log(
    `\nMaster claim list: ${masterList.length} distinct claims (from ${extracted.reduce((s, e) => s + e.claims.length, 0)} raw extractions)\n`
  );

  // Step 3: persist master claims FIRST so source_claims FKs resolve
  console.log(`Persisting ${masterList.length} master claims...`);
  for (const m of masterList) {
    try {
      await createClaim({
        id: m.id,
        storyId: "aleppo-hospital-april-2016",
        statement: m.statement,
        claimType: m.claimType,
        significance: m.significance,
        verifiability: m.verifiability,
      });
    } catch (err) {
      console.error(`  (claim insert failed: ${(err as Error).message})`);
    }
  }
  console.log("  Done.\n");

  // Step 4: run omission detection per source
  const omissionReports: Record<string, { completeness: number; pattern: string; keyOmissions: string[] }> = {};

  for (const { article, claims: sourceCs } of extracted) {
    console.log(`Detecting omissions for ${article.sourceName}...`);
    const result = await detectOmissions({
      sourceName: article.sourceName,
      sourceClaims: sourceCs.map((c) => ({
        statement: c.statement,
        sourceWording: c.sourceWording,
        claimType: c.claimType,
      })),
      allClaims: masterList.map((m) => ({
        statement: m.statement,
        claimType: m.claimType,
        significance: m.significance,
        foundIn: [...m.foundIn],
      })),
      storyDescription:
        "April 2016 — Al Quds hospital airstrike in rebel-held Aleppo and Trump's Mayflower 'America First' foreign policy speech.",
    });
    if (!result) {
      console.error("  detectOmissions returned null — skipping persistence for this source");
      continue;
    }
    console.log(
      `  completeness=${(result.completenessScore * 100).toFixed(0)}% | omissions=${result.keyOmissions.length}`
    );
    omissionReports[article.sourceName] = {
      completeness: result.completenessScore,
      pattern: result.omissionPattern,
      keyOmissions: result.keyOmissions,
    };

    // Persist source_claims rows for this coverage
    for (const r of result.results) {
      const master = masterList.find(
        (m) => norm(m.statement) === norm(r.claimStatement) || norm(m.statement).includes(norm(r.claimStatement)) || norm(r.claimStatement).includes(norm(m.statement))
      );
      if (!master) continue;
      try {
        await addSourceClaim({
          id: `${master.id}-${article.coverageId}`,
          claimId: master.id,
          coverageId: article.coverageId,
          status: r.status,
          sourceWording: master.wordingBySource[article.sourceName],
          wordingDivergence: r.wordingDivergence ?? undefined,
          divergentDetail: r.explanation,
          attributedTo: master.attributedBySource[article.sourceName],
        });
      } catch (err) {
        // likely FK or dup — keep going
        console.error(`    (source_claim insert failed: ${(err as Error).message})`);
      }
    }
  }

  // Step 5: print omission summary
  console.log(`\n--- Omission Summary ---`);
  for (const [source, rep] of Object.entries(omissionReports)) {
    console.log(`\n${source} — ${(rep.completeness * 100).toFixed(0)}% complete`);
    console.log(`  Pattern: ${rep.pattern}`);
    console.log(`  Key omissions:`);
    for (const k of rep.keyOmissions) console.log(`    - ${k}`);
  }

  // Step 6: reconcile against DB
  console.log(`\n--- DB omission report (from getOmissionReport) ---`);
  for (const article of ALEPPO_ARTICLES) {
    try {
      const rep = await getOmissionReport(
        "aleppo-hospital-april-2016",
        article.coverageId
      );
      console.log(
        `  ${article.sourceName}: ${rep.included} included / ${rep.omitted} omitted / completeness=${(rep.completenessScore * 100).toFixed(0)}%`
      );
    } catch (err) {
      console.error(`  ${article.sourceName}: ${(err as Error).message}`);
    }
  }

  return extracted;
}

// ─── Phase #18 — Story comparison blog post draft ───────────────────

async function phase18(extracted: ExtractedForSource[] | null): Promise<void> {
  console.log("\n=== #18 — Story comparison blog post draft ===\n");

  // Build StoryComparisonData from seeded coverage data (fallback to inline)
  const coverages: StoryComparisonData["coverages"] = ALEPPO_ARTICLES.map(
    (a) => {
      const sourceExtracted =
        extracted?.find((e) => e.article.contentId === a.contentId)?.claims ??
        [];
      const keyTerms = sourceExtracted
        .map((c) => c.statement.split(" ").slice(0, 4).join(" "))
        .slice(0, 8);
      return {
        sourceName: a.sourceName,
        headline: a.headline,
        toneScore: null,
        framingType: null,
        keyTerms,
      };
    }
  );

  const storyData: StoryComparisonData = {
    storyTitle: "Aleppo Hospital Airstrike & Trump Foreign Policy Speech",
    storyDescription:
      "Two simultaneous events on April 27, 2016: Al Quds hospital in rebel-held Aleppo destroyed by airstrike, and Trump's 'America First' speech at the Mayflower Hotel. Coverage patterns reveal editorial selection — which event each outlet treated as the day's story.",
    occurredAt: "2016-04-27",
    coverages,
    sharedTerms: [],
    uniqueTermsBySource: {},
    toneSpread: null,
  };

  const post = await generateStoryComparisonPost(storyData);
  if (!post) {
    console.error("  generateStoryComparisonPost returned null — blog generator may not be configured");
    return;
  }
  console.log(`✓ Draft created`);
  console.log(`  Title: ${post.title}`);
  console.log(`  Slug: ${post.slug}`);
  console.log(`  Excerpt: ${post.excerpt}`);
  console.log(`  Content length: ${post.content.length} chars`);
  console.log(`\n--- First 500 chars of draft body ---\n${post.content.slice(0, 500)}\n`);
}

// ─── Main ───────────────────────────────────────────────────────────

async function main() {
  const { only } = parseArgs();

  if (!configureLLMFromEnv()) {
    console.error("ANTHROPIC_API_KEY is not set in .env.local. Aborting.");
    process.exit(1);
  }
  // Also wire the blog generator to the same provider.
  const provider = new AnthropicProvider({
    apiKey: process.env.ANTHROPIC_API_KEY!,
    model: process.env.LLM_MODEL,
    maxTokens: process.env.LLM_MAX_TOKENS
      ? Number(process.env.LLM_MAX_TOKENS)
      : undefined,
  });
  configureBlogGenerator(provider);

  console.log(`LLM wired. model=${process.env.LLM_MODEL ?? "(default)"}\n`);

  let extracted: ExtractedForSource[] | null = null;

  if (!only || only === "17") await phase17();
  if (!only || only === "19") extracted = await phase19();
  if (!only || only === "18") await phase18(extracted);

  console.log("\n=== Smoke test complete ===");
  process.exit(0);
}

main().catch((err) => {
  console.error("Smoke test failed:", err);
  process.exit(1);
});
