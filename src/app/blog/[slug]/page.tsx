import Link from "next/link";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import Header from "../../../components/Header";
import { getPostBySlug } from "../../../lib/db/repositories/posts";

const markdownComponents: Components = {
  h1: ({ children }) => <h1 className="text-2xl font-bold mt-8 mb-4">{children}</h1>,
  h2: ({ children }) => <h2 className="text-xl font-semibold mt-6 mb-3">{children}</h2>,
  h3: ({ children }) => <h3 className="text-lg font-medium mt-4 mb-2">{children}</h3>,
  h4: ({ children }) => <h4 className="text-base font-medium mt-4 mb-2">{children}</h4>,
  p: ({ children }) => <p className="text-gray-300 mb-3 leading-relaxed">{children}</p>,
  a: ({ href, children }) => (
    <a
      href={href}
      className="text-red-400 hover:underline"
      target={href?.startsWith("http") ? "_blank" : undefined}
      rel={href?.startsWith("http") ? "noopener noreferrer" : undefined}
    >
      {children}
    </a>
  ),
  ul: ({ children }) => <ul className="list-disc pl-6 mb-3 text-gray-300 space-y-1">{children}</ul>,
  ol: ({ children }) => <ol className="list-decimal pl-6 mb-3 text-gray-300 space-y-1">{children}</ol>,
  li: ({ children }) => <li className="text-gray-300">{children}</li>,
  blockquote: ({ children }) => (
    <blockquote className="border-l-2 border-gray-600 pl-4 text-gray-400 italic my-3">
      {children}
    </blockquote>
  ),
  strong: ({ children }) => <strong className="font-semibold text-gray-100">{children}</strong>,
  em: ({ children }) => <em className="italic">{children}</em>,
  hr: () => <hr className="border-gray-800 my-6" />,
  code: ({ className, children }) => {
    const isBlock = /language-/.test(className ?? "");
    if (isBlock) {
      return (
        <code className={`${className ?? ""} block`}>{children}</code>
      );
    }
    return (
      <code className="bg-gray-800 text-red-300 px-1.5 py-0.5 rounded text-sm">
        {children}
      </code>
    );
  },
  pre: ({ children }) => (
    <pre className="bg-gray-900 border border-gray-800 rounded p-4 overflow-x-auto text-sm text-gray-200 mb-3">
      {children}
    </pre>
  ),
  table: ({ children }) => (
    <div className="overflow-x-auto my-4">
      <table className="w-full text-sm border-collapse">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="border-b border-gray-700">{children}</thead>,
  tbody: ({ children }) => <tbody className="divide-y divide-gray-800">{children}</tbody>,
  tr: ({ children }) => <tr>{children}</tr>,
  th: ({ children }) => (
    <th className="text-left font-semibold text-gray-200 px-3 py-2">{children}</th>
  ),
  td: ({ children }) => <td className="text-gray-300 px-3 py-2 align-top">{children}</td>,
};

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

        <article className="max-w-none">
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
            {post.content}
          </ReactMarkdown>
        </article>
      </main>
    </div>
  );
}
