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
- Individuals (32): DeFranco, Carlson, Owens, Fuentes, Shapiro, Maddow, Lemon, Pool, Cenk Uygur, Ana Kasparian, Hasan Piker, Destiny, Krystal Ball, Saagar Enjeti, Crowder, Pakman, Jon Stewart, Jordan Peterson, Victor Davis Hanson, Trump (dual-profile: pre-2015 + 2016-2024), Musk (tenet-extraction), Obama, Nicholas (tenet-extraction + questionnaire-validated), Marco Rubio
- Organizations (4): CNN, Fox News, MSNBC, NYT
- **All profiles scored on 9 axes as of April 2026.** `SEED_PROFILES` in `political-axes.ts` has 25 individual entries (organizations not yet in seed). Profile docs in `revised_profile_breakdown.md` are the canonical 9-axis source. `profile-breakdowns.md` retains the original 5-axis profiles with Logic System Analysis critiques added under each.
- **Six coherence types identified:** position-coherence (Shapiro), institution-absorbed (Lemon), method-coherence (Destiny), evidence-responsive-domain-update (Kasparian), tenet-extraction-stable-anchors (Musk), framework-updatable-philosophy-driven (Nicholas)
- **Five scoring methodologies named:** standard, primary-period scoping (Peterson, Stewart), dual-profile (Trump), tenet-extraction (Musk, Nicholas), structural-editorial (organizations)
- **Nicholas tenet-extraction questionnaire** at `docs/nicholas-tenet-questionnaire.md` — 20-question validation producing 13/14 prediction accuracy

**Ownership tracking:** Schema fields added (corporateParent, ownershipType, financialInterests, fundingSources, country). Not yet populated.

### In Progress
- Bulk historical ingestion running (NYT Archive sweep via Wayback Machine)
- Progress saved to `scripts/.ingest-progress.json` — resumes with `npm run ingest:bulk`

### Not Yet Implemented
- Organization SEED_PROFILES entries (CNN, Fox, MSNBC, NYT not yet in `political-axes.ts`)
- DeFranco `profile-breakdowns.md` Logic System critique
- `primaryPeriod` field on `PoliticalProfile` (on roadmap, documented in Open Model Questions)
- `assessCoherenceType()` update to recognize all six coherence types
- UI display of 9-axis profiles (`PunditRadarChart` currently renders 5 axes)
- Axis-mapping prompt updates for misconception list additions (intra-right populism, framing-not-target classification, deliberate-vs-unknowing category errors)
- Tenet-extraction retrofit for Owens, Uygur, Pool (candidate subjects)
- Post-rewrite review of all profiles for axial-vs-content coherence pattern
- Human-in-the-loop training UI
- YouTube API key (slot exists in `.env.local`, real key still pending)
- Ownership data not yet APPLIED to DB (script written, needs `npm run db:seed-ownership`)
- Phase 5: Production deployment (GKE Autopilot) — see `docs/infrastructure.md`
- Phase 6: YouTube video pipeline, training loop, fine-tuning

### Completed April 12-13, 2026 (some items now committed)
- **`docs/x-political-figures-500.md`** — 500 profiles of most-discussed political figures on X, organized in 15 batches, ~12,894 lines.
- **`docs/x-500-continuation-plan.md`** — progress tracker and resume instructions for the 500-profile work.
- **Easy wins #2, 4, 5, 6, 7, 8, 9, 10, 11** completed (see git history for details).

### Completed April 15, 2026
- **9-axis profile rewrite (Batches 1-5 + Rubio)** — all 32 individual profiles + 4 organizations rewritten from 5-axis to 9-axis in `revised_profile_breakdown.md`. Logic System critiques added to every profile in `profile-breakdowns.md`. SEED_PROFILES backfilled for 25 individual profiles.
- **Type system extended** — `SubDomainPosition` (authority sub-domains), `axialCoherence` / `contentCoherence`, `rhetoricalStyleVariance` fields added to `PoliticalProfile`
- **LLM prompt updated** — `axis-mapping.ts` now emits 9 axes + optional authority sub-domains
- **Logic System integration doc expanded** — 6 standing principles (observer-effect, Stewart principle, Kasparian evidence-responsive pattern, four philosophy-driven engines, axial-vs-content coherence, tenet-extraction methodology) + scoring methodology taxonomy
- **CLAUDE.md updated** — 9-axis references throughout, Open Model Questions section (reactionary axis, contrarian coherence, persona divergence, principled-vs-instrumental speech, intra-right populism, stable-vs-moving axes, recency weighting, target-agnostic skepticism, tenet-extraction methodology, two-level coherence)
- **Nicholas Major questionnaire** — 20-question tenet-extraction validation at `docs/nicholas-tenet-questionnaire.md`

### Next Session Priorities
1. Update `PunditRadarChart` to render 9 axes
2. Add organization SEED_PROFILES entries (CNN, Fox, MSNBC, NYT)
3. Get real YouTube API key into `.env.local` (Google Cloud Console)
4. Run `npm run db:seed-200` → `npm run db:seed` → `npm run db:seed-ownership`
5. Smoke test: `npm run test:youtube-channels --deep`
6. Bulk ingest: `npm run ingest:yt-transcripts` (runs in background, resumable)
7. Tune epistemological classifier rules (target 60%+ from current 27%)
8. Implement `primaryPeriod` field on `PoliticalProfile`
9. Update `assessCoherenceType()` to recognize all six coherence types

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
- **Recency weighting / primary-period scoping.** When a subject has changed positions over a long career (Uygur: Republican → social-democratic populist; Kasparian: progressive → heterodox-left; Pool: Occupy left → populist right; Owens: Degree180 left → populist-nationalist right), the current model has no explicit mechanism for weighting recent content over historical content. Axis scores implicitly reflect the "current" framework but the 5-axis model would sometimes depress coherence based on historical contradictions. Batch 1-3 profiles handle this ad-hoc in the `notes` field ("post-2002 framework," "post-2017 cluster"). This should be formalized — options: (a) add `primaryPeriod?: { start: string; end?: string }` to `PoliticalProfile` as the explicit scope the score applies to, (b) add a `trajectoryWeight` parameter that decays old content, (c) split scores into `currentPosition` and `legacyPosition` with a blend. The risk of not formalizing: we may be implicitly weighting old content too heavily in aggregate coherence scores, making recently-stabilized subjects look more incoherent than they are. Recommend option (a) as the minimal fix; options (b) and (c) are larger changes that could come later.
- **Tenet-extraction as an alternative scoring methodology.** For subjects with significant pre-political public records and ideologically-reversed-or-drifted trajectories (canonical test case: Elon Musk, Batch 4), a **tenet-extraction** methodology produces more accurate predictions than whole-period trajectory blending: identify the stable underlying tenets that have not moved across the subject's public record, then analyze apparent political drift as applications of those tenets to changing political contexts. Musk's tenet-extraction coherence (0.70) is substantially higher than his 5-axis trajectory-blend score (0.35), and the methodology correctly predicts counterintuitive positions (Musk is libertarian-leaning on immigration −0.20 while every other right-coalition subject scores authoritarian — predicted by Tenet 5 "pro-skilled-immigration," missed by party-alignment inference). Candidates for tenet-extraction scoring: Nicholas Major (pre-2010 libertarian → current classical-liberal), Owens (pre-2017 progressive → populist-nationalist right), Uygur (pre-2002 Republican → populist-left social-democrat), Pool (pre-2018 Occupy-left → populist-right), Peterson (2016-2020 academic-classical-liberal → post-2021 trajectory). The methodology is not a replacement for standard scoring — it is an alternative for subjects whose trajectory is better explained by "stable tenets applied to changing coalition offerings" than by "whole-person axis movement." Open question: which subjects in the dataset are best-served by tenet-extraction vs. primary-period scoping vs. dual-profile methodology? Current candidates: Trump (dual-profile), Musk (tenet-extraction), Peterson (primary-period scoping), Uygur/Kasparian/Pool/Owens (primary-period scoping in notes field). Formalize these three methodologies as named options in the scoring methodology documentation.
- **Two-level coherence distinction (axial vs. content).** Trump's profile surfaced this: a subject can exhibit **axial coherence** (rule set produces consistent positions on the 9 axes) without **content coherence** (specific claims within those positions are consistent and predictable). Philosophy-driven profiles (Shapiro, Maddow, Obama, Hanson) have both. Engagement-driven profiles have neither. Trump has axial coherence without content coherence — his 2016-2024 framework predicts the direction of 2025/26 actions with high accuracy (tariffs, mass deportation, DOGE, NATO pressure, anti-DEI EOs) but does not predict specific content (which people, which countries, which rates). This is a distinction `assessCoherenceType()` does not currently track and should be added. Proposed implementation: separate `axialCoherence` and `contentCoherence` fields on `PoliticalProfile`, with the aggregate coherence being a weighted blend.
- **Target-agnostic skepticism vs. position-coherence with rhetorical-target variance.** The question arose with Jon Stewart: is "criticize whoever currently holds power" a distinct coherence type, or is it a standard position-coherent subject (clear policy positions) with a rhetorical pattern of tracking power-holders? RESOLVED: it is the latter. Stewart has traditional position-coherence (clear left-of-center policy) with high rhetorical-target variance. The apparent "both-sidesism" is a perception artifact — reader bias weights rare criticism of one's own tribe more heavily than frequent criticism of the other tribe, creating an illusion of symmetric criticism when it is asymmetric in both direction and volume. This is a **reader-side measurement error**, not a subject-side coherence type. Track in the rule engine as a standing warning when analyzing audience perception of cross-tribe critics.

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
