# BiasAnalyzer — Decision Log

Every significant architectural, technical, and product decision made during development, with the reasoning behind each.

---

## Product Decisions

### The product is a free blog + YouTube monetization
**Decision:** BiasAnalyzer is a free blog-style website. Revenue comes from YouTube videos covering the analysis findings.
**Why:** The analysis is the content. The site builds credibility and provides source material; YouTube is where the audience and money are. Nicholas's personality and commentary are the monetization vehicle — the system generates research and scripts, not videos.

### Multi-axis model over single left-right spectrum
**Decision:** Use 5 independent axes (economic, speech, progressive/equity, liberal/conservative, foreign policy) instead of a single bias score.
**Why:** Every competitor (AllSides, MBFC, Ad Fontes) uses a single spectrum. This is reductive — Tucker Carlson is economically populist (left-coded) while socially conservative (right-coded) while strongly isolationist. A single score loses that. The multi-axis model is the primary product differentiator.

### Progressive ≠ liberal (load-bearing distinction)
**Decision:** The progressive axis and liberal/conservative axis are explicitly separate.
**Why:** Most people conflate these. A liberal might want change through deregulation (liberal but non-progressive). A progressive might want existing equity programs preserved (progressive but conservative about those programs). No competitor formalizes this distinction. It emerged from Nicholas's study of the Pareto principle — unequal distributions are emergent properties of complex systems, which makes the progressive/non-progressive divide about systemic intervention philosophy, not about pace of change.

### We don't decide what's true
**Decision:** The accuracy framework is based on cross-source claim extraction and omission tracking, not fact-checking.
**Why:** "Accurate" requires ground truth, and ground truth is contested — that's literally why biased media exists. Instead, we extract factual claims from each source covering the same story, cross-reference them, and show what each source included vs omitted. The omission pattern reveals the bias. The audience evaluates truth. Validated with the April 2016 Aleppo case study: CNN omitted rebel mortar attacks on the government side; NYT covered both sides; Breitbart omitted all opposing voices on Trump's speech. Nobody lied — omission was the bias tool.

### Pundit profiles must be system-generated, not editorial
**Decision:** Current hand-written profiles (profile-breakdowns.md) are unvalidated initial hypotheses. The system should generate and update profiles from analyzed content.
**Why:** Nicholas called out that Claude was just accepting his editorial assessments without pushing back. If we accept self-labels and hand-written profiles at face value, we're doing the same thing we flag Tim Pool for (motte-and-bailey self-labeling). The system's credibility depends on deriving positions from evidence.

### Blog content is semi-automated
**Decision:** LLM generates draft posts from analysis data. Nicholas reviews, edits, and publishes.
**Why:** Full automation risks quality and credibility. The human review step is what separates this from AI-generated content farms. The system does the research; the human ensures it's right.

### Humor detection is internal, not audience-facing
**Decision:** The 7-type humor classification (satire and observational being critical) exists solely to improve sentiment analysis accuracy.
**Why:** The audience cares whether we correctly identified the creator's message, not that we detected sarcasm. Satire inverts literal meaning — without detecting it, tone scores are wrong and bias direction can flip. Observational humor masks persuasive framing as casual observation. These are accuracy problems, not features to advertise.

### Overton window for narrative framing, not academic discussion
**Decision:** Use Overton window data to point out when narratives have shifted (e.g., socialism moving from radical to center), not to explain Overton theory.
**Why:** The shift is the story. "This position was considered radical 10 years ago and is now mainstream" is compelling content. Lecturing about the Overton window as a concept is not.

---

## Technical Architecture Decisions

### Rule-based logic engine, LLMs as enhancement layer
**Decision:** The fallacy detection and reframing engine is deliberately rule-based (keyword patterns). LLMs run second as an enhancement layer.
**Why:** Three reasons: (1) The rule engine is auditable — someone can look at the patterns and argue with them. Black-box ML can't do this. (2) The rule engine is free, fast, and deterministic. (3) If the LLM is down or budget runs out, the system still works. LLMs add tone scoring, structural fallacy detection, and neutral reframing — things keywords genuinely can't do. But they don't replace the transparent foundation.

### No Anthropic SDK
**Decision:** LLM calls are provider-agnostic prompt templates, not tied to any SDK.
**Why:** Nicholas already has Claude Code — doesn't need the SDK. The prompt templates are standalone functions with typed inputs/outputs. The actual API call mechanism is pluggable, so we can swap Claude for GPT, local models, or anything else without rewriting prompts.

### PostgreSQL + Drizzle ORM (not Prisma, not MongoDB)
**Decision:** PostgreSQL with Drizzle ORM for the database layer.
**Why:** The data is relational (pundits → content → analyses → detections). MongoDB would lose referential integrity for no benefit. Drizzle over Prisma because: no separate binary, SQL-like query API (transparent, not magic), lighter weight, better Neon/serverless driver support. TypeScript-native with generated migrations.

### node-cron + pg-boss (not Airflow)
**Decision:** Simple cron scheduler with PostgreSQL-backed job queue, not Airflow or Dagster.
**Why:** Nicholas originally suggested Airflow. We pushed back: the pipeline is 4 steps (scrape → analyze → store → notify). Airflow requires a scheduler process, metadata database, workers, and significant devops overhead for a 4-step pipeline. pg-boss uses the existing PostgreSQL — no new infrastructure. Graduate to Dagster when monitored sources exceed 50 or pipeline exceeds 10 steps.

### Wayback Machine as primary historical source
**Decision:** Use the Internet Archive's Wayback Machine CDX API for historical article retrieval, not LexisNexis or paywall bypass.
**Why:** Free, legal, covers 1996-2025 for major outlets. NYT, WaPo, WSJ all have extensive archives before publishers blocked the crawler in late 2025. Combined with the NYT Article Search API (free, gives URLs back to 1851), we can discover article URLs via API and fetch full text from the archive. LexisNexis starts at ~$171/month and requires enterprise sales. The Wayback Machine gap (late 2025-present) is only ~6 months and covered by RSS feeds + live scrapers.

### CDX exact URL lookups only (no wildcards)
**Decision:** Only use exact URL queries against the Wayback Machine CDX API, not wildcard/prefix searches.
**Why:** Prefix/wildcard CDX queries return 403 Forbidden — they require authorization from the Internet Archive. Exact URL lookups work without auth. We get URLs from the NYT API, Google News RSS, or known URL patterns, then look them up individually.

### NYT API: Article Search + Archive + Times Wire
**Decision:** Enable these three NYT APIs, skip Books/Most Popular/RSS/Top Stories.
**Why:** Article Search is the primary URL discovery engine (search by author, keyword, date). Archive API gives bulk monthly article dumps (one call = every article published that month). Times Wire feeds the real-time monitoring pipeline. The others don't help with historical analysis or content ingestion.

### Article scraper: @mozilla/readability + jsdom (not regex)
**Decision:** Replaced the original regex-based HTML extraction with readability + jsdom.
**Why:** The original scraper stripped HTML tags with regex, which is fragile and includes nav/footer/sidebar content. Readability is the same algorithm Firefox Reader Mode uses — it identifies the main article content reliably. The code itself had a comment saying to do this.

### Lazy database client initialization
**Decision:** The database client (`src/lib/db/client.ts`) uses a Proxy for lazy initialization instead of eagerly connecting on import.
**Why:** Scripts that import modules in the dependency chain (like the historical ingestion test) would crash if DATABASE_URL wasn't set, even if they didn't need the database. Lazy init means the connection only happens when a query is actually executed.

### Local PostgreSQL 17, not Docker (for now)
**Decision:** Use the locally installed PostgreSQL 17 instead of the Docker Compose container.
**Why:** Nicholas already had PG17 installed and running on port 5432. The Docker container conflicted on the same port. The `postgres.js` npm driver also had `scram-sha-256` auth issues connecting to the Docker container on Windows (even with `trust` and `md5` auth mode overrides). Using local PG was the path of least resistance. Docker Compose file is kept for future k8s migration.

### drizzle.config.ts uses explicit credentials, not URL
**Decision:** Drizzle Kit config specifies host/port/user/password/database individually instead of a connection string URL.
**Why:** The `pg` driver used by drizzle-kit was hanging on `db:push` with the URL-based connection string on Windows. Explicit credentials with `ssl: false` resolved the issue. The seed scripts still use the `DATABASE_URL` env var via `postgres.js` driver (which works fine).

---

## Infrastructure Decisions

### GKE Autopilot (not Vercel + Hetzner VPS)
**Decision:** Deploy to Google Kubernetes Engine Autopilot instead of the original plan of Vercel (site) + Hetzner VPS (worker).
**Why:** Nicholas wants to migrate to k8s eventually. GKE Autopilot manages nodes automatically — we only pay for pod resources consumed. Cheaper at small scale than EKS Fargate. Google invented k8s so conformance is best. One free cluster, estimated $30-40/mo total. The original Vercel + Hetzner plan was ~$74/mo and would require a separate migration to k8s later.

### Shared cluster with PokerForge, not Alphabreak
**Decision:** BiasAnalyzer and PokerForge website share a GKE cluster. Alphabreak is standalone.
**Why:** Alphabreak is too large for shared infrastructure. BiasAnalyzer and PokerForge are both web apps with modest resource needs — sharing a cluster reduces per-project cost. Namespace isolation keeps them separated (resource quotas, network policies, separate secrets).

### Cloud SQL over self-managed PostgreSQL in k8s
**Decision:** Use managed Cloud SQL for PostgreSQL rather than running Postgres as a k8s pod.
**Why:** Database management in k8s is operational overhead (backups, failover, persistent volumes, upgrades). Cloud SQL handles all of this. The $10/mo for db-f1-micro is worth not managing stateful workloads in k8s. Migration path: pg_dump local → Cloud SQL import.

### Build-toward, not deploy-now
**Decision:** Infrastructure is a build-toward target. Development stays local for now.
**Why:** Nicholas will play with the project for a while before making it public. No point paying for cloud resources during development. Containerize and write k8s manifests now so deployment is a `kubectl apply` away when ready.

---

## Content & Data Decisions

### 196 pundits/organizations in the registry
**Decision:** Seed the database with ~200 entries across cable news hosts, YouTube/podcast commentators, print journalists, political figures, and media organizations.
**Why:** Comprehensive coverage across the political spectrum and media types. Includes competitors (AllSides, MBFC) for comparison. The list is expandable — more pundits will be added as the system discovers them through analysis.

### Prioritize Wayback Machine for historical ingestion
**Decision:** Use the Wayback Machine for the bulk of historical content (20+ years), defer the last 6 months to live scrapers.
**Why:** Nicholas explicitly said to prioritize Wayback for heavy lifting. The archive has decades of content captured before publishers blocked it. The recent 6-month gap is small relative to the 20+ year window and is covered by RSS feeds and live article scraping.

### ProQuest and EBSCO integrations built API-ready, not connected
**Decision:** Write the integration code with typed interfaces and search functions, but don't block on API credentials.
**Why:** Nicholas has access through WGU but doesn't have API credentials yet. Building the code now means we can plug in credentials when available. ProQuest is the biggest unlock — full-text archives for NYT/WaPo/WSJ back to the 1980s.

### NYT API key needs rotation
**Decision:** The API key was shared in chat and should be regenerated.
**Why:** Security hygiene. The key is in .env.local (gitignored) but exists in this conversation's history. Rotate at https://developer.nytimes.com/my-apps.

### Cross-source story tracking with per-coverage axis scores
**Decision:** The stories/story_coverages tables track per-story political axis scores, not just overall source profiles.
**Why:** A source's overall profile might be "center-left" but their coverage of a specific story might score differently. CNN might cover healthcare from a strong progressive angle (-0.8 progressive) while covering foreign policy from a centrist position. Per-story axis scores reveal situational bias that aggregate profiles miss.

### Completeness score = reliability axis
**Decision:** The reliability axis is derived from accumulated omission data, not a separate assessment.
**Why:** A source that consistently includes 90% of significant claims across multiple stories is demonstrably more reliable than one that includes 60%, regardless of political leaning. This is objective, measurable, and doesn't require us to be the arbiter of truth. It measures journalistic rigor as a proxy for accuracy.

### BiasAnalyzer is the Logic System applied to media
**Decision:** Treat BiasAnalyzer and the Theory of Everything Logic System as one intellectual program, not two separate projects.
**Why:** The structural mappings are direct, not metaphorical. Dimensional reduction → why single-spectrum bias ratings fail. Constraint reduction → the omission framework. Model vs reality → we don't decide truth. The epistemological taxonomy (known truth / tacit understanding / formal truth) maps directly to bias detection: bias is presenting tacit understanding as known truth. The rule-based engine preserves auditability as epistemological integrity. See `docs/logic_system_integration.md` for the full analysis.

### Event-centric architecture for evolving partisan scores
**Decision:** Stories (events) are the primary unit of analysis, not articles or pundits. Each event gets linked to all contributor articles covering it, with meta tags for the event. Partisan scores for contributors evolve over time as more event coverage accumulates.
**Why:** A pundit's bias isn't a static number — it's a trajectory. By linking contributors to events over time, we can watch how their coverage patterns shift. The event table becomes the ground truth reference; contributor scores are derived from their accumulated event coverage. This is the constraint reduction principle applied longitudinally — more data points = more constraints = more accurate profile.

### Ownership and financial interests stored per-contributor
**Decision:** Add ownership/financial interest data as rows in the contributor (pundit) table, not a separate system.
**Why:** Ownership is a structural constraint on coverage. It belongs with the contributor data because it's a property of the source, not the story. CNN's corporate parent affects all their coverage, not just specific events.

### Coverage distribution is a time-series object on the story
**Decision:** Track which outlets covered a story and when as time-stamped objects, not just presence/absence.
**Why:** When an outlet covers a story matters as much as whether they covered it. First-mover vs late-coverage vs never-covered are three different signals. The time dimension on coverage captures narrative evolution — who set the frame, who followed, who ignored.

### International axis calibration is an unsolved problem
**Decision:** Acknowledge that the 5-axis model needs regional calibration for international sources but don't solve it yet.
**Why:** The US speech axis is nearly unique globally — absolute free speech is not the norm. A US "center" on speech would be "strong free speech" in most countries. Foreign policy axis is inherently perspective-dependent — "interventionist" from the US means something different from France or Qatar. Options: (1) normalize per-country, (2) keep US scale and annotate divergence, (3) create a "favorability toward American intervention" reframe for international comparability. Decision deferred until international analysis is prioritized.

### Add epistemological classification layer (LLM task #12)
**Decision:** Classify each extracted claim by its truth-status type, not just whether it contains a fallacy.
**Why:** Falls directly out of the Logic System's epistemological taxonomy. No competitor does this. Output would show: "This article contains 12 claims. 3 are verifiable observations, 4 are model-dependent interpretations presented as facts, 2 are value judgments, 3 are tacit consensus." This is the deepest integration of the ToE framework into the product.
