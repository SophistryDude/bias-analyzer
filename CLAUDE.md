@AGENTS.md

# BiasAnalyzer

## Architecture

- Next.js 16, React 19, TypeScript, Tailwind 4
- Rule-based logic engine — deliberately non-LLM for fallacy/reframing detection. Do not suggest replacing with LLM reasoning.
- Multi-axis political model (5 axes: economic, speech, progressive/equity, liberal/conservative, foreign policy). Do not flatten to single left-right spectrum.
- Pipeline: text → scraper → logic engine → reframing detector → bias scorer → combined assessment
- Weights: fallacies (40%), reframing (30%), bias imbalance (30%)

## Current Status

### Working
- Logic engine: 14 fallacy types, keyword-based detection (`src/lib/logic-engine/`)
- Reframing detection: 10 techniques (`src/lib/logic-engine/reframing.ts`)
- Basic bias scoring: keyword-based left/right (`src/lib/pipeline/analyzer.ts`)
- YouTube transcript + article scrapers (`src/lib/scrapers/`)
- UI: landing page, analysis page (`/analysis`), pundit directory (`/pundit`)
- API: `POST /api/analyze` — takes URL or raw text, returns full analysis
- Profile breakdowns for all tracked pundits and organizations (`docs/profile-breakdowns.md`)
- Political axes model and Overton window tracker (`src/lib/models/`)
- Pundit registry with seed data (`src/data/pundits/registry.ts`)
- Training data schema for human-in-the-loop refinement (`src/lib/training/schema.ts`)

### Not Yet Implemented
- Tone/sentiment scoring — hardcoded to 0 in pipeline, needs sentiment analysis model
- Structural/semantic pattern detection — logic engine only does keyword patterns; structural/semantic requires trained model
- Individual pundit detail pages (`/pundit/[slug]`)
- Database or persistence layer — currently no backend storage
- Human-in-the-loop review loop — training schema exists but isn't wired to any UI or workflow

## Key Design Decisions
- The logic engine is rule-based by design. This is a feature, not a limitation.
- Progressive ≠ liberal. The model explicitly distinguishes these as separate axes.
- Coherence scoring tracks whether a pundit's positions are philosophy-driven or engagement-driven.
