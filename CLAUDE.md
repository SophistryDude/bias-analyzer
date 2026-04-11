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

### Completed (Phases 1-4)

**Database (Phase 1):**
- PostgreSQL 17 running locally (user: bias_analyzer, pass: bias_analyzer_dev)
- Drizzle ORM with 19 tables: pundits, leaning_snapshots, content_items, analyses, fallacy_detections, reframing_detections, bias_indicators, political_profiles, axis_positions, overton_snapshots, monitored_sources, content_hashes, stories, story_coverages, claims, source_claims, blog_posts, training_examples, training_labels
- 196 pundits/organizations seeded (3 seed scripts: seed.ts, seed-200.ts, seed-remaining.ts)
- DB client is lazy-initialized (won't crash scripts that don't need DB)
- Drizzle Kit uses explicit host/credentials, not connection string URL (workaround for pg driver issues on Windows)

**LLM Layer (Phase 2):**
- Provider abstraction at `src/lib/llm/provider.ts` — pluggable, no SDK dependency
- 6 prompt templates built, none wired to live API calls yet:
  1. Tone/sentiment with humor detection (satire + observational critical)
  2. Structural fallacy detection (straw man, gish gallop, false equivalence)
  3. Neutral reframing suggestions
  4. 5-axis bias mapping
  5. Claim extraction (cross-source fact tracking)
  6. Omission detection (compares what each source included/excluded)
- Content-hash cache with 7-day TTL at `src/lib/llm/cache.ts`
- Pipeline is async; graceful fallback if LLM not configured

**Ingestion Pipeline (Phase 3):**
- node-cron scheduler checking sources every 5 minutes
- pg-boss job queue backed by PostgreSQL
- Scrapers: YouTube transcript, article (readability+jsdom), RSS/Atom, YouTube channel monitor
- Historical scrapers: Wayback Machine CDX API, NYT Article Search + Archive API, ProQuest (API-ready), EBSCO (API-ready)
- Content deduplication via SHA-256 hashing
- 7 monitored sources seeded (4 YouTube channels, 3 RSS feeds)
- Bulk historical ingestion script with resume capability (`scripts/bulk-ingest.ts`)

**Blog & UI (Phase 4):**
- Pages: `/` (landing), `/analysis`, `/pundit`, `/pundit/[slug]`, `/blog`, `/blog/[slug]`, `/admin`
- API routes: `POST /api/analyze`, `GET /api/admin/posts`, `POST /api/admin/posts/[id]/publish`, `GET /api/feed.xml`
- Blog post generator with 4 templates: individual analysis, trend report, comparison, story comparison
- Visualization components: PunditRadarChart (SVG), BiasTimeline, OvertonWindowChart
- Shared Header component

### In Progress
- Bulk historical ingestion running (2016 NYT Archive sweep via Wayback Machine)
- Progress saved to `scripts/.ingest-progress.json` — resumes automatically

### Not Yet Implemented
- LLM provider wiring (prompt templates exist, no live API calls)
- Human-in-the-loop training UI (schema exists at `src/lib/training/schema.ts`)
- YouTube transcript bulk ingestion for individual pundits
- Phase 5: Production deployment (GKE Autopilot)
- Phase 6: YouTube video pipeline, training loop, fine-tuning

## Key Design Decisions

**Architecture:**
- Logic engine is rule-based by design. LLMs augment, never replace.
- Progressive ≠ liberal. Load-bearing distinction in the 5-axis model.
- Coherence scoring: philosophy-driven vs engagement-driven.
- `runAnalysis()` in `src/lib/pipeline/analyzer.ts` is the single source of truth for all analysis. The API route delegates to it — never duplicate analysis logic in the route.

**Accuracy & Truth:**
- We don't decide what's true. We show what each source included/omitted.
- Cross-source claim extraction → omission detection = the accuracy framework.
- Omission is the primary bias tool, not fabrication. (Validated with April 2016 Aleppo case study: CNN omitted rebel mortar attacks, NYT covered both sides, Breitbart omitted all opposing voices.)
- Reliability axis = completeness score over time (% of significant claims included).
- Divergent numbers from credible sources aren't lies — different methodologies.

**Content & Presentation:**
- Pundit profiles must be system-generated from analyzed content, not hand-written editorial. Current profiles are unvalidated initial hypotheses.
- Blog content is semi-automated: system generates drafts, human reviews and publishes.
- Humor detection (satire, observational critical) is internal for sentiment accuracy, not audience-facing.
- Overton window: point out narrative framing shifts, don't lecture about the theory.

**User interaction:**
- Don't defer to user's self-assessments uncritically. Push back, ask for evidence. This is a bias analysis tool — treating inputs as ground truth contradicts the project's thesis.
- Be decisive with recommendations. User is action-oriented.

## Patterns to Follow

- **Next.js 16**: Dynamic route params are async — use `await params` not sync access. Check `node_modules/next/dist/docs/` before writing new page patterns.
- **Database**: All queries go through repository layer (`src/lib/db/repositories/`). Never import schema directly in pages/routes.
- **Scrapers**: Return `ContentItem` type from `src/lib/models/types.ts`. All scrapers at `src/lib/scrapers/`.
- **LLM prompts**: Each prompt is a standalone file in `src/lib/llm/prompts/` that exports a `build*Messages()` function returning `LLMMessage[]`. Orchestration happens in `src/lib/llm/analyze.ts`.
- **Blog templates**: Structured data in, LLM messages out. Templates at `src/lib/blog/templates.ts`, generator at `src/lib/blog/generator.ts`.
- **Env loading**: Scripts use `dotenv.config({ path: ".env.local" })` — not `dotenv/config` which loads `.env` only.

## Patterns to Avoid

- Don't duplicate analysis logic outside `src/lib/pipeline/analyzer.ts`
- Don't flatten bias to single left-right spectrum — always use 5-axis model
- Don't use Anthropic SDK — LLM calls are provider-agnostic prompt templates
- Don't use `scram-sha-256` auth for local PostgreSQL from Node.js on Windows (use `trust` or `md5`)
- Don't use Wayback Machine CDX wildcard/prefix queries (require authorization) — use exact URL lookups
- Don't run Docker Postgres on port 5432 — conflicts with local PG17 install

## Active Blockers

- **ProQuest API**: Need credentials from WGU library. Would unlock full-text archives (1980s-present) for NYT, WaPo, WSJ.
- **EBSCO API**: Need WGU library to enable API access on the account.
- **NYT API key**: Currently set in `.env.local` but should be rotated (was shared in chat).

## Infrastructure Target

- GKE Autopilot (shared cluster with PokerForge website)
- Cloud SQL PostgreSQL 17
- Cloud Storage for raw content/artifacts
- Artifact Registry for Docker images
- GitHub Actions CI/CD
- Estimated ~$30-40/mo at launch
- See `docs/infrastructure.md` for full architecture
- Alphabreak is NOT on this cluster — standalone, too large

## LLM Tasks (11 total)

Phase 2 (analysis): tone/sentiment, structural fallacy, neutral reframing, axis mapping
Cross-source: claim extraction, omission detection
Phase 4 (blog): individual analysis post, trend report, comparison, story comparison
Phase 6 (YouTube): video script generation, research packet compilation

## Key Files

| Purpose | Path |
|---------|------|
| Analysis pipeline (single source of truth) | `src/lib/pipeline/analyzer.ts` |
| Historical ingestion orchestrator | `src/lib/pipeline/historical-ingest.ts` |
| Bulk ingestion CLI | `scripts/bulk-ingest.ts` |
| Database schema (19 tables) | `src/lib/db/schema.ts` |
| LLM prompt templates | `src/lib/llm/prompts/*.ts` |
| LLM orchestration | `src/lib/llm/analyze.ts` |
| Political axes model | `src/lib/models/political-axes.ts` |
| Pundit registry (static seed) | `src/data/pundits/registry.ts` |
| Blog post templates | `src/lib/blog/templates.ts` |
| Profile breakdowns (editorial) | `docs/profile-breakdowns.md` |
| 200 pundit target list | `docs/pundit-list-200.md` |
| Infrastructure architecture | `docs/infrastructure.md` |
| Implementation roadmap | `docs/implementation-roadmap.md` |

## NPM Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start Next.js dev server |
| `npm run build` | Production build |
| `npm run db:push` | Push schema to database (has issues on Windows — use migration SQL instead) |
| `npm run db:seed` | Seed initial 13 pundits + profiles + Overton data |
| `npm run db:seed-200` | Seed extended 133 pundits/orgs |
| `npm run db:studio` | Drizzle Studio database browser |
| `npm run ingest:history` | Single-pundit historical ingestion CLI |
| `npm run ingest:bulk` | Bulk historical ingestion (NYT Archive sweep) |
