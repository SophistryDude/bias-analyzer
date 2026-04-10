# BiasAnalyzer — Implementation Roadmap

## Context

BiasAnalyzer is currently a working prototype: rule-based logic engine, keyword bias scoring, scrapers, and a basic UI. The end product is a **free blog-style website** that continuously monitors media channels, analyzes content for bias/fallacies/reframing, and publishes findings. Monetized via **YouTube videos** covering the analysis results.

The current app is stateless (no database), manual (paste a URL to analyze), and has several stubbed features (tone scoring, semantic detection, pundit detail pages). The goal is to transform this into an automated pipeline that ingests, analyzes, stores, and publishes — with LLMs layered in correctly over time.

---

## Phase 1: Database Foundation & Pipeline Consolidation

**Goal:** Persistence layer + fix the duplicated code.

### Database: PostgreSQL on Neon (serverless)
- Relational data fits perfectly (pundits -> content -> analyses -> detections)
- Neon has a free tier, works from Vercel serverless functions, scales to zero
- TimescaleDB extension later for time-series bias drift queries

### ORM: Drizzle
- TypeScript-native, generates migrations, good Next.js integration

### Deliverables
1. Drizzle schema mapping existing types from `src/lib/models/types.ts` to tables: `pundits`, `content_items`, `analyses`, `fallacy_detections`, `reframing_detections`, `bias_assessments`, `political_profiles`, `overton_snapshots`, `training_examples`
2. **Fix the API route** — `src/app/api/analyze/route.ts` lines 67-106 duplicate bias scoring inline instead of calling `runAnalysis()` from `src/lib/pipeline/analyzer.ts`. Delete the duplication, call the pipeline.
3. Seed script migrating static data from `src/data/pundits/registry.ts`, `src/lib/models/political-axes.ts` (SEED_PROFILES), and `src/lib/models/overton.ts` (WINDOW_HISTORY)
4. Data access layer (repositories) replacing direct imports of static arrays
5. Analysis results persist — `analysisCount`, `averageBiasScore`, `averageManipulationScore` on pundits become computed from real data

### Files to create
- `src/lib/db/schema.ts` — Drizzle schema
- `src/lib/db/client.ts` — connection config
- `src/lib/db/repositories/` — pundits, analyses, content, training
- `src/lib/db/seed.ts`
- `drizzle.config.ts`

### Files to modify
- `src/app/api/analyze/route.ts` — rewrite to use pipeline, persist results
- `src/app/pundit/page.tsx` — read from database
- `src/lib/pipeline/analyzer.ts` — add persistence after analysis

---

## Phase 2: LLM Integration Layer

**Goal:** Fill the stubbed capabilities — tone scoring, semantic detection, neutral reframing — without replacing the rule-based engine.

### Strategy: Claude API with structured outputs
- Use Claude Sonnet (cost-effective for volume analysis)
- Prompt engineering first, fine-tune after 500+ training examples accumulate
- **Rule engine runs first** (fast, deterministic, free), **LLM runs second** (enhancement layer)
- If LLM is unavailable, system still works with rule-based results only

### Deliverables
1. LLM provider abstraction (`src/lib/llm/provider.ts`) — swap models later
2. **Tone/sentiment scoring** — replace hardcoded `toneScore: 0` in analyzer
3. **Structural fallacy detection** — LLM catches what keywords miss (straw man distortion, gish gallop pacing)
4. **Neutral reframing suggestions** — populate the empty `suggestedNeutralFraming` field
5. **5-axis bias mapping** — LLM maps detected bias to the political axes model instead of flat left/right keywords
6. Content-hash caching to avoid re-analyzing identical text
7. Rate limiting and cost tracking (~$0.02-0.05 per article, budget ~$50/month)

### Files to create
- `src/lib/llm/provider.ts`, `src/lib/llm/claude.ts`
- `src/lib/llm/prompts/` — tone-analysis, structural-fallacy, neutral-reframing, axis-mapping
- `src/lib/llm/cache.ts`

### Files to modify
- `src/lib/pipeline/analyzer.ts` — integrate LLM after rule engine, merge results
- `src/lib/models/types.ts` — add `llmEnhanced: boolean` to analysis results

---

## Phase 3: Automated Content Ingestion Pipeline

**Goal:** System monitors channels/websites and ingests new content automatically.

### Pipeline: node-cron + pg-boss (not Airflow)
- Airflow is operationally heavy (scheduler, metadata DB, workers, Docker)
- The pipeline is 4 steps: scrape -> analyze -> store -> notify. Cron handles this.
- pg-boss provides a persistent job queue backed by the existing PostgreSQL
- Graduate to Dagster when monitored sources exceed 50 or pipeline exceeds 10 steps

### Deliverables
1. `monitored_sources` table — channels/feeds with scrape intervals, last-checked timestamps
2. YouTube channel monitor — fetches new videos via YouTube Data API v3
3. RSS/Atom feed monitor — catches new articles from news sites
4. **Article scraper upgrade** — replace regex HTML extraction in `src/lib/scrapers/article.ts` with `@mozilla/readability` + `jsdom` (code already has a comment noting this)
5. Ingestion scheduler — node-cron checking sources on configurable intervals
6. Analysis job queue — pg-boss processes new content asynchronously
7. Content deduplication via hashing

### Files to create
- `src/lib/pipeline/scheduler.ts`
- `src/lib/pipeline/queue.ts`
- `src/lib/scrapers/rss.ts`
- `src/lib/scrapers/youtube-channel.ts`
- `src/lib/db/repositories/sources.ts`

### Files to modify
- `src/lib/scrapers/article.ts` — replace regex with readability parser
- `src/lib/db/schema.ts` — add monitored_sources, ingestion_jobs tables

### Initial sources
Seed with the 14 pundits/orgs already in the registry — add YouTube channel IDs and RSS feeds.

---

## Phase 4: Blog Content & Pundit Detail Pages

**Goal:** Turn analyzed data into publishable content. This is where the product becomes a blog.

### Blog strategy: Semi-automated
- System generates draft posts from analysis data using Claude
- Nicholas reviews, edits, publishes
- Three post types: **individual analysis** ("We analyzed X's latest video"), **trend reports** ("How CNN's bias shifted over 3 months"), **comparisons** ("DeFranco vs. Shapiro side-by-side")

### Deliverables
1. Blog data model — posts table with draft/published workflow
2. Blog post generator — Claude generates prose from structured analysis data
3. **Pundit detail pages** (`/pundit/[slug]`) — full profile, 5-axis radar chart, bias history timeline, all analyses, Overton window position
4. Blog index (`/blog`) and post pages (`/blog/[slug]`)
5. RSS feed (`/api/feed.xml`)
6. Admin dashboard (`/admin`) — review drafts, approve/publish, manage monitored sources
7. Visualization components: radar chart, bias timeline, Overton window chart

### Files to create
- `src/app/pundit/[slug]/page.tsx`
- `src/app/blog/page.tsx`, `src/app/blog/[slug]/page.tsx`
- `src/app/admin/page.tsx`
- `src/app/api/feed.xml/route.ts`
- `src/lib/blog/generator.ts`, `src/lib/blog/templates.ts`
- `src/components/PunditRadarChart.tsx`, `src/components/BiasTimeline.tsx`, `src/components/OvertonWindowChart.tsx`

---

## Phase 5: Production Infrastructure

**Goal:** Harden for production deployment.

### Hosting

| Component | Service | Cost |
|-----------|---------|------|
| Website | Vercel (free tier) | $0 |
| Database | Neon PostgreSQL (paid) | $19/mo |
| Pipeline worker | Hetzner VPS (CX22) | $5/mo |
| Object storage | Cloudflare R2 | $0 (free tier) |
| LLM API | Claude Sonnet | ~$50/mo |
| YouTube Data API | Google | $0 (free quota) |
| **Total** | | **~$74/mo** |

### Deliverables
1. Vercel deployment with env vars and preview deploys
2. Hetzner VPS running pipeline worker as systemd service
3. Cloudflare R2 for raw content and assets
4. Sentry error tracking
5. GitHub Actions CI/CD: lint, typecheck, build, deploy

### When to upgrade to Dagster
- 50+ monitored sources
- 10+ pipeline steps
- Need backfill/replay
- Need visual DAG debugging

---

## Phase 6: YouTube Pipeline & Training Loop

**Goal:** Monetization support and model refinement.

### YouTube support (research + scripts, NOT auto-generated video)
- Video script generator from blog posts + analysis data
- Data card renderer — React component exporting stats as shareable images
- Research packet compiler — all data for a topic in one document
- Nicholas records and edits — his personality is the monetization vehicle

### Human-in-the-loop training
- Admin review UI — Nicholas corrects false positives/negatives in analysis results
- Corrections stored as training examples using existing `src/lib/training/schema.ts`
- After 500+ verified examples: export via `exportForFineTuning()` (already implemented), fine-tune Claude
- Use training data to adjust keyword weights in `fallacies.ts` and `reframing.ts`

### Files to create
- `src/lib/youtube/script-generator.ts`
- `src/lib/youtube/research-packet.ts`
- `src/components/DataCard.tsx`
- `src/app/admin/review/page.tsx`
- `src/app/admin/training/page.tsx`
- `scripts/adjust-weights.ts`

---

## Key Decisions

| Decision | Choice | Why |
|----------|--------|-----|
| Database | PostgreSQL + Neon | Relational data, serverless, free tier, TimescaleDB later |
| ORM | Drizzle | TypeScript-native, migrations, Next.js fit |
| Pipeline | node-cron + pg-boss -> Dagster later | Airflow too heavy for 4-step pipeline |
| LLM | Claude Sonnet via API | Structured outputs, cost-effective, enhancement layer not replacement |
| LLM strategy | Prompt engineering -> fine-tune after 500+ examples | Need data before fine-tuning makes sense |
| Website hosting | Vercel | Built for Next.js, free |
| Pipeline hosting | Hetzner VPS | Long-running processes need a server |
| Blog | Semi-automated drafts | Full automation risks credibility |
| Videos | Script/research generation only | Nicholas's commentary is the value |

## Immediate First Step

Delete the duplicated bias scoring from `src/app/api/analyze/route.ts` (lines 67-106) and make the route call `runAnalysis()` from the pipeline module. 15-minute fix, eliminates a maintenance hazard, establishes the pipeline as the single source of truth.
