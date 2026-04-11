"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Header from "../../components/Header";

interface Post {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  status: string;
  postType: string;
  createdAt: string;
  publishedAt: string | null;
}

export default function AdminDashboard() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/posts")
      .then((res) => (res.ok ? res.json() : { posts: [] }))
      .then((data) => setPosts(data.posts || []))
      .catch(() => setPosts([]))
      .finally(() => setLoading(false));
  }, []);

  const drafts = posts.filter((p) => p.status === "draft");
  const published = posts.filter((p) => p.status === "published");

  async function publishPost(id: string) {
    const res = await fetch(`/api/admin/posts/${id}/publish`, {
      method: "POST",
    });
    if (res.ok) {
      setPosts((prev) =>
        prev.map((p) =>
          p.id === id
            ? { ...p, status: "published", publishedAt: new Date().toISOString() }
            : p
        )
      );
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <Header />

      <main className="max-w-6xl mx-auto px-6 py-12">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <div className="flex gap-4 text-sm">
            <div className="bg-gray-800 px-3 py-1 rounded">
              <span className="text-gray-400">Drafts:</span>{" "}
              <span className="text-white font-mono">{drafts.length}</span>
            </div>
            <div className="bg-gray-800 px-3 py-1 rounded">
              <span className="text-gray-400">Published:</span>{" "}
              <span className="text-white font-mono">{published.length}</span>
            </div>
          </div>
        </div>

        {loading ? (
          <p className="text-gray-500">Loading...</p>
        ) : (
          <>
            {/* Drafts */}
            <section className="mb-12">
              <h2 className="text-xl font-semibold mb-4">
                Drafts — Review &amp; Publish
              </h2>
              {drafts.length === 0 ? (
                <p className="text-gray-500 text-sm">
                  No drafts pending review.
                </p>
              ) : (
                <div className="space-y-4">
                  {drafts.map((post) => (
                    <div
                      key={post.id}
                      className="bg-gray-900 border border-gray-800 rounded-xl p-5"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs bg-yellow-950 text-yellow-400 px-2 py-0.5 rounded-full">
                              draft
                            </span>
                            <span className="text-xs text-gray-600">
                              {post.postType}
                            </span>
                            <span className="text-xs text-gray-600">
                              {new Date(post.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          <h3 className="font-semibold text-lg mb-1">
                            {post.title}
                          </h3>
                          <p className="text-sm text-gray-400">
                            {post.excerpt}
                          </p>
                        </div>
                        <button
                          onClick={() => publishPost(post.id)}
                          className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-sm rounded-lg transition shrink-0 ml-4"
                        >
                          Publish
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Published */}
            <section>
              <h2 className="text-xl font-semibold mb-4">Published</h2>
              {published.length === 0 ? (
                <p className="text-gray-500 text-sm">
                  No published posts yet.
                </p>
              ) : (
                <div className="space-y-3">
                  {published.map((post) => (
                    <Link
                      key={post.id}
                      href={`/blog/${post.slug}`}
                      className="block bg-gray-900 border border-gray-800 rounded-xl p-4 hover:border-gray-600 transition"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-medium">{post.title}</h3>
                          <span className="text-xs text-gray-500">
                            {post.publishedAt &&
                              new Date(post.publishedAt).toLocaleDateString(
                                "en-US",
                                {
                                  year: "numeric",
                                  month: "long",
                                  day: "numeric",
                                }
                              )}
                          </span>
                        </div>
                        <span className="text-xs bg-green-950 text-green-400 px-2 py-0.5 rounded-full">
                          published
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}
