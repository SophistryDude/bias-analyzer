# Moving Away from Claude API / Fine-Tuning a Local Model

**Date:** April 16, 2026
**Status:** Deferred — revisit in 2027-2028
**Context:** Conversation about replacing Claude API with a self-hosted fine-tuned model

---

## Current LLM Architecture

- Provider abstraction at `src/lib/llm/provider.ts` — pluggable, 1-method interface (`complete()`)
- Anthropic provider at `src/lib/llm/providers/anthropic.ts` — fetch-based, no SDK, 86 lines
- 7 prompt templates, each exports `build*Messages()` -> `LLMMessage[]`
- `analyze.ts` orchestrator wires cache + prompts + provider
- `configureLLMFromEnv()` reads `ANTHROPIC_API_KEY`, optional `LLM_MODEL` and `LLM_MAX_TOKENS`
- Graceful fallback — if no provider configured, every function returns `null` and pipeline uses rule-engine-only results
- Content-hash cache with 7-day TTL at `src/lib/llm/cache.ts`
- Default model: `claude-sonnet-4-6`

---

## Why Not Just Swap API Providers?

The prompts are unusually demanding:

- **Axis-mapping**: 143-line system prompt with 9 independent axes, sub-domain scoring, explicit anti-bundling instructions, evidence requirements. Requires holding 9 orthogonal dimensions in working memory simultaneously.
- **Epistemological classification**: Meta-cognitive task — distinguish 6 truth-status types AND detect category errors (a claim disguised as a different type).
- **Omission detection**: Cross-source comparison requiring reasoning about what was included vs excluded.

Prompt difficulty by task:

| Prompt | Difficulty | Can Downgrade Model? |
|--------|-----------|---------------------|
| Tone/sentiment | Low | Yes |
| Structural fallacy | Medium | Probably |
| Neutral reframing | Low | Yes |
| **Axis-mapping** | **High** | **No — product differentiator** |
| Claim extraction | Medium | Maybe |
| Omission detection | High | No |
| **Epistemological classification** | **High** | **No — Logic System core operation** |

---

## Why You Can't Clone Claude

Claude's weights are proprietary. Anthropic does not release them. Same for GPT-4o and Gemini. Frontier closed-source models are API-only.

---

## Open-Weight Model Landscape (as of April 2026)

| Model | Parameters | VRAM Required | Quality vs Sonnet |
|-------|-----------|---------------|-------------------|
| Llama 3.3 70B | 70B | ~40GB (quantized) | 60-70% on hardest tasks |
| Llama 3.1 405B | 405B | ~200GB (quantized) | 75-85% |
| Qwen 2.5 72B | 72B | ~40GB | 60-70% |
| Mistral Large 2 | 123B | ~70GB | 65-75% |
| DeepSeek V3 | 671B MoE | ~130GB active | 70-80% (data sovereignty concern) |

The gap between open-weight 70B and Claude Sonnet on axis-mapping is significant. 70B models will sometimes collapse populism into left/right — the exact dimensional collapse the system is built to detect.

---

## The Fine-Tuning Path

### Why MediaSentinel is well-suited for this

The project accumulates ground-truth labeled examples as a byproduct of normal operation:
- Rule-engine output (fallacies, reframing, bias indicators)
- LLM output (9-axis scores with evidence, epistemological classifications)
- Human review (blog posts, validated analyses)

Over time, this produces thousands of (article -> correct 9-axis scoring) pairs — a fine-tuning dataset.

### Three phases

**Phase 1 — Accumulate training data (happening now as a byproduct of normal operation)**
- Run everything through Claude Sonnet via API
- Cache results
- Human-validate a subset (200-300 high-quality validated examples is meaningful)
- Store validated (input, output) pairs in structured format

**Phase 2 — Fine-tune an open-weight model**
- Take best available open model (Llama 70B or successor)
- Fine-tune on validated (article -> axis-mapping) pairs
- Fine-tune separately on (claims -> epistemological-classification) pairs
- The fine-tuned model learns MediaSentinel's axis definitions, independence requirements, epistemological taxonomy

**Phase 3 — Self-host the fine-tuned model**
- Run on own hardware or GPU hosting service
- No API dependency, no per-token cost, no rate limits

### What fine-tuning buys you

A 70B model fine-tuned on 500+ validated examples will likely **outperform** general-purpose Claude Sonnet on these specific tasks because:
1. It has seen hundreds of examples of "score independently" in practice
2. It has learned the specific axis definitions and edge cases
3. It has been trained on the exact output format needed
4. It has seen examples where populism and left/right diverge, where structural-causation is right-coded, etc.

### What fine-tuning does NOT buy you

- Novel edge cases not in training data
- Epistemological classification is hardest to fine-tune (genuinely meta-cognitive)
- Need to keep a frontier model available for cases the fine-tuned model gets wrong

---

## Hosting Options (When Ready)

| Option | Cost | Notes |
|--------|------|-------|
| Local (RTX 4090) | ~$1600 one-time | 70B quantized fits with offloading, slowly |
| Local (2x RTX 4090) | ~$3200 one-time | 70B runs well |
| RunPod / Vast.ai | ~$0.50-1.50/hr | Spin up for batch analysis, shut down after |
| Lambda Labs dedicated | ~$300-500/mo | Always-on A100/H100 |
| GKE GPU node | ~$500-1000/mo | Blows current budget |
| Together AI / Fireworks | ~$0.50-1.00/MTok | They host your fine-tuned model |

---

## Hybrid Strategy (Medium-Term, Before Fine-Tuning)

Route easy prompts to cheap models, keep hard ones on frontier:
- Cheap model (Haiku/Flash): tone, reframing, fallacy detection
- Frontier model (Sonnet): axis-mapping, epistemological, omission
- Cuts cost ~60-70% while preserving quality where it matters

Also: add prompt caching to Anthropic provider — system prompts are static and large, caching saves ~90% of input token cost on repeated calls.

---

## Cost Estimates (Current)

Per article (all 7 prompts): ~$0.20
1000 articles/month: ~$200/month
With prompt caching: drops to ~$0.08/article, ~$80/month

---

## Key Insight

The rule-engine-first architecture means the LLM is the refinement layer, not the primary layer. If a fine-tuned model is wrong on 10% of cases, the rule engine still caught the rest. The hybrid pattern that's the core design principle is also what makes model migration safe — the blast radius of a weaker LLM is bounded by the rule engine's coverage.

---

## Decision

Deferred to 2027-2028. Continue accumulating validated training data as a natural byproduct of pipeline operation. Revisit when:
- 300-500 validated examples per task exist
- Open-weight models have improved another generation
- The project has enough volume to justify the infrastructure investment
