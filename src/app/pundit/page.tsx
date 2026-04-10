import Link from "next/link";
import { PUNDIT_REGISTRY } from "../../data/pundits/registry";

const leaningColors: Record<string, string> = {
  "far-left": "text-blue-400 bg-blue-950",
  left: "text-blue-400 bg-blue-950",
  "center-left": "text-cyan-400 bg-cyan-950",
  center: "text-gray-300 bg-gray-800",
  "center-right": "text-orange-400 bg-orange-950",
  right: "text-red-400 bg-red-950",
  "far-right": "text-red-400 bg-red-950",
  unclassified: "text-gray-500 bg-gray-800",
};

export default function PunditListPage() {
  const individuals = PUNDIT_REGISTRY.filter(
    (p) => !p.tags.includes("organization")
  );
  const organizations = PUNDIT_REGISTRY.filter((p) =>
    p.tags.includes("organization")
  );

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-950/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold text-white">
            Bias<span className="text-red-500">Analyzer</span>
          </Link>
          <nav className="flex gap-6 text-sm">
            <Link
              href="/analysis"
              className="text-gray-400 hover:text-white transition"
            >
              Analyze
            </Link>
            <Link href="/pundit" className="text-white font-medium">
              Pundits
            </Link>
          </nav>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold mb-2">Pundit & Source Tracker</h1>
        <p className="text-gray-400 mb-10">
          Tracking media figures and organizations across the political spectrum.
          Everyone gets scrutinized — no exceptions.
        </p>

        {/* Individual Pundits */}
        <h2 className="text-2xl font-semibold mb-6">Individual Commentators</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-16">
          {individuals.map((pundit) => (
            <Link
              key={pundit.id}
              href={`/pundit/${pundit.slug}`}
              className="bg-gray-900 border border-gray-800 rounded-xl p-5 hover:border-gray-600 transition block"
            >
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-semibold text-lg">{pundit.name}</h3>
                <span
                  className={`text-xs px-2 py-1 rounded-full font-medium ${leaningColors[pundit.currentLeaning] || ""}`}
                >
                  {pundit.currentLeaning}
                </span>
              </div>
              <p className="text-sm text-gray-400 mb-3 line-clamp-2">
                {pundit.description}
              </p>
              <div className="flex gap-2 flex-wrap">
                {pundit.platforms.map((platform) => (
                  <span
                    key={platform}
                    className="text-xs bg-gray-800 text-gray-500 px-2 py-0.5 rounded"
                  >
                    {platform}
                  </span>
                ))}
              </div>
              {pundit.leaningHistory.length > 1 && (
                <div className="mt-3 text-xs text-gray-500">
                  Shifted:{" "}
                  {pundit.leaningHistory[0].leaning} →{" "}
                  {pundit.leaningHistory[pundit.leaningHistory.length - 1].leaning}
                </div>
              )}
            </Link>
          ))}
        </div>

        {/* Organizations */}
        <h2 className="text-2xl font-semibold mb-6">Media Organizations</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {organizations.map((org) => (
            <Link
              key={org.id}
              href={`/pundit/${org.slug}`}
              className="bg-gray-900 border border-gray-800 rounded-xl p-5 hover:border-gray-600 transition block"
            >
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-semibold text-lg">{org.name}</h3>
                <span
                  className={`text-xs px-2 py-1 rounded-full font-medium ${leaningColors[org.currentLeaning] || ""}`}
                >
                  {org.currentLeaning}
                </span>
              </div>
              <p className="text-sm text-gray-400 line-clamp-2">
                {org.description}
              </p>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
