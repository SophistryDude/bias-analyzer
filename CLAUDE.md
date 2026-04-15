@AGENTS.md

# MediaSentinel

MediaSentinel is the Logic System's epistemological framework applied to media analysis. It is NOT a separate project — it operationalizes the same principles (constraint reduction, model vs reality, dimensional preservation, epistemological taxonomy) against journalism instead of physics. See `docs/logic_system_integration.md` for the full mapping.

## Architecture

- Next.js 16, React 19, TypeScript, Tailwind 4
- Rule-based logic engine — deliberately non-LLM for fallacy/reframing detection. Do not suggest replacing with LLM reasoning.
- Multi-axis political model (9 axes: economic, speech, causation-analysis, equality-model, liberal/conservative, foreign-policy, populism, nationalism, authority). Expanded from 5 in April 2026 — old "progressive" axis decomposed into causation-analysis + equality-model, and populism/nationalism/authority added as orthogonal cross-cutting dimensions. Do not flatten to single left-right spectrum. Do not re-bundle. The 9 axes are independent by design; bundling them (e.g., calling populism "a kind of conservatism") produces the measurement artifacts the expansion was built to eliminate.
- Pipeline: text → scraper → logic engine → reframing detector → bias scorer → LLM enhancement layer → combined assessment
- Weights: fallacies (40%), reframing (30%), bias imbalance (30%)
- PostgreSQL 17 (local dev on Windows, port 5432), Drizzle ORM, 19 tables
- Historical content ingestion via NYT API → Wayback Machine pipeline
- Cross-source tracking: stories → coverages → claims → omission detection
- Epistemological classification: rule-based first pass + LLM refinement (hybrid pattern)

## Current Status

### Completed (Phases 1-4 + extensions)

**Database (Phase 1):**
- PostgreSQL 17 local (user: mediasentinel, pass: mediasentinel_dev, db: mediasentinel)
- Drizzle ORM, 19 tables, 3 migrations applied (0000 initial + 0001 ownership/timing/epistemology/blog + 0002 multi-axis expansion adding causation-analysis/equality-model/populism/nationalism/authority columns to story_coverages; old `axis_progressive` kept nullable for historical rows)
- 197 pundits/organizations seeded across 3 seed scripts + 1 manual insert (VDH)
- DB client is lazy-initialized via Proxy (won't crash scripts that don't need DB)
- Drizzle Kit config uses explicit host/credentials, not URL (Windows pg driver workaround)

**LLM Layer (Phase 2 + extensions):**
- Provider abstraction at `src/lib/llm/provider.ts` — pluggable, no SDK dependency
- Anthropic provider implemented at `src/lib/llm/providers/anthropic.ts` (fetch-based, no SDK). `configureLLMFromEnv()` in `analyze.ts` auto-wires from `ANTHROPIC_API_KEY`.
- 7 prompt templates built:
  1. Tone/sentiment with humor detection (satire + observational critical)
  2. Structural fallacy detection (straw man, gish gallop, false equivalence)
  3. Neutral reframing suggestions
  4. **9-axis bias mapping** (updated April 2026 — prompt at `src/lib/llm/prompts/axis-mapping.ts`)
  5. Claim extraction (cross-source fact tracking)
  6. Omission detection (compares what each source included/excluded)
  7. Epistemological refinement (classifies ambiguous claims the rule engine can't handle)
- Content-hash cache with 7-day TTL at `src/lib/llm/cache.ts`
- Smoke test: `scripts/smoke-llm-pipeline.ts` runs end-to-end on Aleppo case study
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

**Profile Breakdowns (~31 profiles):**
- Individuals: DeFranco, Carlson, Owens, Fuentes, Shapiro, Maddow, Lemon, Pool, Cenk Uygur, Ana Kasparian, Hasan Piker, Destiny, Krystal Ball, Saagar Enjeti, Crowder, Pakman, Jon Stewart, Jordan Peterson, Victor Davis Hanson, Trump, Musk, Obama, Nicholas
- Organizations: CNN, Fox News, MSNBC, NYT
- Profiles are unvalidated initial hypotheses — must be replaced by system-generated assessments
- **Profile docs still use 5-axis format as of 2026-04-15.** 9-axis rewrite of `docs/revised_profile_breakdown.md` is in progress; `SEED_PROFILES` in `political-axes.ts` has 2/31 profiles populated with 9-axis scores (DeFranco, Carlson).

**Ownership tracking:** Schema fields added (corporateParent, ownershipType, financialInterests, fundingSources, country). Not yet populated.

### In Progress
- **9-axis profile rewrite** — `docs/revised_profile_breakdown.md` being upgraded from 5 to 9 axes with Logic System coherence notes and event-sourced justifications. Carlson template approved 2026-04-15; batch of remaining 30 profiles pending. After markdown rewrite, backfill `SEED_PROFILES` in `political-axes.ts`.
- Bulk historical ingestion running (NYT Archive sweep via Wayback Machine)
- Progress saved to `scripts/.ingest-progress.json` — resumes with `npm run ingest:bulk`

### Not Yet Implemented
- Human-in-the-loop training UI
- YouTube API key (slot exists in `.env.local`, real key still pending)
- Ownership data not yet APPLIED to DB (script written, needs `npm run db:seed-ownership`)
- UI display of 9-axis profiles (radar chart currently renders 5 axes)
- Phase 5: Production deployment (GKE Autopilot) — see `docs/infrastructure.md`
- Phase 6: YouTube video pipeline, training loop, fine-tuning

### Completed April 12-13, 2026 (uncommitted)
- **`docs/x-political-figures-500.md`** — 500 profiles of most-discussed political figures on X, organized in 15 batches, ~12,894 lines. Same format as `profile-breakdowns.md`.
- **`docs/x-500-continuation-plan.md`** — progress tracker and resume instructions for the 500-profile work.
- **`docs/revised_profile_breakdown.md`** — methodological revision of `profile-breakdowns.md`. All 26 profiles rewritten clinically with cited verifiable events for each axis score (no fabricated sample sizes; lower confidence rather than guess).
- **Elon Musk** added to `docs/profile-breakdowns.md` between Trump and Obama (full deep-format profile).
- **Easy wins #2, 4, 5, 6, 7, 8, 9, 10, 11** completed:
  - #2: `YOUTUBE_API_KEY` slot added to `.env.local`
  - #4: 7 new RSS feeds added to `seed.ts` (WaPo, Breitbart, Politico, The Hill, AP, Reuters, Daily Wire); Breitbart org added to `seed-200.ts`
  - #5: **No migration drift** — verified via column-name diff of `schema.ts` vs combined migrations 0000+0001. Schema is in sync. Cannot run `drizzle-kit generate` from WSL (Windows binary issue) — run from PowerShell if future schema changes are needed.
  - #6: New npm scripts: `db:seed-remaining`, `db:seed-ownership`, `test:youtube-channels`, `ingest:yt-transcripts`
  - #7: Landing/analysis/pundit pages now use shared `<Header />` component
  - #8: `scripts/test-youtube-channels.ts` (smoke-test 4 seeded channels; `--deep` fetches transcripts)
  - #9: `scripts/ingest-youtube-transcripts.ts` (18 channel targets, 25 videos/channel, resumable via `.yt-transcript-progress.json`)
  - #10/#11: `scripts/seed-ownership.ts` populates 35 organizations + 42 pundits with corporate parent, ownership type, financial interests, funding sources

### Next Session Priorities
1. Finish 9-axis rewrite of `docs/revised_profile_breakdown.md` (Carlson template approved; batch remaining 30)
2. Backfill `SEED_PROFILES` in `src/lib/models/political-axes.ts` from rewritten markdown
3. Update `PunditRadarChart` to render 9 axes
4. Commit and push accumulated April work
5. Get real YouTube API key into `.env.local` (Google Cloud Console)
6. Run `npm run db:seed-200` → `npm run db:seed` → `npm run db:seed-ownership`
7. Smoke test: `npm run test:youtube-channels --deep`
8. Bulk ingest: `npm run ingest:yt-transcripts` (runs in background, resumable)
9. Tune epistemological classifier rules (target 60%+ from current 27%)

## Key Design Decisions

**Architecture:**
- Logic engine is rule-based by design. LLMs augment, never replace. New analysis features MUST follow hybrid pattern: rule-based first, LLM refinement second. This is both the architectural pattern and the epistemological principle.
- Progressive ≠ liberal. Load-bearing distinction — and as of April 2026, "progressive" is no longer a single axis. It decomposed into causation-analysis (structural vs individual) and equality-model (outcome vs opportunity) because those two dimensions are orthogonal: a right-populist can be structural-causation + opportunity-equality, and a left-progressive can be individual-causation + outcome-equality.
- Populism, nationalism, and authority are independent axes that cut across left/right. Ignoring them produces measurement artifacts: figures like Tucker Carlson or Bernie Sanders score as "mixed/incoherent" in a 5-axis model when they are actually highly coherent populist-nationalist-isolationist (or populist-globalist-interventionist) rule sets. Low coherence in the 5-axis model was often an artifact of axis bundling, not a property of the figure. This is the central Logic System argument for the expansion.
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
- Don't re-bundle the 9 axes. "Populism is just a kind of conservatism" or "nationalism is just isolationism" are category errors — they collapse the independent dimensions the April 2026 expansion was built to preserve.
- Don't score the `authority` axis as a single net number. It is domain-split (speech/health/commerce/immigration/culture) and must be scored per sub-domain. A net score masks the real pattern.
- Don't use the legacy `progressive` axis in new writes. It's kept nullable for historical rows only.
- Don't use Anthropic SDK — LLM calls are provider-agnostic
- Don't use Wayback Machine CDX wildcard queries (403) — exact URL lookups only
- Don't run Docker Postgres on port 5432 — conflicts with local PG17
- Don't add socionics/personality type annotations to profiles or the system
- Don't present model-dependent interpretations as known truths (the Logic System's core principle)

## Open Model Questions (9-axis expansion, April 2026)

These are known gaps surfaced during the profile rewrite. Not blockers for the rewrite, but they should be resolved before the axis model ships to the public UI.

- **Reactionary axis extension.** The liberal-conservative axis is about *change tolerance* (pace and risk). It runs from "willing to change the status quo" (−1) to "preserve the last 1–2 generations" (+1). It has no representation for **negative change tolerance** — subjects who want to roll back multiple generations of changes (Fuentes is the canonical case; he pushes past the +1 ceiling). Options: (a) extend the axis past ±1 with a "reactionary" label, (b) treat "reactionary" as a separate axial extension, (c) add it as a boolean flag on high-conservative profiles. Decide before the radar chart is wired.
- **Contrarian as a coherence type.** Jordan Peterson's contrarian tendencies should be evaluated during batch 4. Open question: is contrarianism *reactionary from a different framing* (negative change tolerance on whatever the dominant narrative is — meaning the axis position is stable but looks scattered because "the dominant narrative" moves), or is it a **distinct coherence type** the `assessCoherenceType()` function should recognize alongside "philosophy-driven," "engagement-driven," and "mixed"? A contrarian is philosophy-driven *about the meta-level* (always-against-consensus) while appearing engagement-driven on individual axes because the positions flip as consensus flips. If it's a distinct type, the radar chart is the wrong visualization for it and we need a different one.
- **Persona divergence as a separate signal.** Fuentes operates two content modes (measured AFPAC, explicit Cozy.tv). The current seed entry blends both. This is an Overton-window manipulation pattern, not an axial one, and should be scored separately from the axis positions — flagged as a standing signal on the profile, not folded into the coherence score.
- **Principled-vs-instrumental speech flag.** The speech axis currently conflates "what position does the subject hold" with "do they apply it to speech they disagree with." Owens, Fuentes, Crowder, and Pool all hold free-speech positions in principle but apply them selectively. Needs a separate confidence flag or a sub-field on the speech axis.
- **Intra-right populism pattern.** Crowder's Stop Big Con, Carlson post-Fox, Owens post-2024 — populist in form, conservative-cluster in substance. The populism axis scores the form correctly, but the pattern of "populist against your own cluster" is diagnostically novel and should be added to the axis-mapping prompt's misconception list so the LLM recognizes it.
- **Stable-vs-moving axes diagnostic.** Pool surfaced this: true audience capture moves every axis toward the paying audience, while partial principled drift holds cluster-anchoring positions and moves cross-cutting ones. This should be formalized in `assessCoherenceType()` — currently the function only looks at aggregate shift ratio, not which axes moved.

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
| 4 | 9-axis bias mapping | 2 | Prompt built (updated April 2026 from 5 to 9 axes) |
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
| Political axes model (9 axes + seed profiles) | `src/lib/models/political-axes.ts` |
| Anthropic LLM provider (fetch-based, no SDK) | `src/lib/llm/providers/anthropic.ts` |
| LLM smoke test (end-to-end Aleppo) | `scripts/smoke-llm-pipeline.ts` |
| Blindspot detection + coverage timeline | `src/lib/db/repositories/stories.ts` |
| Claims + omission reports | `src/lib/db/repositories/claims.ts` |
| Blog post templates | `src/lib/blog/templates.ts` |
| Logic System integration | `docs/logic_system_integration.md` |
| Logic System source documents | `docs/logic-system/` |
| Profile breakdowns (27 profiles, incl. Musk) | `docs/profile-breakdowns.md` |
| Profile breakdowns — clinical revision | `docs/revised_profile_breakdown.md` |
| 500 most-discussed political figures on X | `docs/x-political-figures-500.md` |
| 500-figure continuation plan | `docs/x-500-continuation-plan.md` |
| Ownership seed script (orgs + pundits) | `scripts/seed-ownership.ts` |
| YouTube channel test script | `scripts/test-youtube-channels.ts` |
| YouTube transcript bulk ingestion | `scripts/ingest-youtube-transcripts.ts` |
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
| `npm run db:seed-remaining` | Seed extended pundits beyond seed-200 |
| `npm run db:seed-ownership` | Populate corporate parent / ownership type / financial interests for orgs + pundits |
| `npm run test:youtube-channels` | Smoke-test the 4 seeded YouTube channels (add `-- --deep` to fetch transcripts) |
| `npm run ingest:yt-transcripts` | Bulk YouTube transcript ingestion (18 channels, resumable) |

## Project Context

- **Product**: Free blog-style website + YouTube monetization. Analysis is the content, YouTube is the revenue.
- **Owner**: Nicholas Major, studying Communications at WGU. Has EBSCO + ProQuest through WGU library (API access not yet obtained). Masters in Philosophy, works as data scientist.
- **Other projects**: Alphabreak (standalone), PokerForge (app + shared k8s cluster), poker content videos (local → YouTube), Theory of Everything (local → YouTube)
- **Primary differentiators**: Multi-axis model (no competitor does this), transparent rule engine (auditable), cross-source omission tracking (measures what's missing, not what's wrong), epistemological classification (no competitor classifies claims by truth-status type)
