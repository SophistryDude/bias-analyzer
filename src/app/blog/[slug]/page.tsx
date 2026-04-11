import Link from "next/link";
import Header from "../../../components/Header";
import { getPostBySlug } from "../../../lib/db/repositories/posts";

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  let post;
  try {
    post = await getPostBySlug(slug);
  } catch {
    post = null;
  }

  if (!post || post.status !== "published") {
    return (
      <div className="min-h-screen bg-gray-950 text-gray-100">
        <Header />
        <main className="max-w-4xl mx-auto px-6 py-12">
          <h1 className="text-2xl font-bold mb-4">Post not found</h1>
          <Link href="/blog" className="text-red-400 hover:underline">
            Back to blog
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <Header />

      <main className="max-w-3xl mx-auto px-6 py-12">
        <Link
          href="/blog"
          className="text-sm text-gray-500 hover:text-gray-300 mb-6 inline-block"
        >
          &larr; Back to blog
        </Link>

        {post.publishedAt && (
          <time className="text-sm text-gray-500 block mb-2">
            {new Date(post.publishedAt).toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </time>
        )}

        <h1 className="text-3xl font-bold mb-6">{post.title}</h1>

        {/* Render markdown as HTML — for now, just whitespace-preserving text */}
        {/* TODO: Add a markdown renderer (remark/rehype) in a future pass */}
        <article className="prose prose-invert prose-sm max-w-none">
          {post.content.split("\n").map((line, i) => {
            if (line.startsWith("# "))
              return (
                <h1 key={i} className="text-2xl font-bold mt-8 mb-4">
                  {line.slice(2)}
                </h1>
              );
            if (line.startsWith("## "))
              return (
                <h2 key={i} className="text-xl font-semibold mt-6 mb-3">
                  {line.slice(3)}
                </h2>
              );
            if (line.startsWith("### "))
              return (
                <h3 key={i} className="text-lg font-medium mt-4 mb-2">
                  {line.slice(4)}
                </h3>
              );
            if (line.startsWith("- "))
              return (
                <li key={i} className="text-gray-300 ml-4">
                  {line.slice(2)}
                </li>
              );
            if (line.startsWith("> "))
              return (
                <blockquote
                  key={i}
                  className="border-l-2 border-gray-600 pl-4 text-gray-400 italic my-2"
                >
                  {line.slice(2)}
                </blockquote>
              );
            if (line.trim() === "") return <br key={i} />;
            return (
              <p key={i} className="text-gray-300 mb-3">
                {line}
              </p>
            );
          })}
        </article>
      </main>
    </div>
  );
}
