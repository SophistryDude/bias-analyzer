import { eq, desc, and } from "drizzle-orm";
import { db } from "../client";
import { blogPosts } from "../schema";

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  status: "draft" | "published" | "archived";
  postType: "individual-analysis" | "trend-report" | "comparison" | "story-comparison";
  relatedAnalysisIds: string[];
  relatedPunditIds: string[];
  relatedStoryId: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export async function createPost(post: {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  postType: string;
  relatedAnalysisIds?: string[];
  relatedPunditIds?: string[];
  relatedStoryId?: string;
}): Promise<void> {
  await db.insert(blogPosts).values({
    id: post.id,
    title: post.title,
    slug: post.slug,
    content: post.content,
    excerpt: post.excerpt,
    postType: post.postType,
    relatedAnalysisIds: post.relatedAnalysisIds ?? [],
    relatedPunditIds: post.relatedPunditIds ?? [],
    relatedStoryId: post.relatedStoryId,
    status: "draft",
  });
}

export async function publishPost(id: string): Promise<void> {
  await db
    .update(blogPosts)
    .set({ status: "published", publishedAt: new Date(), updatedAt: new Date() })
    .where(eq(blogPosts.id, id));
}

export async function updatePost(
  id: string,
  updates: { title?: string; content?: string; excerpt?: string }
): Promise<void> {
  await db
    .update(blogPosts)
    .set({ ...updates, updatedAt: new Date() })
    .where(eq(blogPosts.id, id));
}

export async function getPublishedPosts(limit: number = 20): Promise<BlogPost[]> {
  const rows = await db.query.blogPosts.findMany({
    where: eq(blogPosts.status, "published"),
    orderBy: [desc(blogPosts.publishedAt)],
    limit,
  });
  return rows.map(toPost);
}

export async function getDrafts(): Promise<BlogPost[]> {
  const rows = await db.query.blogPosts.findMany({
    where: eq(blogPosts.status, "draft"),
    orderBy: [desc(blogPosts.createdAt)],
  });
  return rows.map(toPost);
}

export async function getAllPosts(): Promise<BlogPost[]> {
  const rows = await db.query.blogPosts.findMany({
    orderBy: [desc(blogPosts.createdAt)],
  });
  return rows.map(toPost);
}

export async function getPostBySlug(slug: string): Promise<BlogPost | null> {
  const row = await db.query.blogPosts.findFirst({
    where: eq(blogPosts.slug, slug),
  });
  if (!row) return null;
  return toPost(row);
}

function toPost(row: {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  status: string;
  postType: string;
  relatedAnalysisIds: unknown;
  relatedPunditIds: unknown;
  relatedStoryId: string | null;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}): BlogPost {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    content: row.content,
    excerpt: row.excerpt,
    status: row.status as BlogPost["status"],
    postType: row.postType as BlogPost["postType"],
    relatedAnalysisIds: (row.relatedAnalysisIds ?? []) as string[],
    relatedPunditIds: (row.relatedPunditIds ?? []) as string[],
    relatedStoryId: row.relatedStoryId,
    publishedAt: row.publishedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
