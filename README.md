# MediaSentinel

A media bias analysis tool that uses rule-based logic to detect fallacies, reframing techniques, and political bias in media content. Built with Next.js 16, React 19, and TypeScript.

## What It Does

- **Fallacy Detection** — Rule-based engine identifying 14 formal fallacy types (ad hominem, straw man, false cause, etc.) using keyword and pattern matching. Deliberately non-LLM.
- **Reframing Detection** — Identifies 10 rhetorical reframing techniques (loaded language, passive voice, minimization, etc.).
- **Bias Scoring** — Keyword-based left/right terminology analysis producing a balance score and leaning classification.
- **Multi-Axis Political Positioning** — 5-axis model (economic, speech, progressive/equity, liberal/conservative, foreign policy) that avoids flattening bias to a single left-right spectrum.
- **Overton Window Tracking** — Historical snapshots of policy positions across domains.
- **Content Ingestion** — YouTube transcript extraction and article scraping.
- **Pundit Registry** — Seeded profiles for media figures and organizations with bias trajectories and multi-axis assessments.

## Architecture

```
text input (URL or raw text)
  → scraper (YouTube transcript / article extraction)
  → logic engine (fallacy detection)
  → reframing detector
  → bias scorer
  → combined assessment
```

Weights: fallacies (40%), reframing (30%), bias imbalance (30%).

The logic engine is intentionally rule-based — it does not rely on LLM reasoning for detection. This is a design choice, not a limitation.

## Project Structure

```
src/
├── app/
│   ├── page.tsx              # Landing page
│   ├── analysis/page.tsx     # Analysis UI (URL or text input → results)
│   ├── pundit/page.tsx       # Pundit directory
│   └── api/analyze/route.ts  # Analysis API endpoint
├── data/
│   └── pundits/registry.ts   # Pundit and organization seed data
└── lib/
    ├── logic-engine/
    │   ├── engine.ts          # Core analysis engine
    │   ├── fallacies.ts       # 14 fallacy type definitions
    │   └── reframing.ts       # 10 reframing technique definitions
    ├── models/
    │   ├── political-axes.ts  # 5-axis political positioning model
    │   ├── overton.ts         # Overton window tracker
    │   └── types.ts           # Shared type definitions
    ├── pipeline/
    │   └── analyzer.ts        # Analysis pipeline orchestration
    ├── scrapers/
    │   ├── youtube.ts         # YouTube transcript extraction
    │   └── article.ts         # Article HTML-to-text extraction
    └── training/
        └── schema.ts          # Human-in-the-loop training data schema
docs/
└── profile-breakdowns.md     # Multi-axis assessments for all tracked pundits/orgs
```

## Current Status

**Working:**
- Logic engine (14 fallacy types, keyword-based detection)
- Reframing detection (10 techniques)
- Basic bias scoring (keyword-based left/right)
- YouTube transcript + article scrapers
- UI: landing page, analysis page, pundit directory
- API route that ties it all together
- Profile breakdowns for all tracked pundits and organizations

**Not Yet Implemented:**
- Tone/sentiment scoring (hardcoded to 0, needs sentiment analysis)
- Structural/semantic pattern detection (needs trained model)
- Individual pundit detail pages
- Database or persistence layer
- Human-in-the-loop review loop (training schema exists but isn't wired up)

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### API

```
POST /api/analyze
Content-Type: application/json

{
  "type": "url" | "text",
  "content": "https://youtube.com/watch?v=... or raw text"
}
```

Returns: `{ manipulationScore, biasLeaning, biasConfidence, balanceScore, fallacies[], reframing[], overallAssessment }`

## Multi-Axis Model

The political positioning model uses 5 independent axes rather than a single left-right spectrum:

| Axis | Range |
|------|-------|
| Economic | Capitalist (-1) to Communist (+1) |
| Speech | Free Speech Absolutist (-1) to Reasonable Censorship (+1) |
| Progressive | Progressive/Equity (-1) to Non-Progressive/Efficiency (+1) |
| Liberal/Conservative | Liberal (-1) to Conservative (+1) |
| Foreign Policy | Isolationist (-1) to Interventionist (+1) |

Key distinction: **Progressive is not the same as liberal.** A liberal might want change through deregulation (liberal but non-progressive). A progressive might want existing equity programs preserved (progressive but conservative about those programs).
