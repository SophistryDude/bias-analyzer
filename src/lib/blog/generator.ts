/**
 * Blog Post Generator
 *
 * Takes structured analysis data and generates blog post drafts
 * using LLM prompts. Posts are created as drafts — Nicholas reviews
 * and publishes from the admin dashboard.
 */

import type { LLMProvider } from "../llm/provider";
import { parseJSONResponse } from "../llm/provider";
import {
  buildIndividualAnalysisPrompt,
  buildTrendReportPrompt,
  buildComparisonPrompt,
  buildStoryComparisonPrompt,
  type IndividualAnalysisData,
  type TrendReportData,
  type ComparisonData,
  type StoryComparisonData,
  type GeneratedPost,
} from "./templates";
import { createPost } from "../db/repositories/posts";

// Uses the same provider as the analysis LLM layer
let provider: LLMProvider | null = null;

export function configureBlogGenerator(p: LLMProvider): void {
  provider = p;
}

async function generate(
  messages: { role: "system" | "user" | "assistant"; content: string }[]
): Promise<GeneratedPost | null> {
  if (!provider) return null;

  const response = await provider.complete(messages);
  return parseJSONResponse<GeneratedPost>(response.content);
}

/**
 * Generate and save a draft blog post from an individual analysis.
 */
export async function generateIndividualAnalysisPost(
  data: IndividualAnalysisData
): Promise<GeneratedPost | null> {
  const messages = buildIndividualAnalysisPrompt(data);
  const post = await generate(messages);
  if (!post) return null;

  await saveDraft(post, {
    relatedPunditIds: [],
    relatedAnalysisIds: [],
  });

  return post;
}

/**
 * Generate and save a draft trend report post.
 */
export async function generateTrendReport(
  data: TrendReportData
): Promise<GeneratedPost | null> {
  const messages = buildTrendReportPrompt(data);
  const post = await generate(messages);
  if (!post) return null;

  await saveDraft(post, {
    relatedPunditIds: [data.sourceSlug],
  });

  return post;
}

/**
 * Generate and save a draft comparison post.
 */
export async function generateComparisonPost(
  data: ComparisonData
): Promise<GeneratedPost | null> {
  const messages = buildComparisonPrompt(data);
  const post = await generate(messages);
  if (!post) return null;

  await saveDraft(post, {
    relatedPunditIds: data.sources.map((s) => s.name),
  });

  return post;
}

/**
 * Generate and save a draft story comparison post.
 * This is the most important post type — cross-source coverage comparison.
 */
export async function generateStoryComparisonPost(
  data: StoryComparisonData
): Promise<GeneratedPost | null> {
  const messages = buildStoryComparisonPrompt(data);
  const post = await generate(messages);
  if (!post) return null;

  await saveDraft(post, {
    relatedPunditIds: data.coverages.map((c) => c.sourceName),
  });

  return post;
}

async function saveDraft(
  post: GeneratedPost,
  meta: {
    relatedAnalysisIds?: string[];
    relatedPunditIds?: string[];
    relatedStoryId?: string;
  }
): Promise<void> {
  try {
    await createPost({
      id: `post-${Date.now()}`,
      title: post.title,
      slug: post.slug,
      content: post.content,
      excerpt: post.excerpt,
      postType: post.postType,
      relatedAnalysisIds: meta.relatedAnalysisIds,
      relatedPunditIds: meta.relatedPunditIds,
      relatedStoryId: meta.relatedStoryId,
    });
  } catch (err) {
    console.error("Failed to save blog draft:", err);
  }
}
