/**
 * Blog Post Templates
 *
 * Structured templates for the 4 blog post types.
 * Each template defines the data shape the LLM needs
 * to generate a post, and the prompt that produces it.
 */

import type { LLMMessage } from "../llm/provider";

// ─── Shared Types ───────────────────────────────────────────────────

export interface GeneratedPost {
  title: string;
  slug: string;
  content: string; // markdown
  excerpt: string;
  postType: string;
}

// ─── Individual Analysis Post ───────────────────────────────────────

export interface IndividualAnalysisData {
  contentTitle: string;
  sourceName: string;
  contentUrl: string;
  manipulationScore: number;
  biasLeaning: string;
  balanceScore: number;
  fallacies: { name: string; confidence: number; excerpt: string; explanation: string }[];
  reframing: { name: string; confidence: number; excerpt: string; explanation: string }[];
  overallAssessment: string;
  toneScore?: number;
  axisScores?: { axis: string; value: number; evidence: string }[];
}

export function buildIndividualAnalysisPrompt(data: IndividualAnalysisData): LLMMessage[] {
  return [
    {
      role: "system",
      content: `You write blog posts for MediaSentinel, a media bias analysis site. Write in a direct, analytical tone — not academic, not sensational. Show the data, explain what it means, let the reader draw conclusions. Use markdown formatting.

Structure:
1. Brief intro — what content was analyzed and why it matters
2. Key findings — manipulation score, bias leaning, balance
3. Fallacies found — explain each with the specific excerpt
4. Reframing techniques — explain each with the specific excerpt
5. Axis breakdown (if available) — where this content lands on each political axis
6. Bottom line — one paragraph summary

Keep it under 1000 words. Don't editorialize beyond what the data shows.`,
    },
    {
      role: "user",
      content: `Write a blog post analyzing this content:

**Title:** ${data.contentTitle}
**Source:** ${data.sourceName}
**URL:** ${data.contentUrl}

**Results:**
- Manipulation Score: ${data.manipulationScore}/100
- Bias Leaning: ${data.biasLeaning}
- Balance Score: ${(data.balanceScore * 100).toFixed(0)}%
- Overall: ${data.overallAssessment}

**Fallacies Detected (${data.fallacies.length}):**
${data.fallacies.map((f) => `- ${f.name} (${(f.confidence * 100).toFixed(0)}%): "${f.excerpt}" — ${f.explanation}`).join("\n")}

**Reframing Techniques (${data.reframing.length}):**
${data.reframing.map((r) => `- ${r.name} (${(r.confidence * 100).toFixed(0)}%): "${r.excerpt}" — ${r.explanation}`).join("\n")}

${data.axisScores ? `**5-Axis Scores:**\n${data.axisScores.map((a) => `- ${a.axis}: ${a.value.toFixed(2)} — ${a.evidence}`).join("\n")}` : ""}

Return ONLY valid JSON:
{ "title": "string", "slug": "string", "content": "markdown string", "excerpt": "1-2 sentence summary", "postType": "individual-analysis" }`,
    },
  ];
}

// ─── Trend Report Post ──────────────────────────────────────────────

export interface TrendReportData {
  sourceName: string;
  sourceSlug: string;
  periodStart: string;
  periodEnd: string;
  analysisCount: number;
  avgManipulationScore: number;
  avgBalanceScore: number;
  biasLeaningBreakdown: Record<string, number>; // { "left": 5, "center-left": 3, ... }
  topFallacies: { name: string; count: number }[];
  topReframing: { name: string; count: number }[];
  axisTrends?: { axis: string; startValue: number; endValue: number; direction: string }[];
}

export function buildTrendReportPrompt(data: TrendReportData): LLMMessage[] {
  return [
    {
      role: "system",
      content: `You write trend analysis blog posts for MediaSentinel. Identify patterns over time — what's changing, what's consistent, what's notable. Use markdown formatting. Keep it under 1200 words. Be analytical, not sensational.`,
    },
    {
      role: "user",
      content: `Write a trend report for:

**Source:** ${data.sourceName}
**Period:** ${data.periodStart} to ${data.periodEnd}
**Analyses:** ${data.analysisCount} pieces of content analyzed

**Averages:**
- Manipulation Score: ${data.avgManipulationScore.toFixed(0)}/100
- Balance Score: ${(data.avgBalanceScore * 100).toFixed(0)}%

**Bias Leaning Breakdown:**
${Object.entries(data.biasLeaningBreakdown).map(([k, v]) => `- ${k}: ${v}`).join("\n")}

**Most Common Fallacies:**
${data.topFallacies.map((f) => `- ${f.name}: ${f.count} occurrences`).join("\n")}

**Most Common Reframing:**
${data.topReframing.map((r) => `- ${r.name}: ${r.count} occurrences`).join("\n")}

${data.axisTrends ? `**Axis Trends:**\n${data.axisTrends.map((a) => `- ${a.axis}: ${a.startValue.toFixed(2)} → ${a.endValue.toFixed(2)} (${a.direction})`).join("\n")}` : ""}

Return ONLY valid JSON:
{ "title": "string", "slug": "string", "content": "markdown string", "excerpt": "1-2 sentence summary", "postType": "trend-report" }`,
    },
  ];
}

// ─── Comparison Post ────────────────────────────────────────────────

export interface ComparisonData {
  sources: {
    name: string;
    avgManipulationScore: number;
    biasLeaning: string;
    avgBalanceScore: number;
    topFallacies: string[];
    axisScores?: { axis: string; value: number }[];
    coherence?: number;
  }[];
  periodDescription: string;
}

export function buildComparisonPrompt(data: ComparisonData): LLMMessage[] {
  return [
    {
      role: "system",
      content: `You write comparison blog posts for MediaSentinel. Compare sources side-by-side on multiple dimensions. Highlight where they agree, where they diverge, and what the differences reveal. Use markdown tables where appropriate. Keep it under 1500 words.`,
    },
    {
      role: "user",
      content: `Write a side-by-side comparison of these sources:

**Period:** ${data.periodDescription}

${data.sources.map((s) => `**${s.name}:**
- Manipulation Score: ${s.avgManipulationScore.toFixed(0)}/100
- Bias Leaning: ${s.biasLeaning}
- Balance: ${(s.avgBalanceScore * 100).toFixed(0)}%
- Top Fallacies: ${s.topFallacies.join(", ")}
${s.axisScores ? `- Axes: ${s.axisScores.map((a) => `${a.axis}=${a.value.toFixed(2)}`).join(", ")}` : ""}
${s.coherence !== undefined ? `- Ideological Coherence: ${s.coherence.toFixed(2)}` : ""}`).join("\n\n")}

Return ONLY valid JSON:
{ "title": "string", "slug": "string", "content": "markdown string", "excerpt": "1-2 sentence summary", "postType": "comparison" }`,
    },
  ];
}

// ─── Story Comparison Post ──────────────────────────────────────────

export interface StoryComparisonData {
  storyTitle: string;
  storyDescription: string;
  occurredAt: string;
  coverages: {
    sourceName: string;
    headline: string;
    toneScore: number | null;
    framingType: string | null;
    keyTerms: string[];
    axisScores?: Record<string, number>;
  }[];
  sharedTerms: string[];
  uniqueTermsBySource: Record<string, string[]>;
  toneSpread: number | null;
  keyOmissions?: { sourceName: string; omissions: string[] }[];
  completenessScores?: { sourceName: string; score: number }[];
}

export function buildStoryComparisonPrompt(data: StoryComparisonData): LLMMessage[] {
  return [
    {
      role: "system",
      content: `You write story comparison blog posts for MediaSentinel. These are the most important posts — they show how different outlets covered the SAME event differently. Focus on:
1. What happened (the cross-validated facts)
2. How each source framed it (verbiage, tone, emphasis)
3. What each source omitted (this is where bias lives)
4. What the reader should take away

This is where we demonstrate our value. Show the reader something they can't see from reading any single source. Use markdown tables for side-by-side comparisons. Keep it under 2000 words.`,
    },
    {
      role: "user",
      content: `Write a story comparison post:

**Story:** ${data.storyTitle}
**Date:** ${data.occurredAt}
**Description:** ${data.storyDescription}

**Coverages:**
${data.coverages.map((c) => `**${c.sourceName}:**
- Headline: "${c.headline}"
- Tone: ${c.toneScore?.toFixed(2) ?? "N/A"}
- Framing: ${c.framingType ?? "N/A"}
- Key terms: ${c.keyTerms.join(", ")}`).join("\n\n")}

**Shared terms (used by multiple sources):** ${data.sharedTerms.join(", ")}

**Unique terms by source:**
${Object.entries(data.uniqueTermsBySource).map(([source, terms]) => `- ${source}: ${terms.join(", ")}`).join("\n")}

${data.toneSpread !== null ? `**Tone spread across sources:** ${data.toneSpread.toFixed(2)} (0 = identical, 2 = maximally divergent)` : ""}

${data.keyOmissions ? `**Key omissions:**\n${data.keyOmissions.map((o) => `- ${o.sourceName} omitted: ${o.omissions.join("; ")}`).join("\n")}` : ""}

${data.completenessScores ? `**Completeness scores:**\n${data.completenessScores.map((c) => `- ${c.sourceName}: ${(c.score * 100).toFixed(0)}%`).join("\n")}` : ""}

Return ONLY valid JSON:
{ "title": "string", "slug": "string", "content": "markdown string", "excerpt": "1-2 sentence summary", "postType": "story-comparison" }`,
    },
  ];
}
