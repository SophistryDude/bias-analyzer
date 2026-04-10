/**
 * Pundit Registry — Seed Data
 *
 * Known media figures across the political spectrum.
 * Each entry tracks their platform, known bias, and how that bias
 * has shifted over time.
 */

import type { Pundit } from "../../lib/models/types";

export const PUNDIT_REGISTRY: Pundit[] = [
  // ── Left / Center-Left ──────────────────────────────────────────
  {
    id: "philip-defranco",
    name: "Philip DeFranco",
    slug: "philip-defranco",
    platforms: ["youtube"],
    currentLeaning: "left",
    leaningHistory: [
      {
        date: "2015-01-01",
        leaning: "center",
        evidence:
          "Early content covered stories from multiple angles with genuine both-sides presentation.",
      },
      {
        date: "2018-01-01",
        leaning: "center-left",
        evidence:
          "Began showing consistent framing preference on social and cultural issues.",
      },
      {
        date: "2021-01-01",
        leaning: "left",
        evidence:
          "Coverage increasingly one-directional. Hostile framing toward right-wing figures, sympathetic framing toward left-wing positions.",
      },
    ],
    description:
      "YouTube news commentator. Started as a relatively neutral voice covering internet and pop culture news. Has shifted significantly leftward over the past decade.",
    knownFor: [
      "The Philip DeFranco Show",
      "YouTube news commentary",
      "Pop culture coverage",
    ],
    externalLinks: [
      { platform: "youtube", url: "https://youtube.com/@PhilipDeFranco" },
    ],
    tags: ["youtube", "news-commentary", "pop-culture"],
    analysisCount: 0,
    averageBiasScore: 0,
    averageManipulationScore: 0,
  },
  {
    id: "rachel-maddow",
    name: "Rachel Maddow",
    slug: "rachel-maddow",
    platforms: ["cable-news"],
    currentLeaning: "left",
    leaningHistory: [
      {
        date: "2008-01-01",
        leaning: "left",
        evidence: "Launched MSNBC show with openly progressive perspective.",
      },
    ],
    description:
      "MSNBC host and political commentator. Openly progressive perspective with a focus on investigative-style segments.",
    knownFor: ["The Rachel Maddow Show", "MSNBC", "Russia coverage"],
    externalLinks: [],
    tags: ["cable-news", "progressive", "msnbc"],
    analysisCount: 0,
    averageBiasScore: 0,
    averageManipulationScore: 0,
  },
  {
    id: "don-lemon",
    name: "Don Lemon",
    slug: "don-lemon",
    platforms: ["cable-news", "youtube"],
    currentLeaning: "left",
    leaningHistory: [
      {
        date: "2014-01-01",
        leaning: "center-left",
        evidence: "CNN anchor with moderate liberal lean.",
      },
      {
        date: "2020-01-01",
        leaning: "left",
        evidence:
          "Increasingly editorial commentary blended with news anchoring.",
      },
    ],
    description:
      "Former CNN anchor, now independent media. Known for blending editorial commentary with news presentation.",
    knownFor: ["CNN Tonight", "Editorial commentary"],
    externalLinks: [],
    tags: ["cable-news", "commentary"],
    analysisCount: 0,
    averageBiasScore: 0,
    averageManipulationScore: 0,
  },

  // ── Center ──────────────────────────────────────────────────────
  {
    id: "tim-pool",
    name: "Tim Pool",
    slug: "tim-pool",
    platforms: ["youtube", "podcast"],
    currentLeaning: "right",
    leaningHistory: [
      {
        date: "2016-01-01",
        leaning: "center-left",
        evidence:
          "Covered Occupy Wall Street, presented as independent journalist with progressive leanings.",
      },
      {
        date: "2019-01-01",
        leaning: "center-right",
        evidence:
          "Shifted focus to anti-establishment and anti-mainstream-media narratives.",
      },
      {
        date: "2022-01-01",
        leaning: "right",
        evidence:
          "Content almost exclusively focused on right-leaning narratives and culture war topics.",
      },
    ],
    description:
      "Independent media figure who shifted from left-leaning independent journalist to right-leaning commentator.",
    knownFor: ["Timcast", "Independent journalism", "Culture war coverage"],
    externalLinks: [
      { platform: "youtube", url: "https://youtube.com/@Timcast" },
    ],
    tags: ["youtube", "independent", "political-commentary"],
    analysisCount: 0,
    averageBiasScore: 0,
    averageManipulationScore: 0,
  },
  {
    id: "breaking-points",
    name: "Breaking Points (Krystal & Saagar)",
    slug: "breaking-points",
    platforms: ["youtube", "podcast"],
    currentLeaning: "center",
    leaningHistory: [
      {
        date: "2021-01-01",
        leaning: "center",
        evidence:
          "Launched as explicitly cross-partisan show with left (Krystal Ball) and right (Saagar Enjeti) hosts.",
      },
    ],
    description:
      "Cross-partisan news show featuring hosts from different political perspectives. Anti-establishment focus.",
    knownFor: [
      "Breaking Points",
      "Cross-partisan dialogue",
      "Anti-establishment",
    ],
    externalLinks: [
      { platform: "youtube", url: "https://youtube.com/@breakingpoints" },
    ],
    tags: ["youtube", "podcast", "cross-partisan"],
    analysisCount: 0,
    averageBiasScore: 0,
    averageManipulationScore: 0,
  },

  // ── Right / Center-Right ────────────────────────────────────────
  {
    id: "tucker-carlson",
    name: "Tucker Carlson",
    slug: "tucker-carlson",
    platforms: ["youtube", "streaming"],
    currentLeaning: "right",
    leaningHistory: [
      {
        date: "2016-01-01",
        leaning: "right",
        evidence: "Fox News host with mainstream conservative positions.",
      },
      {
        date: "2023-01-01",
        leaning: "right",
        evidence:
          "Post-Fox independent media. Content has raised questions about foreign influence, particularly Middle Eastern interests (Dubai).",
      },
    ],
    description:
      "Former Fox News host, now independent media. Known for populist right-wing commentary. Post-Fox content has raised questions about foreign interest alignment.",
    knownFor: [
      "Tucker Carlson Tonight",
      "Fox News",
      "Populist commentary",
      "Tucker on X",
    ],
    externalLinks: [],
    tags: ["cable-news", "independent", "populist", "right-wing"],
    analysisCount: 0,
    averageBiasScore: 0,
    averageManipulationScore: 0,
  },
  {
    id: "candace-owens",
    name: "Candace Owens",
    slug: "candace-owens",
    platforms: ["youtube", "podcast"],
    currentLeaning: "far-right",
    leaningHistory: [
      {
        date: "2018-01-01",
        leaning: "right",
        evidence:
          "Rose to prominence as a reasonable conservative voice, Turning Point USA.",
      },
      {
        date: "2022-01-01",
        leaning: "far-right",
        evidence:
          "Increasingly focused on conspiracy theories and sensationalist content for engagement.",
      },
    ],
    description:
      "Conservative commentator who began as a mainstream conservative voice and has shifted toward conspiracy-oriented content.",
    knownFor: [
      "Turning Point USA",
      "Daily Wire (former)",
      "Candace Owens Podcast",
    ],
    externalLinks: [],
    tags: ["conservative", "commentary", "conspiracy"],
    analysisCount: 0,
    averageBiasScore: 0,
    averageManipulationScore: 0,
  },
  {
    id: "nick-fuentes",
    name: "Nick Fuentes",
    slug: "nick-fuentes",
    platforms: ["youtube", "streaming"],
    currentLeaning: "far-right",
    leaningHistory: [
      {
        date: "2019-01-01",
        leaning: "far-right",
        evidence:
          "Entered public sphere with America First brand. Public persona is measured; private streaming persona is significantly more extreme.",
      },
    ],
    description:
      "America First commentator. Notable for significant persona divergence — measured public-facing content vs. extreme rhetoric on personal streaming platforms.",
    knownFor: ["America First", "Groypers", "Dual persona"],
    externalLinks: [],
    tags: ["far-right", "streaming", "persona-divergence"],
    analysisCount: 0,
    averageBiasScore: 0,
    averageManipulationScore: 0,
  },
  {
    id: "ben-shapiro",
    name: "Ben Shapiro",
    slug: "ben-shapiro",
    platforms: ["youtube", "podcast"],
    currentLeaning: "right",
    leaningHistory: [
      {
        date: "2015-01-01",
        leaning: "right",
        evidence: "Conservative commentator, Daily Wire founder.",
      },
    ],
    description:
      "Conservative commentator and Daily Wire founder. Known for rapid-fire debate style.",
    knownFor: ["The Daily Wire", "The Ben Shapiro Show", "Debate clips"],
    externalLinks: [
      { platform: "youtube", url: "https://youtube.com/@BenShapiro" },
    ],
    tags: ["conservative", "daily-wire", "debate"],
    analysisCount: 0,
    averageBiasScore: 0,
    averageManipulationScore: 0,
  },

  // ── Media Organizations ─────────────────────────────────────────
  {
    id: "cnn",
    name: "CNN",
    slug: "cnn",
    platforms: ["cable-news", "youtube"],
    currentLeaning: "left",
    leaningHistory: [
      {
        date: "2010-01-01",
        leaning: "center-left",
        evidence: "Mainstream news with moderate left-leaning editorial choices.",
      },
      {
        date: "2016-01-01",
        leaning: "left",
        evidence:
          "Significant leftward shift in editorial direction during and after 2016 election cycle.",
      },
    ],
    description: "Major cable news network. Has shifted notably leftward in editorial direction.",
    knownFor: ["24-hour news", "Cable news"],
    externalLinks: [],
    tags: ["cable-news", "mainstream-media", "organization"],
    analysisCount: 0,
    averageBiasScore: 0,
    averageManipulationScore: 0,
  },
  {
    id: "fox-news",
    name: "Fox News",
    slug: "fox-news",
    platforms: ["cable-news", "youtube"],
    currentLeaning: "right",
    leaningHistory: [
      {
        date: "1996-01-01",
        leaning: "center-right",
        evidence: "Launched as alternative to perceived liberal media bias.",
      },
      {
        date: "2015-01-01",
        leaning: "right",
        evidence: "Solidified as the primary right-leaning cable news network.",
      },
    ],
    description:
      "Major cable news network. Primary right-leaning mainstream news outlet.",
    knownFor: ["Cable news", "Conservative perspective"],
    externalLinks: [],
    tags: ["cable-news", "mainstream-media", "organization", "conservative"],
    analysisCount: 0,
    averageBiasScore: 0,
    averageManipulationScore: 0,
  },
  {
    id: "msnbc",
    name: "MSNBC",
    slug: "msnbc",
    platforms: ["cable-news", "youtube"],
    currentLeaning: "left",
    leaningHistory: [
      {
        date: "2008-01-01",
        leaning: "left",
        evidence: "Positioned as progressive counterpart to Fox News.",
      },
    ],
    description:
      "Cable news network. Openly progressive editorial direction.",
    knownFor: ["Progressive cable news", "MSNBC"],
    externalLinks: [],
    tags: ["cable-news", "mainstream-media", "organization", "progressive"],
    analysisCount: 0,
    averageBiasScore: 0,
    averageManipulationScore: 0,
  },
  {
    id: "nyt",
    name: "The New York Times",
    slug: "new-york-times",
    platforms: ["newspaper", "youtube"],
    currentLeaning: "left",
    leaningHistory: [
      {
        date: "2000-01-01",
        leaning: "center-left",
        evidence: "Considered paper of record with moderate liberal editorial lean.",
      },
      {
        date: "2016-01-01",
        leaning: "left",
        evidence: "Editorial and news coverage shifted further left during 2016+ era.",
      },
    ],
    description:
      "Major newspaper and digital news. Considered paper of record but has shifted editorially.",
    knownFor: ["Newspaper of record", "Investigative journalism"],
    externalLinks: [],
    tags: ["newspaper", "mainstream-media", "organization"],
    analysisCount: 0,
    averageBiasScore: 0,
    averageManipulationScore: 0,
  },
];

// ─── Helpers ────────────────────────────────────────────────────────

export function getPunditById(id: string): Pundit | undefined {
  return PUNDIT_REGISTRY.find((p) => p.id === id);
}

export function getPunditBySlug(slug: string): Pundit | undefined {
  return PUNDIT_REGISTRY.find((p) => p.slug === slug);
}

export function getPunditsByLeaning(
  leaning: Pundit["currentLeaning"]
): Pundit[] {
  return PUNDIT_REGISTRY.filter((p) => p.currentLeaning === leaning);
}

export function searchPundits(query: string): Pundit[] {
  const lower = query.toLowerCase();
  return PUNDIT_REGISTRY.filter(
    (p) =>
      p.name.toLowerCase().includes(lower) ||
      p.description.toLowerCase().includes(lower) ||
      p.tags.some((t) => t.includes(lower))
  );
}
