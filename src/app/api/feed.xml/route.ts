import { NextResponse } from "next/server";
import { getPublishedPosts, type BlogPost } from "../../../lib/db/repositories/posts";

export async function GET() {
  let posts: BlogPost[];
  try {
    posts = await getPublishedPosts(50);
  } catch {
    posts = [];
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://biasanalyzer.com";

  const items = posts
    .map(
      (post) => `
    <item>
      <title><![CDATA[${post.title}]]></title>
      <link>${baseUrl}/blog/${post.slug}</link>
      <guid isPermaLink="true">${baseUrl}/blog/${post.slug}</guid>
      <description><![CDATA[${post.excerpt}]]></description>
      ${post.publishedAt ? `<pubDate>${new Date(post.publishedAt).toUTCString()}</pubDate>` : ""}
      <category>${post.postType}</category>
    </item>`
    )
    .join("");

  const feed = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>BiasAnalyzer</title>
    <link>${baseUrl}</link>
    <description>Media bias analysis — fallacy detection, reframing analysis, and cross-source comparison.</description>
    <language>en-us</language>
    <atom:link href="${baseUrl}/api/feed.xml" rel="self" type="application/rss+xml" />
    ${items}
  </channel>
</rss>`;

  return new NextResponse(feed, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
