# MediaSentinel — Easy Wins (Ordered by Dependencies)

Tasks that are small lifts with high value. Ordered so that if task B depends on task A, A comes first.

**Status as of April 13, 2026:** Tasks #2, #4, #5, #6, #7, #8, #9, #10, #11 are complete (uncommitted). See "Completed April 12-13" in `CLAUDE.md` for details. Remaining tasks: #1 (rotate NYT key), #3 (run bulk ingestion for more years), #12-#23.

---

## No Dependencies (can do right now)

### 1. Rotate the NYT API key
**Lift:** 2 minutes
**Why:** Key was shared in chat. Regenerate at https://developer.nytimes.com/my-apps, update `.env.local`.

### 2. Add YouTube API key to `.env.local`
**Lift:** 5 minutes
**Why:** Unlocks YouTube channel monitoring and video metadata for all 4 seeded YouTube channels. Get key at https://console.developers.google.com/.

### 3. Run bulk ingestion for remaining years
**Lift:** 0 (just run the command, it runs for hours in background)
**Why:** We only ran 2016. Each year adds hundreds of articles.
```bash
npx tsx scripts/bulk-ingest.ts --from 2006 --to 2025
```

### 4. Add more RSS feeds to monitored sources
**Lift:** 15 minutes (add rows to seed script, re-run)
**Why:** We only have 7 monitored sources. WaPo, Breitbart, Politico, The Hill, AP, Reuters, Daily Wire all have RSS feeds. Adding them is just inserting rows.

### 5. Generate the database migration for new schema fields
**Lift:** 5 minutes
**Why:** We added ownership fields, coverage timing, blindspot tables, epistemological classification, and blog_posts since the initial migration. Need a new migration to apply these to the running database.
```bash
npx drizzle-kit generate
# Then apply via psql since drizzle push has issues on Windows
```

### 6. Add `db:seed-remaining` to npm scripts
**Lift:** 1 minute
**Why:** We have the script but no npm shortcut for it.

### 7. Update the landing page header to include Blog link
**Lift:** 5 minutes
**Why:** The shared Header component has the Blog link, but the landing page (`src/app/page.tsx`) and analysis page still use their own inline headers. Replace with the shared component.

---

## Depends on #2 (YouTube API Key)

### 8. Test YouTube channel monitoring for seeded channels
**Lift:** 10 minutes
**Why:** The scheduler, channel monitor, and transcript scraper are all built. With an API key, run a test to verify the full pipeline works: discover new videos → fetch transcripts → enqueue for analysis.

### 9. Bulk ingest YouTube transcripts for top pundits
**Lift:** Build a script (~30 min), then run in background
**Why:** YouTube transcripts are our deepest source for individual commentators. Shapiro, Crowder, DeFranco, TYT, Breaking Points all have 5-15 years of daily content.

---

## Depends on #5 (Migration Applied)

### 10. Seed ownership data for major organizations
**Lift:** 30 minutes
**Why:** Ownership fields exist in the schema. Just need to populate: CNN → Warner Bros. Discovery, Fox News → Fox Corporation, MSNBC → Comcast/NBCUniversal, NYT → Sulzberger family trust, WaPo → Jeff Bezos, Daily Wire → private (Shapiro/Boreing), etc.

### 11. Seed ownership data for individual pundits' platforms
**Lift:** 20 minutes
**Why:** Which pundits are independent vs employed? Shapiro → Daily Wire (co-founder), Crowder → independent (Mug Club), Peterson → Daily Wire, Pool → independent, Maddow → MSNBC/Comcast. This is the "structural constraint on coverage" data.

---

## Depends on #3 (Ingestion Running)

### 12. Assess data volume and coverage gaps
**Lift:** 15 minutes (SQL queries)
**Why:** After ingestion runs for a while, check: how many articles per source? Which years have gaps? Which pundits have zero content? This tells us where to focus next.
```sql
SELECT source_name, count(*) as articles, 
       min(published_at) as earliest, 
       max(published_at) as latest
FROM content_items 
GROUP BY source_name 
ORDER BY articles DESC;
```

### 13. Create the first story manually
**Lift:** 30 minutes
**Why:** We have the stories/coverages/claims tables but zero data in them. Manually create the April 2016 Aleppo story with the 4 articles we already analyzed (Fox, CNN, NYT, Breitbart). This validates the cross-source comparison pipeline end-to-end.

---

## Depends on #13 (First Story Created)

### 14. Run blindspot detection on the first story
**Lift:** 5 minutes
**Why:** We built `detectBlindspots()` and `getCoverageTimeline()`. Test them against real data. Which of our 196 sources covered the Aleppo story? Which didn't?

### 15. Run claim extraction manually on the first story's articles
**Lift:** 15 minutes (write a script that calls the rule-based classifier)
**Why:** We built the epistemological classification engine but haven't tested it on real content. Feed the 4 Aleppo articles through `classifyClaimsBatch()` and see what comes out.

---

## Depends on LLM Provider Wiring (not yet done)

### 16. Wire up a basic LLM provider
**Lift:** 30 minutes
**Why:** All 12 prompt templates are built. The provider interface is defined. We just need one implementation that calls an LLM API. This unblocks everything in the LLM layer — tone scoring, structural fallacy detection, neutral reframing, axis mapping, claim extraction, omission detection, epistemological refinement, and blog post generation.

### 17. Run the full analysis pipeline with LLM on one article
**Lift:** 10 minutes (after #16)
**Why:** End-to-end test: article → rule engine → LLM enhancement → database persistence. Validates that the entire pipeline works together.

---

## Depends on #16 + #13 (LLM + Story Data)

### 18. Generate the first blog post draft
**Lift:** 5 minutes (after #16 and #13)
**Why:** The blog generator and templates are built. Feed the Aleppo story comparison data into `generateStoryComparisonPost()` and get a draft. Review it in the admin dashboard. Publish it.

### 19. Generate the first omission report
**Lift:** 10 minutes (after #16 and #13)
**Why:** Extract claims from all 4 Aleppo articles, run omission detection, store results. This is the core value proposition working end-to-end.

---

## Standalone (No Blockers, Just Time)

### 20. Check WGU library for ProQuest API access
**Lift:** 15 minutes of clicking around the student portal
**Why:** ProQuest full-text access would be the single biggest content unlock — 40 years of NYT, WaPo, WSJ full text. The scraper is already built and waiting for credentials.

### 21. Check WGU library for EBSCO API access
**Lift:** 15 minutes
**Why:** Same as above, supplementary coverage.

### 22. Add a markdown renderer to blog post pages
**Lift:** 30 minutes (install remark/rehype, replace the basic string-splitting renderer)
**Why:** Blog posts are stored as markdown but rendered with a naive line-by-line splitter. A proper renderer handles tables, code blocks, links, bold/italic, etc.

### 23. Add admin auth (basic)
**Lift:** 30 minutes
**Why:** The admin dashboard (`/admin`) has no authentication. Anyone who knows the URL can publish posts. Add a basic password check via environment variable — not production-grade but prevents accidental public access during development.
