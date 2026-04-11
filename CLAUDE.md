@AGENTS.md

# BiasAnalyzer

BiasAnalyzer is the Logic System's epistemological framework applied to media analysis. It is NOT a separate project — it operationalizes the same principles (constraint reduction, model vs reality, dimensional preservation, epistemological taxonomy) against journalism instead of physics. See `docs/logic_system_integration.md` for the full mapping.

## Architecture

- Next.js 16, React 19, TypeScript, Tailwind 4
- Rule-based logic engine — deliberately non-LLM for fallacy/reframing detection. Do not suggest replacing with LLM reasoning.
- Multi-axis political model (5 axes: economic, speech, progressive/equity, liberal/conservative, foreign policy). Do not flatten to single left-right spectrum.
- Pipeline: text → scraper → logic engine → reframing detector → bias scorer → LLM enhancement layer → combined assessment
- Weights: fallacies (40%), reframing (30%), bias imbalance (30%)
- PostgreSQL 17 (local dev on Windows, port 5432), Drizzle ORM, 19 tables
- Historical content ingestion via NYT API → Wayback Machine pipeline
- Cross-source tracking: stories → coverages → claims → omission detection
- Epistemological classification: rule-based first pass + LLM refinement (hybrid pattern)

## Current Status

### Completed (Phases 1-4 + extensions)

**Database (Phase 1):**
- PostgreSQL 17 local (user: bias_analyzer, pass: bias_analyzer_dev, db: bias_analyzer)
- Drizzle ORM, 19 tables, 2 migrations applied (0000 initial + 0001 ownership/timing/epistemology/blog)
- 197 pundits/organizations seeded across 3 seed scripts + 1 manual insert (VDH)
- DB client is lazy-initialized via Proxy (won't crash scripts that don't need DB)
- Drizzle Kit config uses explicit host/credentials, not URL (Windows pg driver workaround)

**LLM Layer (Phase 2 + extensions):**
- Provider abstraction at `src/lib/llm/provider.ts` — pluggable, no SDK dependency
- 7 prompt templates built, none wired to live API calls yet:
  1. Tone/sentiment with humor detection (satire + observational critical)
  2. Structural fallacy detection (straw man, gish gallop, false equivalence)
  3. Neutral reframing suggestions
  4. 5-axis bias mapping
  5. Claim extraction (cross-source fact tracking)
  6. Omission detection (compares what each source included/excluded)
  7. Epistemological refinement (classifies ambiguous claims the rule engine can't handle)
- Content-hash cache with 7-day TTL at `src/lib/llm/cache.ts`
- Pipeline is async; graceful fallback if LLM not configured

**Ingestion Pipeline (Phase 3):**
- node-cron scheduler, pg-boss job queue, SHA-256 content deduplication
- Scrapers: YouTube transcript, article (readability+jsdom), RSS/Atom, YouTube channel monitor, Wayback Machine CDX, NYT Article Search + Archive API, ProQuest (API-ready), EBSCO (API-ready)
- 7 monitored sources seeded (4 YouTube channels, 3 RSS feeds)
- Bulk historical ingestion with resume capability (`scripts/bulk-ingest.ts`)
- NYT API key configured and tested — Archive API returns ~6000 articles/month, Article Search works

**Cross-Source Analysis:**
- Stories table with coverages, claims, and source_claims for omission tracking
- Blindspot detection: which sources didn't cover a story, with left/center/right distribution
- Coverage timeline: who published first (first-mover), spread duration, framing evolution
- Epistemological classification engine: rule-based classifier at `src/lib/logic-engine/epistemology.ts` with 6 truth-status types + category error detection. First test: 4/15 claims classified by rules (27%), 11 need LLM refinement — rule patterns need expansion.
- First story seeded and analyzed: April 2016 Aleppo hospital + Trump speech (4 coverages: Fox, CNN, NYT, Breitbart)

**Blog & UI (Phase 4):**
- Pages: `/` `/analysis` `/pundit` `/pundit/[slug]` `/blog` `/blog/[slug]` `/admin`
- API routes: `POST /api/analyze` `GET /api/admin/posts` `POST /api/admin/posts/[id]/publish` `GET /api/feed.xml`
- Blog post generator with 4 templates: individual analysis, trend report, comparison, story comparison
- Visualization: PunditRadarChart (SVG), BiasTimeline, OvertonWindowChart
- Shared Header component
- No auth on admin (easy win #23)

**Profile Breakdowns (26 profiles):**
- Individuals: DeFranco, Carlson, Owens, Fuentes, Shapiro, Maddow, Lemon, Pool, Cenk Uygur, Ana Kasparian, Hasan Piker, Destiny, Krystal Ball, Saagar Enjeti, Crowder, Pakman, Jon Stewart, Jordan Peterson, Victor Davis Hanson, Trump, Obama, Nicholas
- Organizations: CNN, Fox News, MSNBC, NYT
- Profiles are unvalidated initial hypotheses — must be replaced by system-generated assessments

**Ownership tracking:** Schema fields added (corporateParent, ownershipType, financialInterests, fundingSources, country). Not yet populated.

### In Progress
- Bulk historical ingestion running (NYT Archive sweep via Wayback Machine)
- Progress saved to `scripts/.ingest-progress.json` — resumes with `npm run ingest:bulk`

### Not Yet Implemented
- LLM provider wiring (all 7 prompt templates exist, no live API calls)
- Human-in-the-loop training UI
- YouTube transcript bulk ingestion for individual pundits
- Ownership data population for pundits/orgs
- Breitbart not in pundits table (needs adding)
- Phase 5: Production deployment (GKE Autopilot) — see `docs/infrastructure.md`
- Phase 6: YouTube video pipeline, training loop, fine-tuning

### Next Session Priorities
1. Check bulk ingestion progress (how many articles ingested)
2. Re-evaluate all 26 profiles through Logic System epistemological lens
3. Tune epistemological classifier rules (target 60%+ from current 27%)
4. Add Breitbart to pundits table

## Key Design Decisions

**Architecture:**
- Logic engine is rule-based by design. LLMs augment, never replace. New analysis features MUST follow hybrid pattern: rule-based first, LLM refinement second. This is both the architectural pattern and the epistemological principle.
- Progressive ≠ liberal. Load-bearing distinction derived from the Logic System's effective vs fundamental truth separation.
- `runAnalysis()` in `src/lib/pipeline/analyzer.ts` is the single source of truth. Never duplicate analysis logic.
- Event-centric architecture: stories (events) are the primary unit of analysis. Contributor scores evolve from accumulated event coverage over time.

**Accuracy & Truth (from Logic System):**
- We don't decide what's true. We show what each source included/omitted.
- Omission is the primary bias tool, not fabrication. Validated with Aleppo case study.
- Reliability axis = completeness score over time (% of significant claims included). Derived from accumulated omission data, not a separate assessment.
- Divergent numbers from credible sources aren't lies — different methodologies.
- Epistemological classification: bias IS presenting tacit understanding as known truth. The classifier detects this category error.

**Content & Presentation:**
- Pundit profiles must be system-generated, not editorial. Current profiles are hypotheses.
- Blog is semi-automated: LLM drafts, human reviews and publishes.
- Humor detection is internal for sentiment accuracy, not audience-facing.
- Overton window: point out narrative framing shifts, not theory.
- Socionics/personality typing: DO NOT integrate. We'd be typing the performance, not the person. Category error.

**User interaction:**
- Don't defer to user's self-assessments uncritically. Push back, ask for evidence.
- Be decisive with recommendations. User is action-oriented.

## Patterns to Follow

- **Next.js 16**: Dynamic route params are async — `await params`. Check `node_modules/next/dist/docs/` before writing new patterns.
- **Database**: All queries through repository layer (`src/lib/db/repositories/`). Never import schema in pages/routes.
- **Scrapers**: Return `ContentItem` type. All at `src/lib/scrapers/`.
- **LLM prompts**: Standalone file in `src/lib/llm/prompts/` exporting `build*Messages()` → `LLMMessage[]`. Orchestration in `src/lib/llm/analyze.ts`.
- **New analysis features**: Rule-based patterns first (auditable, free, fast), LLM refinement for ambiguous cases. This is non-negotiable.
- **Env loading**: Scripts use `dotenv.config({ path: ".env.local" })` — not `dotenv/config`.
- **Migrations**: Generate with `npx drizzle-kit generate`, apply via psql (drizzle push hangs on Windows).

## Patterns to Avoid

- Don't duplicate analysis logic outside `src/lib/pipeline/analyzer.ts`
- Don't flatten bias to single left-right spectrum
- Don't use Anthropic SDK — LLM calls are provider-agnostic
- Don't use Wayback Machine CDX wildcard queries (403) — exact URL lookups only
- Don't run Docker Postgres on port 5432 — conflicts with local PG17
- Don't add socionics/personality type annotations to profiles or the system
- Don't present model-dependent interpretations as known truths (the Logic System's core principle)

## Active Blockers

- **ProQuest API**: Need credentials from WGU library. Biggest content unlock (40 years full text).
- **EBSCO API**: Need WGU library to enable API access.
- **NYT API key**: Should be rotated (shared in chat). Currently working.
- **Epistemological classifier coverage**: 27% rule hit rate. Needs more patterns before it's useful.

## Infrastructure

- **Current**: Local PG17 on Windows, `npm run dev`
- **Target**: GKE Autopilot shared cluster (with PokerForge website). ~$30-40/mo.
- Cloud SQL PostgreSQL 17, Cloud Storage, Artifact Registry, GitHub Actions CI/CD
- Alphabreak is NOT on this cluster — standalone
- See `docs/infrastructure.md` for full architecture
- Build-toward target, not deploy-now

## LLM Tasks (12 total)

| # | Task | Phase | Status |
|---|------|-------|--------|
| 1 | Tone/sentiment (humor detection) | 2 | Prompt built |
| 2 | Structural fallacy detection | 2 | Prompt built |
| 3 | Neutral reframing suggestions | 2 | Prompt built |
| 4 | 5-axis bias mapping | 2 | Prompt built |
| 5 | Claim extraction | Cross-source | Prompt built |
| 6 | Omission detection | Cross-source | Prompt built |
| 7 | Individual analysis blog post | 4 | Template built |
| 8 | Trend report blog post | 4 | Template built |
| 9 | Comparison blog post | 4 | Template built |
| 10 | Story comparison blog post | 4 | Template built |
| 11 | Video script generation | 6 | Not started |
| 12 | Epistemological classification (refinement) | Cross-source | Prompt built, rule engine built (27% coverage) |

## Key Files

| Purpose | Path |
|---------|------|
| Analysis pipeline (single source of truth) | `src/lib/pipeline/analyzer.ts` |
| Historical ingestion orchestrator | `src/lib/pipeline/historical-ingest.ts` |
| Bulk ingestion CLI | `scripts/bulk-ingest.ts` |
| Database schema (19 tables) | `src/lib/db/schema.ts` |
| Epistemological classifier (rule-based) | `src/lib/logic-engine/epistemology.ts` |
| LLM prompt templates | `src/lib/llm/prompts/*.ts` |
| LLM orchestration | `src/lib/llm/analyze.ts` |
| Political axes model | `src/lib/models/political-axes.ts` |
| Blindspot detection + coverage timeline | `src/lib/db/repositories/stories.ts` |
| Claims + omission reports | `src/lib/db/repositories/claims.ts` |
| Blog post templates | `src/lib/blog/templates.ts` |
| Logic System integration | `docs/logic_system_integration.md` |
| Logic System source documents | `docs/logic-system/` |
| Profile breakdowns (26 profiles) | `docs/profile-breakdowns.md` |
| Decision log | `docs/decisions.md` |
| Infrastructure architecture | `docs/infrastructure.md` |
| Easy wins (prioritized) | `docs/easy-wins.md` |
| CRT epistemological analysis | `docs/analysis-crt-epistemology.md` |
| Bodily autonomy analysis | `docs/analysis-bodily-autonomy.md` |
| Bad faith argumentation analysis | `docs/bad_faith_argumentation.md` |
| Socionics feasibility (decided: don't use) | `docs/analysis-socionics-profiling.md` |
| 200 pundit target list | `docs/pundit-list-200.md` |
| Implementation roadmap | `docs/implementation-roadmap.md` |

## NPM Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start Next.js dev server |
| `npm run build` | Production build |
| `npm run db:push` | Push schema (use migration SQL instead on Windows) |
| `npm run db:generate` | Generate migration from schema changes |
| `npm run db:seed` | Seed initial 13 pundits + profiles + Overton |
| `npm run db:seed-200` | Seed extended 133 pundits/orgs |
| `npm run db:studio` | Drizzle Studio database browser |
| `npm run ingest:history` | Single-pundit historical ingestion CLI |
| `npm run ingest:bulk` | Bulk historical ingestion (NYT Archive sweep) |

## Project Context

- **Product**: Free blog-style website + YouTube monetization. Analysis is the content, YouTube is the revenue.
- **Owner**: Nicholas Major, studying Communications at WGU. Has EBSCO + ProQuest through WGU library (API access not yet obtained). Masters in Philosophy, works as data scientist.
- **Other projects**: Alphabreak (standalone), PokerForge (app + shared k8s cluster), poker content videos (local → YouTube), Theory of Everything (local → YouTube)
- **Primary differentiators**: Multi-axis model (no competitor does this), transparent rule engine (auditable), cross-source omission tracking (measures what's missing, not what's wrong), epistemological classification (no competitor classifies claims by truth-status type)
