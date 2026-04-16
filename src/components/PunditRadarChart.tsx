"use client";

/**
 * 9-Axis Radar Chart
 *
 * Renders a pundit's political profile as a radar/spider chart
 * showing all 9 axes. Pure SVG, no chart library dependency.
 */

interface AxisScore {
  axisId: string;
  label: string;
  value: number; // -1 to 1
  confidence: number; // 0 to 1
}

interface PunditRadarChartProps {
  axes: AxisScore[];
  size?: number;
  label?: string;
}

const AXIS_LABELS: Record<string, string> = {
  economic: "Economic",
  speech: "Speech",
  "causation-analysis": "Causation",
  "equality-model": "Equality",
  "liberal-conservative": "Lib/Con",
  "foreign-policy": "Foreign Pol",
  populism: "Populism",
  nationalism: "Nationalism",
  authority: "Authority",
};

export default function PunditRadarChart({
  axes,
  size = 350,
  label,
}: PunditRadarChartProps) {
  const center = size / 2;
  const radius = size * 0.35;
  const angleStep = (2 * Math.PI) / 9;
  // Start from top (-90 degrees)
  const startAngle = -Math.PI / 2;

  // Map axes to positions (normalize -1..1 to 0..1)
  const orderedAxes = [
    "economic",
    "speech",
    "causation-analysis",
    "equality-model",
    "liberal-conservative",
    "foreign-policy",
    "populism",
    "nationalism",
    "authority",
  ];
  const points = orderedAxes.map((axisId, i) => {
    const axis = axes.find((a) => a.axisId === axisId);
    const normalized = axis ? (axis.value + 1) / 2 : 0.5; // center if missing
    const angle = startAngle + i * angleStep;
    return {
      x: center + Math.cos(angle) * radius * normalized,
      y: center + Math.sin(angle) * radius * normalized,
      labelX: center + Math.cos(angle) * (radius + 35),
      labelY: center + Math.sin(angle) * (radius + 35),
      axisEndX: center + Math.cos(angle) * radius,
      axisEndY: center + Math.sin(angle) * radius,
      label: axis?.label || AXIS_LABELS[axisId] || axisId,
      value: axis?.value ?? 0,
      confidence: axis?.confidence ?? 0,
    };
  });

  const polygonPoints = points.map((p) => `${p.x},${p.y}`).join(" ");

  // Grid rings at 25%, 50%, 75%, 100%
  const rings = [0.25, 0.5, 0.75, 1.0];

  return (
    <div className="flex flex-col items-center">
      {label && (
        <h3 className="text-sm font-medium text-gray-400 mb-2">{label}</h3>
      )}
      <svg width={size} height={size} className="overflow-visible">
        {/* Grid rings */}
        {rings.map((r) => (
          <polygon
            key={r}
            points={orderedAxes
              .map((_, i) => {
                const angle = startAngle + i * angleStep;
                return `${center + Math.cos(angle) * radius * r},${center + Math.sin(angle) * radius * r}`;
              })
              .join(" ")}
            fill="none"
            stroke="#374151"
            strokeWidth="1"
            opacity={0.5}
          />
        ))}

        {/* Axis lines */}
        {points.map((p, i) => (
          <line
            key={i}
            x1={center}
            y1={center}
            x2={p.axisEndX}
            y2={p.axisEndY}
            stroke="#374151"
            strokeWidth="1"
          />
        ))}

        {/* Data polygon */}
        <polygon
          points={polygonPoints}
          fill="rgba(239, 68, 68, 0.15)"
          stroke="#ef4444"
          strokeWidth="2"
        />

        {/* Data points */}
        {points.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r="4"
            fill="#ef4444"
            stroke="#1f2937"
            strokeWidth="2"
          />
        ))}

        {/* Labels */}
        {points.map((p, i) => (
          <text
            key={i}
            x={p.labelX}
            y={p.labelY}
            textAnchor="middle"
            dominantBaseline="middle"
            className="text-xs fill-gray-400"
          >
            {p.label}
          </text>
        ))}

        {/* Center dot */}
        <circle cx={center} cy={center} r="2" fill="#6b7280" />
      </svg>
    </div>
  );
}
