import Link from "next/link";
import Header from "../../components/Header";
import { getPublishedPosts, type BlogPost } from "../../lib/db/repositories/posts";

const postTypeLabels: Record<string, string> = {
  "individual-analysis": "Analysis",
  "trend-report": "Trend Report",
  comparison: "Comparison",
  "story-comparison": "Story Comparison",
};

const postTypeColors: Record<string, string> = {
  "individual-analysis": "text-blue-400 bg-blue-950",
  "trend-report": "text-purple-400 bg-purple-950",
  comparison: "text-green-400 bg-green-950",
  "story-comparison": "text-orange-400 bg-orange-950",
};

export default async function BlogIndexPage() {
  let posts: BlogPost[];
  try {
    posts = await getPublishedPosts(50);
  } catch {
    posts = [];
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <Header />

      <main className="max-w-4xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold mb-2">Blog</h1>
        <p className="text-gray-400 mb-10">
          Analysis findings, trend reports, and cross-source comparisons.
        </p>

        {posts.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-gray-500 text-lg mb-2">No posts yet</p>
            <p className="text-gray-600 text-sm">
              Analysis results will be published here as they&apos;re reviewed.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {posts.map((post) => (
              <Link
                key={post.id}
                href={`/blog/${post.slug}`}
                className="block bg-gray-900 border border-gray-800 rounded-xl p-6 hover:border-gray-600 transition"
              >
                <div className="flex items-center gap-3 mb-2">
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${postTypeColors[post.postType] || ""}`}
                  >
                    {postTypeLabels[post.postType] || post.postType}
                  </span>
                  {post.publishedAt && (
                    <span className="text-xs text-gray-600">
                      {new Date(post.publishedAt).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </span>
                  )}
                </div>
                <h2 className="text-xl font-semibold mb-2">{post.title}</h2>
                <p className="text-gray-400 text-sm line-clamp-2">
                  {post.excerpt}
                </p>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
