import Link from "next/link";

export default function Header() {
  return (
    <header className="border-b border-gray-800 bg-gray-950/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link href="/" className="text-xl font-bold text-white">
          Media<span className="text-red-500">Sentinel</span>
        </Link>
        <nav className="flex gap-6 text-sm">
          <Link
            href="/analysis"
            className="text-gray-400 hover:text-white transition"
          >
            Analyze
          </Link>
          <Link
            href="/pundit"
            className="text-gray-400 hover:text-white transition"
          >
            Pundits
          </Link>
          <Link
            href="/blog"
            className="text-gray-400 hover:text-white transition"
          >
            Blog
          </Link>
          <Link
            href="/about"
            className="text-gray-400 hover:text-white transition"
          >
            About
          </Link>
        </nav>
      </div>
    </header>
  );
}
