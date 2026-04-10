/**
 * Multi-Axis Political Positioning Model
 *
 * People are not simply "left" or "right." This model places individuals
 * and organizations on multiple independent axes, each representing a
 * genuine ideological spectrum with clearly defined poles.
 *
 * IMPORTANT: These axes are INDEPENDENT. A person can be a free-speech
 * capitalist progressive isolationist. The axes don't bundle together
 * the way party affiliation implies.
 *
 * ═══════════════════════════════════════════════════════════════════════
 *
 * AXIS 1: Economic System — Capitalist ←→ Communist
 *
 *   Capitalist: Private ownership of means of production. Markets allocate
 *   resources via price signals. Inequality is an acceptable (or even
 *   productive) byproduct because it reflects the Pareto distribution that
 *   emerges naturally in complex systems.
 *
 *   Communist: Collective/state ownership of means of production. Central
 *   planning allocates resources. Inequality is a systemic failure to be
 *   eliminated through structural control.
 *
 *   Middle ground includes: mixed economies, social democracy, regulated
 *   capitalism, market socialism.
 *
 * ═══════════════════════════════════════════════════════════════════════
 *
 * AXIS 2: Speech — Free Speech ←→ Reasonable Censorship
 *
 *   Free Speech: The answer to bad speech is more speech. Government and
 *   institutions should not restrict expression. Even offensive or wrong
 *   speech must be protected because the power to censor will inevitably
 *   be misused.
 *
 *   Reasonable Censorship: Some speech causes measurable harm (incitement,
 *   disinformation, harassment). Institutions have a responsibility to
 *   limit harmful speech. The question is where to draw the line, not
 *   whether a line should exist.
 *
 * ═══════════════════════════════════════════════════════════════════════
 *
 * AXIS 3: Progressive ←→ Non-Progressive
 *
 *   HISTORICAL CONTEXT: Progressivism originates in the late 1800s
 *   (Progressive Era, ~1890s-1920s). The core thread: society has
 *   structural inequities that disadvantage certain groups, and
 *   government/institutional intervention should create EQUITY —
 *   targeted support that offsets individual deficits (poverty,
 *   discrimination, disability, geography, etc.).
 *
 *   Progressive: People start from unequal positions due to factors
 *   beyond their control. A just system provides equity — differential
 *   support calibrated to individual disadvantage — to produce more
 *   equal outcomes. The Pareto distribution, when applied to human
 *   wellbeing, is a market failure that policy should correct.
 *
 *   Non-Progressive: Equity interventions introduce friction, perverse
 *   incentives, and bureaucratic overhead that reduce total system
 *   output. The Pareto distribution is a natural emergent property of
 *   complex systems — attempting to flatten it doesn't uplift the
 *   bottom, it degrades the whole. Equality of opportunity (not
 *   outcome) is the achievable and desirable goal.
 *
 *   THIS IS NOT THE SAME AS LIBERAL/CONSERVATIVE. A conservative can
 *   support progressive policies (e.g., Teddy Roosevelt was a
 *   progressive Republican). A liberal can oppose equity mandates.
 *
 * ═══════════════════════════════════════════════════════════════════════
 *
 * AXIS 4: Liberal ←→ Conservative
 *
 *   Liberal: Wants to maximize equality of opportunity and individual
 *   freedom regardless of existing systems. Willing to change the status
 *   quo — laws, institutions, norms — when they produce unequal
 *   outcomes. The risk of change is worth the potential for a more
 *   equal and free society.
 *
 *   Conservative: Wants to preserve the status quo of the previous 1-2
 *   generations. Existing systems, institutions, and norms represent
 *   accumulated wisdom and stability. Change carries risk — especially
 *   rapid change — and the burden of proof is on those proposing it.
 *   Stability and continuity have inherent value.
 *
 *   KEY DISTINCTION FROM PROGRESSIVE:
 *   - Liberal/conservative is about PACE AND RISK TOLERANCE for change.
 *   - Progressive/non-progressive is about WHETHER EQUITY INTERVENTIONS
 *     are the right mechanism for change.
 *   - A liberal might want change through deregulation (not progressive).
 *   - A progressive might want equity programs preserved (conservative
 *     in the sense of maintaining existing programs).
 *
 * ═══════════════════════════════════════════════════════════════════════
 *
 * AXIS 5: Foreign Policy — Isolationist ←→ War Hawk
 *
 *   Isolationist: Prioritize domestic affairs. Avoid foreign entanglements,
 *   military interventions, and alliance obligations that don't directly
 *   serve national interest. Trade and diplomacy yes; military projection no.
 *
 *   War Hawk (Interventionist): Active military and diplomatic engagement
 *   abroad is necessary to protect national interests, maintain global
 *   order, and prevent threats from growing. American/Western power
 *   projection is a stabilizing force.
 *
 *   Middle ground includes: strategic engagement, selective intervention,
 *   diplomatic pressure without military action.
 *
 * ═══════════════════════════════════════════════════════════════════════
 */

// ─── Core Types ─────────────────────────────────────────────────────

export type AxisId =
  | "economic"
  | "speech"
  | "progressive"
  | "liberal-conservative"
  | "foreign-policy";

export interface PoliticalAxis {
  id: AxisId;
  name: string;
  leftLabel: string;  // -1 end
  rightLabel: string; // +1 end
  description: string;
  /** Common misconceptions about this axis */
  misconceptions: string[];
  /** How this axis relates to (or is independent from) other axes */
  independenceNotes: string;
}

export interface AxisPosition {
  axisId: AxisId;
  /** -1.0 to 1.0. Negative = left label, positive = right label, 0 = center */
  value: number;
  /** Confidence in this assessment (0-1) */
  confidence: number;
  /** Evidence/reasoning for this placement */
  evidence: string;
  /** Has this position shifted over time? */
  trend?: "moving-left" | "stable" | "moving-right";
}

export interface PoliticalProfile {
  entityId: string; // Pundit ID or organization ID
  entityName: string;
  assessedAt: string;
  axes: AxisPosition[];
  /** Overall coherence — do the positions form a consistent ideology or are they scattered? */
  ideologicalCoherence: number; // 0 = scattered, 1 = highly consistent
  /** Notes on notable contradictions or surprising combinations */
  notes: string;
}

export interface AxisSnapshot {
  entityId: string;
  date: string;
  axes: AxisPosition[];
}

// ─── Axis Definitions ───────────────────────────────────────────────

export const POLITICAL_AXES: PoliticalAxis[] = [
  {
    id: "economic",
    name: "Economic System",
    leftLabel: "Capitalist",
    rightLabel: "Communist",
    description:
      "How should economic resources be owned and allocated? Private markets vs. collective/state control.",
    misconceptions: [
      "Capitalist ≠ anti-regulation. Most capitalists support some regulation.",
      "Communist ≠ 'wants free stuff.' It's a theory of ownership and allocation.",
      "This axis is about the SYSTEM, not individual generosity.",
    ],
    independenceNotes:
      "Independent from liberal/conservative. A conservative can support regulated capitalism. A liberal can support free markets. The axis measures the preferred ownership/allocation model, not the pace of change.",
  },
  {
    id: "speech",
    name: "Speech & Expression",
    leftLabel: "Free Speech Absolutist",
    rightLabel: "Reasonable Censorship",
    description:
      "Should institutions restrict expression to prevent harm, or is unrestricted expression itself the safeguard?",
    misconceptions: [
      "Free speech absolutism ≠ endorsing bad speech. It's about who holds the power to restrict.",
      "Reasonable censorship ≠ authoritarianism. It's about harm prevention.",
      "This is about INSTITUTIONAL power over speech, not social consequences.",
    ],
    independenceNotes:
      "Historically bipartisan. The ACLU (left) used to be free-speech absolutist. The religious right (right) used to favor censorship of obscenity. The alignment of these positions with left/right has flipped in the last decade.",
  },
  {
    id: "progressive",
    name: "Equity Approach",
    leftLabel: "Progressive (Equity)",
    rightLabel: "Non-Progressive (Efficiency)",
    description:
      "Should society provide targeted equity interventions to offset individual disadvantages, or do such interventions reduce overall system efficiency? Rooted in the Progressive Era (1890s-1920s).",
    misconceptions: [
      "Progressive ≠ liberal. Teddy Roosevelt was a progressive REPUBLICAN.",
      "Non-progressive ≠ heartless. The argument is about system-level effects, not individual compassion.",
      "This is about EQUITY (targeted support) vs. EQUALITY (same rules for all), not about whether inequality exists.",
      "The Pareto principle is central: progressives see it as a problem to correct; non-progressives see it as an emergent property of complex systems.",
    ],
    independenceNotes:
      "This is the most commonly confused axis. People conflate progressive with liberal, but they measure different things. Progressive is about WHETHER equity interventions work. Liberal/conservative is about the PACE of change and risk tolerance.",
  },
  {
    id: "liberal-conservative",
    name: "Change Tolerance",
    leftLabel: "Liberal",
    rightLabel: "Conservative",
    description:
      "Liberal: maximize equality and freedom by changing systems that produce unequal outcomes. Conservative: preserve the status quo of the previous 1-2 generations; stability and continuity have inherent value; the burden of proof is on those proposing change.",
    misconceptions: [
      "Conservative ≠ regressive. Conserving what works is different from rolling things back.",
      "Liberal ≠ progressive. A liberal might want change through deregulation (anti-progressive).",
      "What is 'conservative' changes over time — today's status quo was yesterday's radical change.",
      "A progressive who wants to PRESERVE existing equity programs is being conservative about those programs.",
    ],
    independenceNotes:
      "Measures PACE AND RISK TOLERANCE for change, not the direction. Independent from the progressive axis: a liberal might want rapid deregulation (change, but non-progressive). A conservative might defend existing social programs (status quo preservation of progressive policies).",
  },
  {
    id: "foreign-policy",
    name: "Foreign Policy",
    leftLabel: "Isolationist",
    rightLabel: "Interventionist (War Hawk)",
    description:
      "Should the nation focus domestically and avoid foreign entanglements, or actively project power and intervene internationally?",
    misconceptions: [
      "Isolationist ≠ anti-trade. Most isolationists support trade, just not military intervention.",
      "Interventionist ≠ warmonger. It includes diplomatic pressure and alliance maintenance.",
      "This axis doesn't map cleanly to left/right — there are isolationists and hawks on both sides.",
    ],
    independenceNotes:
      "Highly independent from other axes. The progressive left and populist right often share isolationist tendencies. Neoconservatives (right) and liberal interventionists (left) share hawkish tendencies. This axis frequently cuts across all others.",
  },
];

// ─── Seed Profiles ──────────────────────────────────────────────────

export const SEED_PROFILES: PoliticalProfile[] = [
  {
    entityId: "philip-defranco",
    entityName: "Philip DeFranco",
    assessedAt: "2024-01-01",
    axes: [
      {
        axisId: "economic",
        value: -0.3,
        confidence: 0.5,
        evidence:
          "Generally supportive of market economy with social safety nets. Doesn't advocate for major systemic economic change.",
      },
      {
        axisId: "speech",
        value: 0.3,
        confidence: 0.6,
        evidence:
          "Has shifted from free-speech-leaning to supporting platform moderation decisions. Generally defers to platform authority on content decisions.",
        trend: "moving-right",
      },
      {
        axisId: "progressive",
        value: -0.5,
        confidence: 0.6,
        evidence:
          "Consistently frames stories through an equity lens. Supports targeted interventions for disadvantaged groups.",
        trend: "moving-left",
      },
      {
        axisId: "liberal-conservative",
        value: -0.5,
        confidence: 0.7,
        evidence:
          "Advocates for change on social issues. Frames status quo as insufficient. Has become less interested in hearing conservative counter-arguments over time.",
        trend: "moving-left",
      },
      {
        axisId: "foreign-policy",
        value: 0.0,
        confidence: 0.3,
        evidence:
          "Rarely covers foreign policy in depth. No strong signal.",
      },
    ],
    ideologicalCoherence: 0.6,
    notes:
      "Profile has shifted notably leftward over the past decade. Early content showed more ideological diversity. Current content clusters on the progressive-liberal side with less engagement with opposing views.",
  },
  {
    entityId: "tucker-carlson",
    entityName: "Tucker Carlson",
    assessedAt: "2024-01-01",
    axes: [
      {
        axisId: "economic",
        value: -0.3,
        confidence: 0.6,
        evidence:
          "Populist economic positions. Critical of corporate power, big tech, and Wall Street. Not a free-market purist.",
      },
      {
        axisId: "speech",
        value: -0.7,
        confidence: 0.8,
        evidence:
          "Strong free-speech advocate. Opposes platform censorship and government involvement in content moderation.",
      },
      {
        axisId: "progressive",
        value: 0.6,
        confidence: 0.7,
        evidence:
          "Opposes equity mandates and DEI. Frames progressive interventions as eroding meritocracy and efficiency.",
      },
      {
        axisId: "liberal-conservative",
        value: 0.5,
        confidence: 0.7,
        evidence:
          "Frames most change as risky. Appeals to traditional values and past stability. However, his post-Fox trajectory introduces non-traditional elements.",
      },
      {
        axisId: "foreign-policy",
        value: -0.7,
        confidence: 0.8,
        evidence:
          "Strongly isolationist. Opposes Ukraine aid, Middle East intervention. However, post-Fox content raises questions about alignment with specific foreign interests (Dubai, Russia interviews).",
        trend: "moving-left",
      },
    ],
    ideologicalCoherence: 0.5,
    notes:
      "Unusual profile: populist economics (left-coded), strong free speech (traditionally left, now right-coded), anti-progressive, conservative, but strongly isolationist. Post-Fox trajectory adds foreign interest questions that don't fit neatly on any axis.",
  },
  {
    entityId: "candace-owens",
    entityName: "Candace Owens",
    assessedAt: "2024-01-01",
    axes: [
      {
        axisId: "economic",
        value: -0.5,
        confidence: 0.5,
        evidence:
          "Generally pro-capitalist messaging. Supports entrepreneurship, opposes heavy regulation.",
      },
      {
        axisId: "speech",
        value: -0.5,
        confidence: 0.6,
        evidence:
          "Pro-free-speech, anti-censorship. But primarily frames this in terms of conservative speech being censored.",
      },
      {
        axisId: "progressive",
        value: 0.7,
        confidence: 0.7,
        evidence:
          "Strongly anti-equity, anti-DEI. Frames progressive policies as harmful to the communities they claim to help.",
      },
      {
        axisId: "liberal-conservative",
        value: 0.6,
        confidence: 0.6,
        evidence:
          "Initially conservative. Has moved beyond conservatism into conspiratorial territory that doesn't map to the liberal-conservative axis cleanly.",
        trend: "moving-right",
      },
      {
        axisId: "foreign-policy",
        value: -0.3,
        confidence: 0.4,
        evidence:
          "Leans isolationist but inconsistently. Positions seem driven by contrarianism rather than a coherent foreign policy philosophy.",
      },
    ],
    ideologicalCoherence: 0.4,
    notes:
      "Started as a coherent conservative voice. Ideological coherence has declined as positions increasingly driven by engagement/controversy rather than consistent philosophy. Conspiracy content doesn't map to any axis — it's orthogonal to political ideology.",
  },
  {
    entityId: "nick-fuentes",
    entityName: "Nick Fuentes",
    assessedAt: "2024-01-01",
    axes: [
      {
        axisId: "economic",
        value: -0.2,
        confidence: 0.5,
        evidence:
          "Public persona: vaguely populist-capitalist. Private persona: more sympathetic to state economic control for nationalist ends.",
      },
      {
        axisId: "speech",
        value: -0.8,
        confidence: 0.6,
        evidence:
          "Advocates free speech, but primarily instrumentally — as protection for his own speech. Less principled defense of speech he disagrees with.",
      },
      {
        axisId: "progressive",
        value: 0.9,
        confidence: 0.8,
        evidence:
          "Strongly anti-equity, anti-progressive. Views progressive policies as actively destructive.",
      },
      {
        axisId: "liberal-conservative",
        value: 0.9,
        confidence: 0.7,
        evidence:
          "Beyond conservative — wants to roll back changes from multiple generations, not just preserve recent status quo. This is closer to reactionary than conservative by our definition.",
      },
      {
        axisId: "foreign-policy",
        value: -0.6,
        confidence: 0.6,
        evidence:
          "America First isolationism. Opposes most foreign intervention and aid.",
      },
    ],
    ideologicalCoherence: 0.7,
    notes:
      "CRITICAL: This profile has a known PERSONA DIVERGENCE. Public-facing content is moderated; personal streaming content is significantly more extreme. Scores here represent the blended assessment. The private persona would score more extreme on every axis. This divergence is itself a data point — it suggests strategic positioning relative to the Overton window.",
  },
  {
    entityId: "ben-shapiro",
    entityName: "Ben Shapiro",
    assessedAt: "2024-01-01",
    axes: [
      {
        axisId: "economic",
        value: -0.7,
        confidence: 0.8,
        evidence:
          "Strongly pro-free-market. Consistent capitalist positions. Opposes most government economic intervention.",
      },
      {
        axisId: "speech",
        value: -0.6,
        confidence: 0.7,
        evidence:
          "Pro-free-speech. Opposes campus speech codes and platform censorship. Has spoken at university free speech events.",
      },
      {
        axisId: "progressive",
        value: 0.6,
        confidence: 0.7,
        evidence:
          "Opposes equity mandates, DEI, affirmative action. Argues for equality of opportunity over equality of outcome.",
      },
      {
        axisId: "liberal-conservative",
        value: 0.6,
        confidence: 0.8,
        evidence:
          "Consistently conservative. Values tradition, religious frameworks, institutional stability. Skeptical of rapid social change.",
      },
      {
        axisId: "foreign-policy",
        value: 0.5,
        confidence: 0.7,
        evidence:
          "Interventionist, particularly regarding Israel and Middle East policy. Supports strong military posture.",
      },
    ],
    ideologicalCoherence: 0.8,
    notes:
      "Highly coherent ideological profile — positions are internally consistent and predictable. Uses rapid debate style that can itself be a vector for fallacies (particularly gish gallop). Coherence doesn't mean correctness, but it does mean positions are philosophy-driven rather than engagement-driven.",
  },
];

// ─── Analysis Functions ─────────────────────────────────────────────

/**
 * Get the axis definition by ID
 */
export function getAxis(id: AxisId): PoliticalAxis | undefined {
  return POLITICAL_AXES.find((a) => a.id === id);
}

/**
 * Get a human-readable label for a position on an axis
 */
export function getPositionLabel(axisId: AxisId, value: number): string {
  const axis = getAxis(axisId);
  if (!axis) return "Unknown";

  const absValue = Math.abs(value);
  let intensity: string;
  if (absValue < 0.15) intensity = "Centrist";
  else if (absValue < 0.35) intensity = "Leaning";
  else if (absValue < 0.6) intensity = "Moderate";
  else if (absValue < 0.8) intensity = "Strong";
  else intensity = "Extreme";

  if (intensity === "Centrist") return `Centrist on ${axis.name}`;

  const direction = value < 0 ? axis.leftLabel : axis.rightLabel;
  return `${intensity} ${direction}`;
}

/**
 * Compare two profiles and identify where they agree and disagree
 */
export function compareProfiles(
  a: PoliticalProfile,
  b: PoliticalProfile
): {
  agreements: { axis: AxisId; description: string }[];
  disagreements: { axis: AxisId; distance: number; description: string }[];
  overallSimilarity: number;
} {
  const agreements: { axis: AxisId; description: string }[] = [];
  const disagreements: { axis: AxisId; distance: number; description: string }[] = [];

  let totalDistance = 0;
  let axisCount = 0;

  for (const axisA of a.axes) {
    const axisB = b.axes.find((ab) => ab.axisId === axisA.axisId);
    if (!axisB) continue;

    const distance = Math.abs(axisA.value - axisB.value);
    totalDistance += distance;
    axisCount++;

    const axis = getAxis(axisA.axisId);
    if (!axis) continue;

    if (distance < 0.3) {
      agreements.push({
        axis: axisA.axisId,
        description: `Both ${a.entityName} and ${b.entityName} are ${getPositionLabel(axisA.axisId, (axisA.value + axisB.value) / 2)}.`,
      });
    } else {
      disagreements.push({
        axis: axisA.axisId,
        distance,
        description: `${a.entityName} is ${getPositionLabel(axisA.axisId, axisA.value)} while ${b.entityName} is ${getPositionLabel(axisB.axisId, axisB.value)}.`,
      });
    }
  }

  const overallSimilarity =
    axisCount > 0 ? 1 - totalDistance / (axisCount * 2) : 0;

  return {
    agreements,
    disagreements: disagreements.sort((a, b) => b.distance - a.distance),
    overallSimilarity,
  };
}

/**
 * Detect if a profile shows signs of being engagement-driven vs. philosophy-driven
 *
 * Engagement-driven: positions shift frequently, low coherence, positions
 * align with whatever generates attention.
 *
 * Philosophy-driven: positions are stable, internally consistent, predictable
 * from first principles.
 */
export function assessCoherenceType(
  profile: PoliticalProfile
): {
  type: "philosophy-driven" | "engagement-driven" | "mixed";
  confidence: number;
  reasoning: string;
} {
  const coherence = profile.ideologicalCoherence;
  const shiftingAxes = profile.axes.filter(
    (a) => a.trend === "moving-left" || a.trend === "moving-right"
  ).length;
  const totalAxes = profile.axes.length;
  const shiftRatio = totalAxes > 0 ? shiftingAxes / totalAxes : 0;

  if (coherence >= 0.7 && shiftRatio < 0.3) {
    return {
      type: "philosophy-driven",
      confidence: coherence,
      reasoning: `${profile.entityName}'s positions are internally consistent (coherence: ${coherence.toFixed(2)}) with minimal drift. Positions appear driven by a consistent underlying philosophy.`,
    };
  }

  if (coherence < 0.5 || shiftRatio > 0.5) {
    return {
      type: "engagement-driven",
      confidence: 1 - coherence,
      reasoning: `${profile.entityName}'s positions show low internal consistency (coherence: ${coherence.toFixed(2)}) and/or significant drift (${shiftingAxes}/${totalAxes} axes shifting). Positions may be driven by audience engagement rather than consistent philosophy.`,
    };
  }

  return {
    type: "mixed",
    confidence: 0.5,
    reasoning: `${profile.entityName} shows a mix of consistent and shifting positions. Some axes are stable while others are in flux.`,
  };
}

/**
 * Get a profile by entity ID
 */
export function getProfile(entityId: string): PoliticalProfile | undefined {
  return SEED_PROFILES.find((p) => p.entityId === entityId);
}
