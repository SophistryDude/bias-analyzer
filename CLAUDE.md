@AGENTS.md

# BiasAnalyzer

## Architecture

- Next.js 16, React 19, TypeScript, Tailwind 4
- Rule-based logic engine — deliberately non-LLM for fallacy/reframing detection. Do not suggest replacing with LLM reasoning.
- Multi-axis political model (5 axes: economic, speech, progressive/equity, liberal/conservative, foreign policy). Do not flatten to single left-right spectrum.
- Pipeline: text → scraper → logic engine → reframing detector → bias scorer → LLM enhancement layer → combined assessment
- Weights: fallacies (40%), reframing (30%), bias imbalance (30%)
- PostgreSQL 17 (local dev), Drizzle ORM, 19 tables
- Historical content ingestion via NYT API → Wayback Machine pipeline

## Current Status

### Working
- Logic engine: 14 fallacy types, keyword-based detection (`src/lib/logic-engine/`)
- Reframing detection: 10 techniques (`src/lib/logic-engine/reframing.ts`)
- Bias scoring: keyword-based left/right (`src/lib/pipeline/analyzer.ts`)
- LLM integration layer: 6 prompt templates (tone/sentiment with humor detection, structural fallacy, neutral reframing, 5-axis mapping, claim extraction, omission detection) (`src/lib/llm/`)
- Scrapers: YouTube transcript, article (readability+jsdom), RSS, YouTube channel monitor, Wayback Machine CDX, NYT API, ProQuest (API-ready), EBSCO (API-ready) (`src/lib/scrapers/`)
- Database: PostgreSQL 17, Drizzle ORM, 19 tables, 196 pundits/orgs seeded (`src/lib/db/`)
- Automated pipeline: node-cron scheduler, pg-boss job queue, content deduplication (`src/lib/pipeline/`)
- Cross-source tracking: stories, coverages, claims, omission detection (`src/lib/db/repositories/stories.ts`, `claims.ts`)
- Historical ingestion: NYT Archive API → Wayback Machine full-text pipeline (`src/lib/pipeline/historical-ingest.ts`)
- UI: landing page, analysis page (`/analysis`), pundit directory (`/pundit`), pundit detail (`/pundit/[slug]`), blog (`/blog`), admin dashboard (`/admin`)
- Blog system: 4 post type templates, draft/publish workflow, RSS feed (`/api/feed.xml`)
- Visualization: 5-axis radar chart, bias timeline, Overton window chart (`src/components/`)

### Not Yet Implemented
- LLM provider wiring (prompt templates built, no API calls connected yet)
- Human-in-the-loop review loop (training schema exists, no admin UI for corrections)
- YouTube transcript bulk ingestion for individual pundits
- Production deployment

## Key Design Decisions
- The logic engine is rule-based by design. LLMs augment it as an enhancement layer, they do not replace it.
- Progressive ≠ liberal. The model explicitly distinguishes these as separate axes.
- Coherence scoring tracks whether a pundit's positions are philosophy-driven or engagement-driven.
- Pundit profiles must be system-generated from analyzed content, not hand-written editorial assessments. Current profiles are unvalidated initial hypotheses.
- Blog content is semi-automated: system generates drafts, human reviews and publishes.
- Accuracy is determined by cross-source claim extraction and omission tracking, not by being an arbiter of truth.
- Humor detection (satire, observational) is internal for sentiment accuracy, not audience-facing.
- Overton window is for pointing out narrative framing shifts, not academic discussion.

## Roadmap
See `docs/implementation-roadmap.md` for the full plan:
1. ~~Database foundation (PostgreSQL + Drizzle ORM)~~ — DONE
2. ~~LLM integration layer (prompt templates, provider abstraction)~~ — DONE
3. ~~Automated content ingestion (scheduler, queue, scrapers)~~ — DONE
4. ~~Blog content generation & pundit detail pages~~ — DONE
5. Production infrastructure — GKE Autopilot, see `docs/infrastructure.md`
6. YouTube pipeline & training loop

## Infrastructure Target
- GKE Autopilot (shared cluster with PokerForge website)
- Cloud SQL PostgreSQL 17
- Cloud Storage for raw content/artifacts
- Artifact Registry for Docker images
- GitHub Actions CI/CD
- Estimated ~$30-40/mo at launch
- See `docs/infrastructure.md` for full architecture
