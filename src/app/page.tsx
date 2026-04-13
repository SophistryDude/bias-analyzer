import Link from "next/link";
import Header from "../components/Header";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <Header />

      {/* Hero */}
      <main>
        <section className="max-w-4xl mx-auto px-6 py-24 text-center">
          <h1 className="text-5xl font-bold mb-6">
            See Through the{" "}
            <span className="text-red-500">Manipulation</span>
          </h1>
          <p className="text-xl text-gray-400 mb-12 max-w-2xl mx-auto">
            AI-powered analysis of logical fallacies, reframing techniques, and
            political bias in media. Built on an independent logic engine — not
            reliant on LLM reasoning.
          </p>

          {/* Analysis Input */}
          <div className="max-w-2xl mx-auto">
            <form className="flex flex-col gap-4">
              <input
                type="text"
                placeholder="Paste a YouTube URL, article link, or text to analyze..."
                className="w-full px-6 py-4 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-red-500 transition text-lg"
              />
              <div className="flex gap-3">
                <button
                  type="submit"
                  className="flex-1 px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition"
                >
                  Analyze Content
                </button>
                <button
                  type="button"
                  className="px-6 py-3 bg-gray-800 hover:bg-gray-700 text-gray-300 font-semibold rounded-lg transition border border-gray-700"
                >
                  Paste Text Instead
                </button>
              </div>
            </form>
          </div>
        </section>

        {/* What We Detect */}
        <section className="max-w-6xl mx-auto px-6 py-16">
          <h2 className="text-3xl font-bold text-center mb-12">
            What We Detect
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <div className="text-red-500 text-2xl mb-3">Logic</div>
              <h3 className="text-xl font-semibold mb-2">Logical Fallacies</h3>
              <p className="text-gray-400">
                14+ formally defined fallacy types including ad hominem, straw
                man, false dichotomy, whataboutism, gish gallop, and more. Each
                with structural detection patterns.
              </p>
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <div className="text-yellow-500 text-2xl mb-3">Framing</div>
              <h3 className="text-xl font-semibold mb-2">
                Reframing Techniques
              </h3>
              <p className="text-gray-400">
                Detects loaded language, euphemisms, dysphemisms, passive voice
                deflection, minimization, maximization, and narrative anchoring.
              </p>
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <div className="text-blue-500 text-2xl mb-3">Bias</div>
              <h3 className="text-xl font-semibold mb-2">Political Bias</h3>
              <p className="text-gray-400">
                Scores content on a political spectrum from far-left to
                far-right. Tracks how pundits and organizations shift over time.
              </p>
            </div>
          </div>
        </section>

        {/* Pundit Spotlight */}
        <section className="max-w-6xl mx-auto px-6 py-16">
          <h2 className="text-3xl font-bold text-center mb-4">
            Pundit Tracker
          </h2>
          <p className="text-center text-gray-400 mb-12 max-w-2xl mx-auto">
            We track how media figures&apos; positions and bias evolve over time.
            Nobody gets a pass — left, right, or center.
          </p>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                name: "Philip DeFranco",
                shift: "Center \u2192 Left",
                color: "blue",
              },
              {
                name: "Tucker Carlson",
                shift: "Right \u2192 Foreign Interest?",
                color: "red",
              },
              {
                name: "Candace Owens",
                shift: "Right \u2192 Conspiracy",
                color: "yellow",
              },
              {
                name: "Nick Fuentes",
                shift: "Dual Persona",
                color: "purple",
              },
            ].map((pundit) => (
              <div
                key={pundit.name}
                className="bg-gray-900 border border-gray-800 rounded-lg p-4 hover:border-gray-600 transition cursor-pointer"
              >
                <h4 className="font-semibold mb-1">{pundit.name}</h4>
                <p className="text-sm text-gray-500">{pundit.shift}</p>
              </div>
            ))}
          </div>
          <div className="text-center mt-8">
            <Link
              href="/pundit"
              className="text-red-500 hover:text-red-400 transition font-medium"
            >
              View all tracked pundits &rarr;
            </Link>
          </div>
        </section>

        {/* How It Works */}
        <section className="max-w-4xl mx-auto px-6 py-16">
          <h2 className="text-3xl font-bold text-center mb-12">How It Works</h2>
          <div className="space-y-8">
            {[
              {
                step: "1",
                title: "Ingest",
                desc: "Paste a YouTube URL, article link, or raw text. We extract transcripts and article content automatically.",
              },
              {
                step: "2",
                title: "Analyze",
                desc: "Our independent logic engine scans for logical fallacies, reframing techniques, and political bias markers using rule-based detection.",
              },
              {
                step: "3",
                title: "Score",
                desc: "Content receives a manipulation score (0-100), bias assessment, and detailed breakdown of every detected issue.",
              },
              {
                step: "4",
                title: "Learn",
                desc: "Human reviewers verify and correct AI findings. These corrections train the model to get better over time.",
              },
            ].map((item) => (
              <div key={item.step} className="flex gap-6 items-start">
                <div className="w-10 h-10 rounded-full bg-red-600 flex items-center justify-center font-bold shrink-0">
                  {item.step}
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-1">{item.title}</h3>
                  <p className="text-gray-400">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-800 py-8 mt-16">
        <div className="max-w-7xl mx-auto px-6 text-center text-gray-500 text-sm">
          <p>
            MediaSentinel — Independent media analysis. No political allegiance.
          </p>
          <p className="mt-2">
            Built on a rule-based logic engine with human-in-the-loop training.
          </p>
        </div>
      </footer>
    </div>
  );
}
