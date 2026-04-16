"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Header from "../../components/Header";

interface FallacyResult {
  fallacyName: string;
  confidence: number;
  excerpt: string;
  explanation: string;
}

interface ReframingResult {
  techniqueName: string;
  confidence: number;
  excerpt: string;
  explanation: string;
}

interface AnalysisResponse {
  manipulationScore: number;
  biasLeaning: string;
  biasConfidence: number;
  balanceScore: number;
  fallacies: FallacyResult[];
  reframing: ReframingResult[];
  overallAssessment: string;
}

export default function AnalysisPage() {
  const searchParams = useSearchParams();
  const [input, setInput] = useState("");
  const [inputType, setInputType] = useState<"url" | "text">("url");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const autoRan = useRef(false);

  const handleAnalyze = async (overrideInput?: string, overrideType?: "url" | "text") => {
    const content = (overrideInput ?? input).trim();
    const type = overrideType ?? inputType;
    if (!content) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, content }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Analysis failed");
      }

      const data = await res.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  // Hydrate from ?url= / ?text= / ?run=1 query params (home-page form redirect)
  useEffect(() => {
    if (autoRan.current) return;
    const urlParam = searchParams.get("url");
    const textParam = searchParams.get("text");
    const run = searchParams.get("run") === "1";
    if (urlParam) {
      setInput(urlParam);
      setInputType("url");
      if (run) {
        autoRan.current = true;
        void handleAnalyze(urlParam, "url");
      }
    } else if (textParam) {
      setInput(textParam);
      setInputType("text");
      if (run) {
        autoRan.current = true;
        void handleAnalyze(textParam, "text");
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <Header />

      <main className="max-w-4xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold mb-8">Analyze Content</h1>

        {/* Input Section */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-8">
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setInputType("url")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                inputType === "url"
                  ? "bg-red-600 text-white"
                  : "bg-gray-800 text-gray-400 hover:text-white"
              }`}
            >
              URL
            </button>
            <button
              onClick={() => setInputType("text")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                inputType === "text"
                  ? "bg-red-600 text-white"
                  : "bg-gray-800 text-gray-400 hover:text-white"
              }`}
            >
              Raw Text
            </button>
          </div>

          {inputType === "url" ? (
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Paste a YouTube URL or article link..."
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-red-500 transition"
            />
          ) : (
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Paste the text you want to analyze..."
              rows={8}
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-red-500 transition resize-y"
            />
          )}

          <button
            onClick={() => handleAnalyze()}
            disabled={!input.trim() || loading}
            className="mt-4 px-6 py-3 bg-red-600 hover:bg-red-700 disabled:bg-gray-700 disabled:text-gray-500 text-white font-semibold rounded-lg transition w-full"
          >
            {loading ? "Analyzing..." : "Run Analysis"}
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-950 border border-red-800 rounded-xl p-4 mb-8 text-red-300">
            {error}
          </div>
        )}

        {/* Results */}
        {result && (
          <div className="space-y-6">
            {/* Score Overview */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <h2 className="text-xl font-semibold mb-4">Overview</h2>
              <div className="grid md:grid-cols-3 gap-6">
                <div>
                  <div className="text-sm text-gray-500 mb-1">
                    Manipulation Score
                  </div>
                  <div
                    className={`text-4xl font-bold ${
                      result.manipulationScore >= 70
                        ? "text-red-500"
                        : result.manipulationScore >= 40
                          ? "text-yellow-500"
                          : "text-green-500"
                    }`}
                  >
                    {result.manipulationScore}/100
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-500 mb-1">
                    Political Leaning
                  </div>
                  <div className="text-2xl font-bold capitalize">
                    {result.biasLeaning}
                  </div>
                  <div className="text-sm text-gray-500">
                    {(result.biasConfidence * 100).toFixed(0)}% confidence
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-500 mb-1">
                    Balance Score
                  </div>
                  <div className="text-2xl font-bold">
                    {(result.balanceScore * 100).toFixed(0)}%
                  </div>
                  <div className="text-sm text-gray-500">
                    100% = perfectly balanced
                  </div>
                </div>
              </div>
              <p className="mt-4 text-gray-400 border-t border-gray-800 pt-4">
                {result.overallAssessment}
              </p>
            </div>

            {/* Fallacies */}
            {result.fallacies.length > 0 && (
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                <h2 className="text-xl font-semibold mb-4">
                  Logical Fallacies Detected ({result.fallacies.length})
                </h2>
                <div className="space-y-4">
                  {result.fallacies.map((f, i) => (
                    <div
                      key={i}
                      className="border border-gray-800 rounded-lg p-4"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-semibold text-red-400">
                          {f.fallacyName}
                        </h3>
                        <span className="text-sm text-gray-500">
                          {(f.confidence * 100).toFixed(0)}% confidence
                        </span>
                      </div>
                      <p className="text-sm text-gray-400 mb-2">
                        {f.explanation}
                      </p>
                      <blockquote className="text-sm text-gray-500 border-l-2 border-gray-700 pl-3 italic">
                        &ldquo;{f.excerpt}&rdquo;
                      </blockquote>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Reframing */}
            {result.reframing.length > 0 && (
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                <h2 className="text-xl font-semibold mb-4">
                  Reframing Techniques ({result.reframing.length})
                </h2>
                <div className="space-y-4">
                  {result.reframing.map((r, i) => (
                    <div
                      key={i}
                      className="border border-gray-800 rounded-lg p-4"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-semibold text-yellow-400">
                          {r.techniqueName}
                        </h3>
                        <span className="text-sm text-gray-500">
                          {(r.confidence * 100).toFixed(0)}% confidence
                        </span>
                      </div>
                      <p className="text-sm text-gray-400 mb-2">
                        {r.explanation}
                      </p>
                      <blockquote className="text-sm text-gray-500 border-l-2 border-gray-700 pl-3 italic">
                        &ldquo;{r.excerpt}&rdquo;
                      </blockquote>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
