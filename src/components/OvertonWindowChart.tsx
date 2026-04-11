"use client";

/**
 * Overton Window Chart
 *
 * Visualizes where a position falls relative to the Overton window
 * for a given policy domain. Shows the window range and the position marker.
 */

interface OvertonWindowChartProps {
  domain: string;
  leftEdge: number;
  rightEdge: number;
  center: number;
  /** The position to plot (optional — if not provided, just shows the window) */
  position?: number;
  positionLabel?: string;
}

const degreeLabels: { threshold: number; label: string }[] = [
  { threshold: 0, label: "Policy" },
  { threshold: 0.2, label: "Popular" },
  { threshold: 0.4, label: "Sensible" },
  { threshold: 0.6, label: "Acceptable" },
  { threshold: 0.8, label: "Radical" },
  { threshold: 1.0, label: "Unthinkable" },
];

export default function OvertonWindowChart({
  domain,
  leftEdge,
  rightEdge,
  center,
  position,
  positionLabel,
}: OvertonWindowChartProps) {
  // Map -1..1 to 0..100% for rendering
  const toPercent = (v: number) => ((v + 1) / 2) * 100;

  const leftPct = toPercent(leftEdge);
  const rightPct = toPercent(rightEdge);
  const centerPct = toPercent(center);
  const positionPct = position !== undefined ? toPercent(position) : null;

  const domainDisplay = domain
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-gray-400">{domainDisplay}</span>
        <span className="text-xs text-gray-600">
          Width: {(rightEdge - leftEdge).toFixed(2)}
        </span>
      </div>

      {/* Window bar */}
      <div className="relative h-8 bg-gray-800 rounded overflow-hidden">
        {/* Overton window range */}
        <div
          className="absolute top-0 bottom-0 bg-gray-700/50 border-x border-gray-600"
          style={{
            left: `${leftPct}%`,
            width: `${rightPct - leftPct}%`,
          }}
        />

        {/* Center marker */}
        <div
          className="absolute top-0 bottom-0 w-px bg-gray-500"
          style={{ left: `${centerPct}%` }}
        />

        {/* Position marker */}
        {positionPct !== null && (
          <div
            className="absolute top-1 bottom-1 w-2 rounded-sm bg-red-500"
            style={{ left: `${positionPct}%`, transform: "translateX(-50%)" }}
            title={positionLabel || `Position: ${position?.toFixed(2)}`}
          />
        )}

        {/* Scale labels */}
        <div className="absolute inset-0 flex items-center justify-between px-2">
          <span className="text-[10px] text-gray-600">-1</span>
          <span className="text-[10px] text-gray-600">0</span>
          <span className="text-[10px] text-gray-600">+1</span>
        </div>
      </div>
    </div>
  );
}
