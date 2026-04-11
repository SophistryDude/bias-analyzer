"use client";

/**
 * Bias Timeline
 *
 * Shows how a pundit's political leaning has shifted over time.
 * Renders as a horizontal timeline with colored markers.
 */

interface LeaningSnapshot {
  date: string;
  leaning: string;
  evidence: string;
}

interface BiasTimelineProps {
  snapshots: LeaningSnapshot[];
  name: string;
}

const leaningColors: Record<string, string> = {
  "far-left": "#3b82f6",
  left: "#60a5fa",
  "center-left": "#22d3ee",
  center: "#9ca3af",
  "center-right": "#fb923c",
  right: "#ef4444",
  "far-right": "#dc2626",
  unclassified: "#6b7280",
};

const leaningPosition: Record<string, number> = {
  "far-left": 0,
  left: 1,
  "center-left": 2,
  center: 3,
  "center-right": 4,
  right: 5,
  "far-right": 6,
};

export default function BiasTimeline({
  snapshots,
  name,
}: BiasTimelineProps) {
  if (snapshots.length === 0) return null;

  const sorted = [...snapshots].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  return (
    <div>
      <h3 className="text-sm font-medium text-gray-400 mb-4">
        Bias Trajectory — {name}
      </h3>
      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-4 top-0 bottom-0 w-px bg-gray-700" />

        {/* Snapshots */}
        <div className="space-y-6">
          {sorted.map((s, i) => {
            const color = leaningColors[s.leaning] || "#6b7280";
            const year = new Date(s.date).getFullYear();
            const shifted =
              i > 0 && sorted[i - 1].leaning !== s.leaning;

            return (
              <div key={i} className="relative pl-10">
                {/* Dot */}
                <div
                  className="absolute left-2.5 top-1 w-3 h-3 rounded-full border-2 border-gray-900"
                  style={{ backgroundColor: color }}
                />

                {/* Content */}
                <div
                  className={`text-sm ${shifted ? "border-l-2 pl-3" : ""}`}
                  style={shifted ? { borderColor: color } : {}}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-gray-500 font-mono text-xs">
                      ~{year}
                    </span>
                    <span
                      className="text-xs px-2 py-0.5 rounded-full font-medium"
                      style={{
                        color,
                        backgroundColor: `${color}20`,
                      }}
                    >
                      {s.leaning}
                    </span>
                    {shifted && (
                      <span className="text-xs text-yellow-500">shifted</span>
                    )}
                  </div>
                  <p className="text-gray-400 text-xs">{s.evidence}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
