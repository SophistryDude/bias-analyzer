# Rename Notes — BiasAnalyzer → MediaSentinel

**Date:** April 13, 2026
**Commit:** `01706d2` (rename in code) + this file
**Owner:** GitHub username changed from `SophistryDude` → `Arkanisbot` (April 13, 2026). Repo now at https://github.com/Arkanisbot/MediaSentinel. Historical references to `SophistryDude` below are preserved as record of prior state but URLs have been updated to the current canonical location.

This document captures the rebrand from `BiasAnalyzer` to `MediaSentinel` for future reference. If you (or a future Claude session) encounter old `bias-analyzer` references, this file explains where they could still legitimately appear and which steps still need to be done outside the running session.

---

## Naming conventions chosen

| Form | Old | New | Used in |
|------|-----|-----|---------|
| Display brand | `BiasAnalyzer` | `MediaSentinel` | Header.tsx, layout.tsx title, README, all docs, blog post templates |
| npm/slug | `bias-analyzer` | `mediasentinel` | package.json `"name"`, package-lock.json, scraper user-agent strings, comments |
| Postgres ident | `bias_analyzer` | `mediasentinel` | docker-compose.yml, drizzle.config.ts, `.env.local` `DATABASE_URL` |
| Folder | `bias-analyzer` | `MediaSentinel` | Local filesystem (Windows) |
| GitHub repo | `bias-analyzer` | `MediaSentinel` | https://github.com/Arkanisbot/MediaSentinel |

The analytical word **"bias"** (as in "political bias detection") is intentionally **preserved** everywhere it appears as a concept rather than as the brand. Examples that should NOT be renamed:
- `src/app/page.tsx` feature card "Political Bias"
- `src/app/layout.tsx` description "media bias analysis"
- Scraper comments mentioning "bias detection"
- The blog post category "bias assessment"

If you find a `bias` reference and aren't sure whether it's the brand or the concept, check whether it's followed by `Analyzer` (brand) or by a generic noun like `detection`, `assessment`, `markers` (concept).

---

## What was changed in commit `01706d2`

30 files changed, 78 insertions / 78 deletions (pure rename, no other content):

**Source code:**
- `src/app/layout.tsx` — page title and metadata description
- `src/app/page.tsx` — landing page brand text (the JSX-split brand was in Header.tsx; page.tsx had inline brand removed in easy-wins #7)
- `src/components/Header.tsx` — `Bias<span>Analyzer</span>` → `Media<span>Sentinel</span>`
- `src/app/api/feed.xml/route.ts` — RSS feed site title and base URL fallback
- `src/lib/blog/templates.ts` — blog post header branding
- `src/lib/pipeline/historical-ingest.ts` — comments and user-agent string
- `src/lib/scrapers/{article,rss,wayback}.ts` — comments and user-agent strings

**Scripts:**
- `scripts/bulk-ingest.ts`
- `scripts/test-nyt-pipeline.ts`
- `scripts/test-wayback.ts`

**Config:**
- `package.json` — `"name": "mediasentinel"`
- `package-lock.json` — both `"name"` fields
- `docker-compose.yml` — `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`
- `drizzle.config.ts` — `user`, `password`, `database`
- `.env.local` — `DATABASE_URL` (gitignored, not in commit, but I updated it locally)

**Documentation:**
- `CLAUDE.md`
- `README.md`
- `docs/easy-wins.md`
- `docs/decisions.md`
- `docs/infrastructure.md`
- `docs/implementation-roadmap.md`
- `docs/logic_system_integration.md`
- `docs/profile-breakdowns.md`
- `docs/revised_profile_breakdown.md`
- `docs/x-political-figures-500.md`
- `docs/pundit-list-200.md`
- `docs/bad_faith_argumentation.md`
- `docs/analysis-crt-epistemology.md`
- `docs/analysis-socionics-profiling.md`

**Memory** (Claude harness, not in repo):
- `~/.claude/projects/-mnt-c-Users-nicho-bias-analyzer/memory/*.md` — updated in place
- `~/.claude/projects/-mnt-c-Users-nicho-MediaSentinel/memory/` — copy created so the next Claude session in the renamed folder picks up the same memories
- `project_biasanalyzer_purpose.md` → `project_mediasentinel_purpose.md` (filename also renamed)

---

## Steps that must be done OUTSIDE the rename commit

These cannot be done from inside a running Claude session sitting in the directory being renamed. They are listed in the order they should be performed.

### 1. Rename the GitHub repo

Web UI is easiest:
1. Go to https://github.com/Arkanisbot/MediaSentinel/settings (was `SophistryDude/bias-analyzer/settings` before the rename)
2. Repository name → `MediaSentinel` → Rename
3. GitHub auto-creates redirects from the old URL

Or via gh CLI (if installed):
```bash
gh repo rename MediaSentinel
```

### 2. Rename the local folder

From PowerShell on Windows (NOT from inside the running Claude session):
```powershell
cd C:\Users\nicho
Move-Item bias-analyzer MediaSentinel
cd MediaSentinel
```

### 3. Update the local git remote URL

After the GitHub rename in step 1:
```powershell
git remote set-url origin https://github.com/Arkanisbot/MediaSentinel.git
git remote -v   # verify
```

GitHub's auto-redirect makes this technically optional (old URL still works), but it's good housekeeping.

### 4. Migrate the postgres database

The `.env.local` `DATABASE_URL` now points at `mediasentinel:mediasentinel_dev@127.0.0.1:5432/mediasentinel`. The actual postgres role and database still exist under their old names until you migrate them.

**Option A: rename in place (preserves data — recommended).** From `psql` connected as a postgres superuser:
```sql
ALTER ROLE bias_analyzer RENAME TO mediasentinel;
ALTER USER mediasentinel WITH PASSWORD 'mediasentinel_dev';
ALTER DATABASE bias_analyzer RENAME TO mediasentinel;
```
The password rename is needed because `.env.local` now expects `mediasentinel_dev`. If you'd rather keep the old password, edit `.env.local` instead and skip the `ALTER USER ... PASSWORD` line.

**Option B: drop and recreate (loses all data, requires re-seed).**
```sql
DROP DATABASE bias_analyzer;
DROP ROLE bias_analyzer;
CREATE ROLE mediasentinel WITH LOGIN PASSWORD 'mediasentinel_dev';
CREATE DATABASE mediasentinel OWNER mediasentinel;
```
Then re-run schema and seed scripts:
```powershell
psql -U postgres -d mediasentinel -f drizzle/0000_yielding_killraven.sql
psql -U postgres -d mediasentinel -f drizzle/0001_long_robin_chapel.sql
npm run db:seed
npm run db:seed-200
npm run db:seed-ownership
npx tsx scripts/seed-aleppo-story.ts
```

### 5. Verify the dev server boots

```powershell
npm run dev
# open http://localhost:3000
# header should display "MediaSentinel" with "Sentinel" in red
# layout title should read "MediaSentinel — Media Bias Analysis"
```

### 6. (Optional) Regenerate `package-lock.json`

I updated the two `"name"` fields manually, but a fresh `npm install` will produce a cleaner lockfile:
```powershell
Remove-Item package-lock.json
npm install
git add package-lock.json
git commit -m "Regenerate package-lock.json after rename"
git push
```

### 7. Start a fresh Claude session

The new session should be opened in `C:\Users\nicho\MediaSentinel`. The memory directory at `~/.claude/projects/-mnt-c-Users-nicho-MediaSentinel/memory/` will be discovered automatically.

The old memory directory at `~/.claude/projects/-mnt-c-Users-nicho-bias-analyzer/memory/` can be deleted once the new session is confirmed working, or left in place dormant.

---

## What was NOT renamed (and why)

- **`node_modules/`** — package directory, not project-named. The `bias-analyzer` references inside `node_modules/.package-lock.json` (the npm-internal lockfile, separate from the root `package-lock.json`) will be regenerated by `npm install`.
- **The `~/.claude/projects/-mnt-c-Users-nicho-bias-analyzer/` directory** — left in place as a fallback. The new session uses the `MediaSentinel`-named copy.
- **Migrations folder names** (`drizzle/0000_yielding_killraven.sql`, etc.) — these are auto-generated names from `drizzle-kit` and have no relationship to the project name.
- **Git history** — commit messages from before April 13, 2026 retain the "BiasAnalyzer" name. This is intentional; rewriting history to rename the project would invalidate the existing commit hashes and break any external references to them.
- **Postgres data files on disk** (`PGDATA`) — postgres uses internal OIDs, not names, so the rename via `ALTER DATABASE` is purely a metadata change. No data migration needed.

---

## Future Claude sessions reading this

If you're a future Claude session looking at this file:

1. The project's identity is **MediaSentinel**. Use that name.
2. If you find `bias-analyzer` or `BiasAnalyzer` anywhere in the codebase that isn't (a) inside `node_modules/`, (b) in this RENAME_NOTES.md file, or (c) in old commit messages — flag it as a missed rename and ask the user whether to fix it.
3. The product is still about analyzing media bias. The word "bias" appears legitimately throughout the codebase as the analytical concept. Don't rename "bias detection" or "bias assessment" — those are descriptions of what the tool does, not the brand.
4. The Logic System integration (BiasAnalyzer = the framework operationalized) still applies — the rename doesn't change the project's epistemological foundation. The `docs/logic_system_integration.md` document explains the relationship.
