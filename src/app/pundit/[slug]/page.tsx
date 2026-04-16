import Link from "next/link";
import Header from "../../../components/Header";
import PunditRadarChart from "../../../components/PunditRadarChart";
import BiasTimeline from "../../../components/BiasTimeline";
import { getPunditBySlug } from "../../../lib/db/repositories/pundits";
import { PUNDIT_REGISTRY } from "../../../data/pundits/registry";
import { SEED_PROFILES } from "../../../lib/models/political-axes";
import type { PoliticalProfile } from "../../../lib/models/political-axes";

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

export default async function PunditDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  // Try database first, fall back to static registry
  let pundit;
  try {
    pundit = await getPunditBySlug(slug);
  } catch {
    pundit = null;
  }

  if (!pundit) {
    pundit = PUNDIT_REGISTRY.find((p) => p.slug === slug) ?? null;
  }

  if (!pundit) {
    return (
      <div className="min-h-screen bg-gray-950 text-gray-100">
        <Header />
        <main className="max-w-4xl mx-auto px-6 py-12">
          <h1 className="text-2xl font-bold mb-4">Pundit not found</h1>
          <Link href="/pundit" className="text-red-400 hover:underline">
            Back to directory
          </Link>
        </main>
      </div>
    );
  }

  // Get political profile from seed data
  const profile = SEED_PROFILES.find((p) => p.entityId === pundit.id);

  const axisScores = profile
    ? profile.axes.map((a) => ({
        axisId: a.axisId,
        label: a.axisId,
        value: a.value,
        confidence: a.confidence,
      }))
    : [];

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <Header />

      <main className="max-w-4xl mx-auto px-6 py-12">
        {/* Back link */}
        <Link
          href="/pundit"
          className="text-sm text-gray-500 hover:text-gray-300 mb-6 inline-block"
        >
          &larr; Back to directory
        </Link>

        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">{pundit.name}</h1>
            <div className="flex items-center gap-3 mb-3">
              <span
                className={`text-xs px-2 py-1 rounded-full font-medium ${leaningColors[pundit.currentLeaning] || ""}`}
              >
                {pundit.currentLeaning}
              </span>
              <div className="flex gap-2">
                {pundit.platforms.map((platform) => (
                  <span
                    key={platform}
                    className="text-xs bg-gray-800 text-gray-500 px-2 py-0.5 rounded"
                  >
                    {platform}
                  </span>
                ))}
              </div>
            </div>
            <p className="text-gray-400 max-w-xl">{pundit.description}</p>
          </div>

          {profile && (
            <div className="text-right text-sm text-gray-500">
              <div>
                Coherence:{" "}
                <span className="text-white font-mono">
                  {profile.ideologicalCoherence.toFixed(2)}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Two-column layout: chart + timeline */}
        <div className="grid md:grid-cols-2 gap-8 mb-12">
          {/* Radar chart */}
          {axisScores.length > 0 && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <PunditRadarChart axes={axisScores} label="5-Axis Profile" />
            </div>
          )}

          {/* Bias timeline */}
          {pundit.leaningHistory.length > 0 && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <BiasTimeline
                snapshots={pundit.leaningHistory}
                name={pundit.name}
              />
            </div>
          )}
        </div>

        {/* Axis detail table */}
        {profile && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-12">
            <h2 className="text-lg font-semibold mb-4">Multi-Axis Position</h2>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-500 text-left">
                  <th className="pb-2">Axis</th>
                  <th className="pb-2">Score</th>
                  <th className="pb-2">Confidence</th>
                  <th className="pb-2">Trend</th>
                  <th className="pb-2">Evidence</th>
                </tr>
              </thead>
              <tbody>
                {profile.axes.map((a) => (
                  <tr key={a.axisId} className="border-t border-gray-800">
                    <td className="py-2 font-medium capitalize">
                      {a.axisId.replace("-", "/")}
                    </td>
                    <td className="py-2 font-mono">
                      {a.value > 0 ? "+" : ""}
                      {a.value.toFixed(2)}
                    </td>
                    <td className="py-2 text-gray-500">
                      {(a.confidence * 100).toFixed(0)}%
                    </td>
                    <td className="py-2 text-gray-500">
                      {a.trend === "moving-left"
                        ? "← moving left"
                        : a.trend === "moving-right"
                          ? "moving right →"
                          : "stable"}
                    </td>
                    <td className="py-2 text-gray-400 text-xs max-w-xs">
                      {a.evidence}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Notes */}
        {profile?.notes && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-12">
            <h2 className="text-lg font-semibold mb-3">Analysis Notes</h2>
            <p className="text-gray-400 text-sm leading-relaxed">
              {profile.notes}
            </p>
          </div>
        )}

        {/* Known for */}
        {pundit.knownFor.length > 0 && (
          <div className="mb-12">
            <h2 className="text-lg font-semibold mb-3">Known For</h2>
            <div className="flex gap-2 flex-wrap">
              {pundit.knownFor.map((item) => (
                <span
                  key={item}
                  className="text-sm bg-gray-800 text-gray-400 px-3 py-1 rounded-full"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold font-mono">
              {pundit.analysisCount}
            </div>
            <div className="text-xs text-gray-500">Analyses</div>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold font-mono">
              {pundit.averageBiasScore.toFixed(1)}
            </div>
            <div className="text-xs text-gray-500">Avg Bias Score</div>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold font-mono">
              {pundit.averageManipulationScore.toFixed(0)}
            </div>
            <div className="text-xs text-gray-500">Avg Manipulation</div>
          </div>
        </div>
      </main>
    </div>
  );
}
