/**
 * Run blindspot detection and epistemological classification
 * on the Aleppo story.
 */

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { detectBlindspots, getCoverageTimeline } from "../src/lib/db/repositories/stories";
import { classifyClaimsBatch } from "../src/lib/logic-engine/epistemology";

async function test() {
  console.log("=== Blindspot Detection: Aleppo Hospital April 2016 ===\n");

  const blindspot = await detectBlindspots("aleppo-hospital-april-2016");
  if (!blindspot) {
    console.log("Story not found");
    process.exit(1);
  }

  console.log(`Story: ${blindspot.storyTitle}`);
  console.log(`Covered by: ${blindspot.coveredBy.length} sources`);
  console.log(`Missed by: ${blindspot.missedBy.length} sources`);
  console.log(`\nCoverage distribution:`);
  console.log(`  Left: ${blindspot.coverageDistribution.left}`);
  console.log(`  Center: ${blindspot.coverageDistribution.center}`);
  console.log(`  Right: ${blindspot.coverageDistribution.right}`);
  console.log(`  Total: ${blindspot.coverageDistribution.total}`);
  console.log(`\nBlindspot direction: ${blindspot.blindspotDirection}`);

  console.log(`\nCovered by:`);
  for (const s of blindspot.coveredBy) {
    console.log(`  ${s.name} (${s.leaning})`);
  }

  console.log(`\nMissed by (sample of first 20):`);
  for (const s of blindspot.missedBy.slice(0, 20)) {
    console.log(`  ${s.name} (${s.leaning})`);
  }

  console.log("\n=== Coverage Timeline ===\n");

  const timeline = await getCoverageTimeline("aleppo-hospital-april-2016");
  if (timeline) {
    console.log(`First mover: ${timeline.firstMover}`);
    console.log(`Spread: ${timeline.spreadHours?.toFixed(1)} hours`);
    console.log(`\nTimeline:`);
    for (const entry of timeline.timeline) {
      console.log(`  [${entry.firstPublishedAt?.slice(0, 16) || "unknown"}] ${entry.sourceName} (${entry.leaning})`);
      console.log(`    "${entry.headline}"`);
      console.log(`    Tone: ${entry.toneScore} | Framing: ${entry.framingType}`);
    }
  }

  console.log("\n=== Epistemological Classification Test ===\n");

  // Test claims from the CNN and NYT articles
  const testClaims = [
    { statement: "An airstrike on a pediatric hospital in Syria has killed 50 people", sourceWording: "An airstrike on a pediatric hospital in Syria has killed 50 people, rights and humanitarian groups say" },
    { statement: "The hospital was hit by a missile from a fighter jet", sourceWording: "Al Quds field hospital was hit by a missile from a fighter jet Wednesday, witnesses said" },
    { statement: "It appears to have been a deliberate strike on a known medical facility", sourceWording: "It appears to have been a deliberate strike on a known medical facility and follows the Assad regime's appalling record of striking such facilities" },
    { statement: "Syria's state-run SANA news agency denied government planes were responsible", sourceWording: "Syria's state-run SANA news agency ran a statement denying that government planes were responsible" },
    { statement: "Russia's Defense Ministry denied carrying out the strike", sourceWording: "Russia's Defense Ministry issued a statement saying it had not carried out the strike" },
    { statement: "The Syrian government has been usually using these barrel bombs in the past", sourceWording: "What we know is it is the Syrian government that has been usually using these barrel bombs in the past" },
    { statement: "The situation in Aleppo has become catastrophic", sourceWording: "the United Nations warns that the situation in Aleppo has become 'catastrophic' amid intensified fighting" },
    { statement: "Trump called for getting out of the nation-building business", sourceWording: "Trump called Wednesday for a drastic shake-up in America's foreign policy – including 'getting out of the nation-building business'" },
    { statement: "Only four NATO members besides the US spend the minimum 2 percent of GDP on defense", sourceWording: "he stood by his controversial stance on NATO allies, complaining only four other member countries besides the U.S. spend the minimum 2 percent of GDP on defense" },
    { statement: "ISIS will be gone if Trump is elected president", sourceWording: "'ISIS will be gone if I'm elected president,' he claimed" },
    { statement: "At least 14 people were killed in rebel mortar attacks on government-controlled areas", sourceWording: "At least 14 people, mostly civilians, were killed in the mortar attacks on government-controlled areas" },
    { statement: "Where is the outrage among those with the power and obligation to stop this carnage", sourceWording: "Where is the outrage among those with the power and obligation to stop this carnage?" },
    { statement: "We will no longer surrender this country to the false song of globalism", sourceWording: "We will no longer surrender this country, or its people, to the false song of globalism" },
    { statement: "The ceasefire hangs by a thread", sourceWording: "the truce was barely holding and 'hangs by a thread'" },
    { statement: "Both our friends and enemies put their countries above ours", sourceWording: "Both our friends and enemies put their countries above ours and we, while being fair to them, must do the same" },
  ];

  const { classifications, stats } = classifyClaimsBatch(testClaims);

  console.log(`Total claims: ${stats.total}`);
  console.log(`Classified by rules: ${stats.classified}`);
  console.log(`Needs LLM refinement: ${stats.unclassified}`);
  console.log(`Category errors detected: ${stats.categoryErrors}`);
  console.log(`\nBy status:`);
  for (const [status, count] of Object.entries(stats.byStatus)) {
    if (count > 0) console.log(`  ${status}: ${count}`);
  }

  console.log(`\nDetailed classifications:`);
  for (const c of classifications) {
    const claim = testClaims[c.claimIndex];
    const marker = c.categoryError ? " ⚠️ CATEGORY ERROR" : "";
    console.log(`\n  [${c.status}] (${(c.confidence * 100).toFixed(0)}%)${marker}`);
    console.log(`  "${claim.statement}"`);
    console.log(`  Pattern: ${c.matchedPattern || "none"}`);
    if (c.categoryError) {
      console.log(`  Disguised as: ${c.disguisedAs}`);
    }
    console.log(`  Reasoning: ${c.reasoning}`);
  }

  console.log("\n=== Done ===");
  process.exit(0);
}

test().catch((e) => {
  console.error("Failed:", e);
  process.exit(1);
});
