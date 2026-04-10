/**
 * Overton Window Model
 *
 * Tracks the range of politically acceptable discourse over time,
 * across multiple policy domains. The window is not a single left-right
 * slider — it has different positions on different issues.
 *
 * Key concepts:
 * - The window has a CENTER (mainstream consensus) and EDGES (boundary of acceptable discourse)
 * - Positions are classified: Unthinkable → Radical → Acceptable → Sensible → Popular → Policy
 * - The window shifts over time — we track historical snapshots
 * - Media figures can be mapped relative to the window: inside, at the edge, or outside
 * - A position being inside/outside the window says nothing about its correctness
 */

// ─── Core Types ─────────────────────────────────────────────────────

/**
 * Where a position falls relative to the Overton window.
 * Based on Joseph Overton's original six degrees of acceptance.
 */
export type OvertonDegree =
  | "policy"       // Currently enacted or actively legislated
  | "popular"      // Widely supported, politically safe to advocate
  | "sensible"     // Seen as reasonable by most, open for debate
  | "acceptable"   // Not mainstream but within bounds of acceptable discourse
  | "radical"      // Outside mainstream but acknowledged as a real position
  | "unthinkable"; // Considered beyond the pale of acceptable discourse

/**
 * A policy domain that the Overton window applies to.
 * The window position differs across domains.
 */
export type PolicyDomain =
  | "immigration"
  | "healthcare"
  | "gun-policy"
  | "economic-policy"
  | "foreign-policy"
  | "social-issues"
  | "climate-environment"
  | "criminal-justice"
  | "free-speech-censorship"
  | "education"
  | "technology-privacy"
  | "military-defense"
  | "trade-policy"
  | "election-integrity"
  | "media-trust";

/**
 * A specific political position on a policy domain
 */
export interface PolicyPosition {
  id: string;
  domain: PolicyDomain;
  description: string;
  direction: "left" | "right" | "libertarian" | "authoritarian" | "nonpartisan";
  /** How far from center this position is (0 = centrist, 1 = extreme) */
  extremity: number;
}

/**
 * A snapshot of where the Overton window sits for a given domain at a point in time.
 * The window is defined by its left and right boundaries on a -1 to 1 scale
 * where -1 is far-left and 1 is far-right.
 */
export interface WindowSnapshot {
  domain: PolicyDomain;
  date: string; // ISO date
  /** Left boundary of acceptable discourse (-1 to 1 scale) */
  leftEdge: number;
  /** Right boundary of acceptable discourse (-1 to 1 scale) */
  rightEdge: number;
  /** Center of the window (weighted by popular opinion) */
  center: number;
  /** How wide the window is (rightEdge - leftEdge). Narrow = polarized, wide = open discourse */
  width: number;
  /** Evidence/reasoning for this snapshot */
  evidence: string;
  /** Key events that influenced the window position */
  keyEvents?: string[];
}

/**
 * How a specific position maps to the current window
 */
export interface PositionMapping {
  position: PolicyPosition;
  degree: OvertonDegree;
  /** Where this position falls on the -1 to 1 scale */
  positionOnScale: number;
  /** Distance from the nearest window edge (negative = inside, positive = outside) */
  distanceFromEdge: number;
  /** Whether the position was more or less acceptable in a prior period */
  trend: "normalizing" | "stable" | "radicalizing";
}

/**
 * Tracks a pundit's positions across domains relative to the window
 */
export interface PunditOvertonProfile {
  punditId: string;
  assessedAt: string;
  positions: PunditPosition[];
  overallWindowRelation: "inside" | "edge" | "outside";
  /** How many of their positions fall outside the current window */
  outsideWindowCount: number;
  /** Are they pushing the window? Which direction? */
  windowInfluence: WindowInfluence;
}

export interface PunditPosition {
  domain: PolicyDomain;
  positionDescription: string;
  positionOnScale: number; // -1 to 1
  currentDegree: OvertonDegree;
  /** What degree this position would have been 5-10 years ago */
  historicalDegree?: OvertonDegree;
  evidence: string;
}

export interface WindowInfluence {
  direction: "left" | "right" | "widening" | "narrowing" | "none";
  strength: "weak" | "moderate" | "strong";
  description: string;
}

// ─── Window Tracking Database ───────────────────────────────────────

/**
 * Historical Overton window snapshots.
 * Each entry captures where the window was for a domain at a point in time.
 *
 * Scale: -1 (far-left) to 1 (far-right)
 * Width: how broad the acceptable discourse range is
 */
export const WINDOW_HISTORY: WindowSnapshot[] = [
  // ── Immigration ────────────────────────────────────────────────
  {
    domain: "immigration",
    date: "2010-01-01",
    leftEdge: -0.5,
    rightEdge: 0.4,
    center: -0.05,
    width: 0.9,
    evidence:
      "Bipartisan support for comprehensive reform. Both parties publicly supported some path to legal status. Border security was bipartisan.",
    keyEvents: ["Obama-era deportation numbers highest on record"],
  },
  {
    domain: "immigration",
    date: "2016-06-01",
    leftEdge: -0.6,
    rightEdge: 0.6,
    center: 0.0,
    width: 1.2,
    evidence:
      "Trump campaign widened the window rightward (wall, deportation). Left pushed back with sanctuary city policies. Window widened overall.",
    keyEvents: [
      "Trump 'Build the Wall' campaign",
      "Sanctuary city movement expansion",
    ],
  },
  {
    domain: "immigration",
    date: "2020-01-01",
    leftEdge: -0.7,
    rightEdge: 0.5,
    center: -0.1,
    width: 1.2,
    evidence:
      "Left shifted further: 'abolish ICE' entered mainstream discourse. Right-wing positions on deportation became more contested.",
    keyEvents: ["'Abolish ICE' movement", "Family separation policy backlash"],
  },
  {
    domain: "immigration",
    date: "2024-01-01",
    leftEdge: -0.4,
    rightEdge: 0.7,
    center: 0.15,
    width: 1.1,
    evidence:
      "Window shifted right on border security. Even Democrats adopted stricter border rhetoric. Mass deportation discussions entered mainstream.",
    keyEvents: [
      "Border crisis coverage intensified",
      "Bipartisan border bill",
      "Cities pushing back on migrant busing",
    ],
  },

  // ── Free Speech / Censorship ───────────────────────────────────
  {
    domain: "free-speech-censorship",
    date: "2012-01-01",
    leftEdge: -0.3,
    rightEdge: 0.3,
    center: 0.0,
    width: 0.6,
    evidence:
      "Broad bipartisan consensus on free speech. ACLU defended offensive speech. Both sides broadly supported First Amendment absolutism.",
  },
  {
    domain: "free-speech-censorship",
    date: "2018-01-01",
    leftEdge: -0.6,
    rightEdge: 0.4,
    center: -0.1,
    width: 1.0,
    evidence:
      "Left shifted toward content moderation as acceptable. 'Hate speech' restrictions entered mainstream discourse. Platform deplatforming became normalized.",
    keyEvents: [
      "Alex Jones deplatformed across major platforms",
      "Content moderation debates intensified",
    ],
  },
  {
    domain: "free-speech-censorship",
    date: "2024-01-01",
    leftEdge: -0.5,
    rightEdge: 0.6,
    center: 0.05,
    width: 1.1,
    evidence:
      "Pendulum swung back. Government involvement in content moderation became controversial. Free speech positions regained ground.",
    keyEvents: [
      "Twitter/X acquisition and policy changes",
      "Missouri v. Biden",
      "Congressional hearings on censorship",
    ],
  },

  // ── Healthcare ─────────────────────────────────────────────────
  {
    domain: "healthcare",
    date: "2008-01-01",
    leftEdge: -0.4,
    rightEdge: 0.3,
    center: -0.05,
    width: 0.7,
    evidence:
      "Single-payer was outside the window. Public option was the left edge. Market-based reforms were mainstream right.",
  },
  {
    domain: "healthcare",
    date: "2016-01-01",
    leftEdge: -0.6,
    rightEdge: 0.3,
    center: -0.15,
    width: 0.9,
    evidence:
      "ACA shifted window left. 'Medicare for All' entered mainstream discourse via Sanders campaign.",
    keyEvents: ["Sanders 2016 campaign", "ACA established as baseline"],
  },
  {
    domain: "healthcare",
    date: "2024-01-01",
    leftEdge: -0.5,
    rightEdge: 0.4,
    center: -0.05,
    width: 0.9,
    evidence:
      "Medicare for All receded from mainstream. Focus shifted to drug pricing and ACA preservation. Window stabilized.",
  },

  // ── Media Trust ────────────────────────────────────────────────
  {
    domain: "media-trust",
    date: "2010-01-01",
    leftEdge: -0.3,
    rightEdge: 0.2,
    center: -0.05,
    width: 0.5,
    evidence:
      "Mainstream media still broadly trusted. Criticizing media was seen as fringe right-wing position.",
  },
  {
    domain: "media-trust",
    date: "2018-01-01",
    leftEdge: -0.3,
    rightEdge: 0.7,
    center: 0.2,
    width: 1.0,
    evidence:
      "Window shifted dramatically. 'Fake news' / media distrust became mainstream. Criticizing media moved from fringe to popular.",
    keyEvents: [
      "'Fake news' entered lexicon",
      "Trust in media hit record lows",
      "'Enemy of the people' rhetoric",
    ],
  },
  {
    domain: "media-trust",
    date: "2024-01-01",
    leftEdge: -0.2,
    rightEdge: 0.8,
    center: 0.3,
    width: 1.0,
    evidence:
      "Media distrust is now bipartisan to varying degrees. Independent media and podcasts seen as more trusted than legacy outlets by large segments.",
    keyEvents: [
      "Podcast audiences surpass cable news",
      "Legacy media layoffs",
      "Substack/independent journalism growth",
    ],
  },
];

// ─── Window Analysis Functions ──────────────────────────────────────

/**
 * Get the most recent window snapshot for a domain
 */
export function getCurrentWindow(domain: PolicyDomain): WindowSnapshot | undefined {
  const domainSnapshots = WINDOW_HISTORY
    .filter((s) => s.domain === domain)
    .sort((a, b) => b.date.localeCompare(a.date));
  return domainSnapshots[0];
}

/**
 * Get all historical snapshots for a domain, chronologically
 */
export function getWindowHistory(domain: PolicyDomain): WindowSnapshot[] {
  return WINDOW_HISTORY
    .filter((s) => s.domain === domain)
    .sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Determine what Overton degree a position has relative to the current window
 */
export function classifyPosition(
  positionOnScale: number,
  window: WindowSnapshot
): OvertonDegree {
  const distFromCenter = Math.abs(positionOnScale - window.center);
  const halfWidth = window.width / 2;

  // Is the position inside the window?
  if (positionOnScale >= window.leftEdge && positionOnScale <= window.rightEdge) {
    // How close to center?
    const relativePosition = distFromCenter / halfWidth;
    if (relativePosition < 0.2) return "policy";
    if (relativePosition < 0.4) return "popular";
    if (relativePosition < 0.6) return "sensible";
    if (relativePosition < 0.8) return "acceptable";
    return "acceptable";
  }

  // Outside the window — how far?
  const distFromEdge =
    positionOnScale < window.leftEdge
      ? window.leftEdge - positionOnScale
      : positionOnScale - window.rightEdge;

  if (distFromEdge < 0.2) return "radical";
  return "unthinkable";
}

/**
 * Calculate how the window has shifted between two time periods for a domain
 */
export function calculateWindowShift(
  domain: PolicyDomain,
  fromDate: string,
  toDate: string
): {
  centerShift: number;
  widthChange: number;
  direction: "left" | "right" | "stable";
  interpretation: string;
} | null {
  const history = getWindowHistory(domain);
  const fromSnapshot = history.find((s) => s.date >= fromDate);
  const toSnapshot = [...history].reverse().find((s) => s.date <= toDate);

  if (!fromSnapshot || !toSnapshot) return null;

  const centerShift = toSnapshot.center - fromSnapshot.center;
  const widthChange = toSnapshot.width - fromSnapshot.width;

  let direction: "left" | "right" | "stable" = "stable";
  if (centerShift < -0.1) direction = "left";
  else if (centerShift > 0.1) direction = "right";

  let interpretation = `The Overton window on ${domain} `;
  if (direction === "stable") {
    interpretation += "has remained relatively stable.";
  } else {
    interpretation += `has shifted ${direction} by ${Math.abs(centerShift).toFixed(2)} points.`;
  }

  if (widthChange > 0.15) {
    interpretation += " The range of acceptable discourse has widened.";
  } else if (widthChange < -0.15) {
    interpretation += " The range of acceptable discourse has narrowed (more polarized).";
  }

  return { centerShift, widthChange, direction, interpretation };
}

/**
 * Map a pundit's known positions to the current Overton windows
 */
export function mapPunditToWindow(
  positions: PunditPosition[]
): {
  mappings: PositionMapping[];
  outsideCount: number;
  edgeCount: number;
  insideCount: number;
} {
  const mappings: PositionMapping[] = [];
  let outsideCount = 0;
  let edgeCount = 0;
  let insideCount = 0;

  for (const pos of positions) {
    const window = getCurrentWindow(pos.domain);
    if (!window) continue;

    const degree = classifyPosition(pos.positionOnScale, window);

    // Distance from nearest edge
    let distanceFromEdge: number;
    if (pos.positionOnScale < window.leftEdge) {
      distanceFromEdge = pos.positionOnScale - window.leftEdge; // negative = outside left
    } else if (pos.positionOnScale > window.rightEdge) {
      distanceFromEdge = pos.positionOnScale - window.rightEdge; // positive = outside right
    } else {
      // Inside — distance to nearest edge (negative = inside)
      distanceFromEdge = -Math.min(
        pos.positionOnScale - window.leftEdge,
        window.rightEdge - pos.positionOnScale
      );
    }

    // Determine trend
    let trend: PositionMapping["trend"] = "stable";
    if (pos.historicalDegree) {
      const degreeOrder: OvertonDegree[] = [
        "policy", "popular", "sensible", "acceptable", "radical", "unthinkable",
      ];
      const currentIdx = degreeOrder.indexOf(degree);
      const historicalIdx = degreeOrder.indexOf(pos.historicalDegree);
      if (currentIdx < historicalIdx) trend = "normalizing";
      else if (currentIdx > historicalIdx) trend = "radicalizing";
    }

    if (degree === "radical" || degree === "unthinkable") outsideCount++;
    else if (degree === "acceptable") edgeCount++;
    else insideCount++;

    mappings.push({
      position: {
        id: `${pos.domain}-pos`,
        domain: pos.domain,
        description: pos.positionDescription,
        direction: pos.positionOnScale < 0 ? "left" : pos.positionOnScale > 0 ? "right" : "nonpartisan",
        extremity: Math.abs(pos.positionOnScale),
      },
      degree,
      positionOnScale: pos.positionOnScale,
      distanceFromEdge,
      trend,
    });
  }

  return { mappings, outsideCount, edgeCount, insideCount };
}

/**
 * Get all tracked policy domains
 */
export function getTrackedDomains(): PolicyDomain[] {
  return [...new Set(WINDOW_HISTORY.map((s) => s.domain))];
}
