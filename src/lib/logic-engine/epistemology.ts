/**
 * Epistemological Classification Engine
 *
 * Classifies claims by truth-status type, derived from the Logic System's
 * epistemological taxonomy. This is the rule-based first pass — handles
 * clear cases via keyword/pattern matching. Ambiguous cases are deferred
 * to the LLM refinement layer.
 *
 * Taxonomy (from Logic System):
 *   Known Truth         → Verifiable observation (directly checkable against records)
 *   Effective Truth     → Model-dependent interpretation (true within a framework)
 *   Tacit Understanding → Institutional/expert consensus (inherited, not proven)
 *   Causal Claim        → Asserts causation (may or may not be fundamental)
 *   Value Judgment      → Normative claim presented as descriptive (category error)
 *   Statistical Claim   → Quantitative assertion (methodology-dependent)
 *
 * The core bias detection insight: bias is presenting tacit understanding
 * as known truth. This classifier makes that detectable.
 */

// ─── Types ──────────────────────────────────────────────────────────

export type EpistemologicalStatus =
  | "verifiable-observation"    // Known truth: directly checkable
  | "model-dependent"          // Effective truth: true within a model/framework
  | "tacit-consensus"          // Inherited understanding presented as authority
  | "causal-claim"             // Asserts causation
  | "value-judgment"           // Normative claim, often disguised as descriptive
  | "statistical-claim"        // Quantitative, methodology-dependent
  | "unclassified";            // Ambiguous — needs LLM refinement

export interface EpistemologicalClassification {
  status: EpistemologicalStatus;
  confidence: number; // 0-1
  matchedPattern: string | null; // which rule matched, null if LLM-classified
  reasoning: string;
  /** If true, the claim presents one status as another (e.g., value judgment as fact) */
  categoryError: boolean;
  /** What the claim pretends to be vs what it is */
  disguisedAs?: EpistemologicalStatus;
}

// ─── Pattern Definitions ────────────────────────────────────────────

interface ClassificationRule {
  id: string;
  status: EpistemologicalStatus;
  /** Patterns that indicate this status */
  patterns: RegExp[];
  /** Patterns that indicate this is being disguised as something else */
  disguisePatterns?: { pattern: RegExp; disguisedAs: EpistemologicalStatus }[];
  confidence: number;
}

const RULES: ClassificationRule[] = [
  // ─── Verifiable Observation ─────────────────────────────────────
  {
    id: "cited-source",
    status: "verifiable-observation",
    patterns: [
      /according to (?:the |a |an )?(?:report|document|filing|record|statement|data|figure|memo|transcript|affidavit|complaint|indictment|database|survey|poll|study)/i,
      /(?:released|published|issued|submitted|filed) (?:a |the |an )?(?:report|statement|data|finding|memo|brief|letter|complaint|ruling|opinion|transcript)/i,
      /(?:court|government|official|federal|state|agency|internal) (?:record|document|filing|ruling|order|memo|transcript|database)/i,
      /(?:on|at|in) (?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i,
      /(?:said|told|stated|announced|confirmed|testified|wrote|told reporters|told the \w+) (?:in|at|to|during|on|before)/i,
      /(?:as (?:first )?reported|first reported) by (?:the )?[A-Z]/,
      /(?:footage|video|audio|photos?|images?|documents?) (?:show|shows|obtained|released|leaked)/i,
      // Attribution by title/role
      /\b(?:spokesperson|representative|attorney|lawyer|counsel|advisor|aide|staffer|secretary|director|commissioner|administrator|chief|chair|president|minister|governor|mayor|senator|congressman|congresswoman)\s+(?:said|told|stated|confirmed|announced|denied|declined)/i,
      // Publication context
      /(?:in (?:a|an|the) (?:interview|statement|press conference|briefing|hearing|deposition|report|letter|email|tweet|post|speech|address|memo|ruling))/i,
      // Institutional measurement source
      /(?:according to|per) (?:the |a |an )?(?:census|Bureau|Department|Ministry|Office|Commission|Authority|Agency|Council|Board|Institute|Center|Foundation|Association)/i,
    ],
    confidence: 0.75,
  },
  {
    id: "direct-quote",
    status: "verifiable-observation",
    patterns: [
      /["“”'‘’][^"“”'‘’]{10,}["“”'‘’](?:,?\s+(?:he|she|they|the|a|an|\w+)\s+(?:said|stated|wrote|added|told|noted|replied|responded|claimed|argued|insisted|asked|warned|explained))/i,
      /(?:said|stated|wrote|told|added|noted|replied|responded|claimed|argued|insisted|asked|warned|explained)[,:]?\s+["“”'‘’][^"“”'‘’]{10,}["“”'‘’]/i,
      // Bare full-string quotes (at least 20 chars) — catches content that
      // opens or closes with a quotation without nearby attribution verbs.
      /^[^"]*"[^"]{20,}"[^"]*$/,
    ],
    confidence: 0.85,
  },
  {
    id: "event-report",
    status: "verifiable-observation",
    patterns: [
      /(?:was|were|is|are|has|have|had)(?:\s+been)?\s+(?:killed|arrested|charged|convicted|fired|hired|elected|appointed|signed|passed|vetoed|injured|wounded|rescued|evacuated|detained|deported|sentenced|acquitted|indicted|released|captured|bombed|struck|hit|attacked|destroyed|damaged|displaced|killing)/i,
      /(?:voted|passed|rejected|approved|signed into law) (?:\d+[-–]|\w+ to \w+)/i,
      /(?:hit|struck|bombed|attacked|raided|shelled|targeted|destroyed|damaged) (?:by |with |the )/i,
      /(?:called for|demanded|urged|requested|proposed|promised|pledged|vowed|announced|unveiled|launched|deployed|withdrew|resigned|stepped down)/i,
      /(?:visited|met with|attended|spoke (?:at|to|before)|delivered (?:a )?(?:speech|address|remarks))/i,
      /(?:filed|sued|indicted|charged|sentenced|acquitted) (?:for|on|with|in|against)/i,
      /\b(?:denied|denying|denies|rejects?|rejected|rejecting|disputed|disputing|refuted|refuting|contested|contesting)\b/i,
      /\b(?:\d{1,4})[-–]year[- ]old\b/i,
      /\b(?:yesterday|today|tomorrow|this morning|last night|this week|last week)\b/i,
      // Legislative/legal actions
      /(?:signed|enacted|repealed|overturned|struck down|upheld|blocked|stayed|enjoined|remanded|reversed|affirmed|vacated) (?:the |a |an |into )/i,
      // Election/political events
      /(?:won|lost|conceded|declared victory|certified|inaugurated|sworn in|took office|left office|entered the race|dropped out|suspended (?:his|her|their) campaign)/i,
      // Military/conflict movements
      /(?:troops|forces|soldiers|militants|fighters|rebels|insurgents) (?:entered|advanced|retreated|withdrew|surrendered|crossed|seized|captured|liberated|occupied|besieged|encircled|ambushed)/i,
    ],
    confidence: 0.80,
  },

  // ─── Reported Allegation ─────────────────────────────────────────
  // Claims that report someone else's claim without verifying it.
  // The ALLEGATION itself is verifiable (someone did make the claim),
  // but the content of the allegation is not verified by the report.
  // Lower confidence than direct observation because the truth-status
  // is layered: the report is verifiable, the content is not.
  {
    id: "reported-allegation",
    status: "verifiable-observation",
    patterns: [
      /(?:alleged|alleges|alleging|allegations? (?:that|of|against))/i,
      /(?:accused|accuses|accusing|accusations? (?:that|of|against))/i,
      /(?:claimed|claims|claiming) (?:that|to have|responsibility|credit)/i,
      /(?:denied|denies|denying) (?:that|the|any|all|having|involvement|responsibility)/i,
      /(?:testified|testifies|testifying|testimony) (?:that|before|in|about|regarding)/i,
      /(?:charged|charges|charging) (?:that|with|him|her|them|the)/i,
      /(?:contends?|contending|contention) (?:that|the)/i,
    ],
    confidence: 0.70,
  },

  // ─── Statistical Claim ──────────────────────────────────────────
  {
    id: "statistic-with-source",
    status: "statistical-claim",
    patterns: [
      /\d+(?:\.\d+)?\s*%/,
      /\d+(?:\.\d+)?\s+(?:of |percent|per cent)/i,
      /(?:according to|data from|survey by|poll by|study by|research from|figures? from|numbers from) .{1,50}\d/i,
      /(?:increased|decreased|rose|fell|dropped|grew|declined|surged|plunged|climbed|jumped|slipped) (?:by )?\d+/i,
      /(?:tripled|doubled|halved|quadrupled|\d+[-–]?fold)/i,
      /\$[\d,]+(?:\.\d+)?\s*(?:billion|million|trillion|thousand|k|b|m)?\b/i,
      /(?:an average of|a median of|approximately|roughly|about|nearly|more than|at least|up to|as (?:many|few|little|much) as|just|only|fewer than|less than|over|under)\s+(?:\$|€|£)?\d+/i,
      /(?:one|two|three|four|five|six|seven|eight|nine|ten|\d+) (?:in|out of) (?:\d+|every)/i,
      /(?:a|one) (?:third|quarter|fifth|half|majority|minority|plurality|fraction)/i,
      /(?:between|from)\s+\$?\d+\s+(?:and|to)\s+\$?\d+/i,
      /\b\d{4}\b (?:saw|recorded|brought|marked)/i, // "2016 saw...", "2024 recorded..."
      /\b(?:most|many|few|several|countless|dozens|hundreds|thousands|millions|billions) of\b/i,
      /\b\d+\s+(?:people|deaths?|killed|wounded|injured|children|women|men|cases|incidents|times)/i,
      // Comparative statistics
      /(?:higher|lower|more|less|fewer|greater|worse|better|larger|smaller|faster|slower) than (?:in |the |last |previous |any )/i,
      // Rankings
      /(?:ranked|ranks|ranking) (?:\d+|first|second|third|last|highest|lowest|top|bottom)/i,
      // Rate/index patterns
      /(?:rate|ratio|index|score|grade|level|percentage|proportion|share) (?:of|is|was|at|reached|hit|stood at|fell to|rose to|climbed to)/i,
    ],
    confidence: 0.80,
  },

  // ─── Tacit Consensus ────────────────────────────────────────────
  {
    id: "expert-consensus",
    status: "tacit-consensus",
    patterns: [
      /(?:experts?|scientists?|researchers?|analysts?|economists?|scholars?|historians?|academics?|observers?|commentators?|officials?|sources?|insiders?|strategists?|pundits?) (?:say|believe|argue|warn|agree|note|suggest|maintain|contend|claim|insist|predict|expect|fear|worry|observe|conclude|report|told)/i,
      /(?:widely|generally|broadly|commonly|universally|largely) (?:accepted|believed|recognized|acknowledged|understood|considered|regarded|viewed|seen|held|thought)/i,
      /(?:it is|it's) (?:well[- ])?(?:known|established|understood|accepted|recognized|documented|reported) that/i,
      /(?:the |a )?(?:scientific|medical|academic|intelligence|policy|legal|diplomatic|business|investor|military|national security) (?:community|consensus|establishment|view|perspective|opinion)/i,
      /(?:most|many|some|a majority of|a growing number of) (?:experts?|observers?|analysts?|commentators?|critics?|historians?|scholars?|officials?|americans|voters|researchers)/i,
      /(?:the |a )?(?:growing|emerging|prevailing|dominant|mainstream|elite|expert|conventional) (?:consensus|wisdom|view|opinion|narrative|framing|belief)/i,
      /(?:mainstream|establishment|legacy|corporate|prestige) (?:media|press|outlets?|journalists?)/i,
      /(?:rights groups?|human rights (?:groups?|advocates?|organizations?)|humanitarian (?:groups?|organizations?|agencies)|international observers?|monitoring groups?) (?:say|report|documented|warn|confirmed|allege)/i,
      /(?:the )?(?:UN|United Nations|WHO|World Health Organization|IMF|World Bank|NATO|EU|European Union|ICRC|Red Cross|Doctors Without Borders|MSF|Amnesty|Human Rights Watch) (?:warns?|warned|says?|said|reports?|reported|condemned|called|stated|announced|released)/i,
      /(?:sources say|sources told|officials told|people familiar with|those close to|unnamed|anonymous) (?:the matter|the situation|the discussions|the decision)/i,
      // Appeal to normalcy / tradition
      /(?:traditionally|historically|conventionally|typically|normally|usually|ordinarily|as (?:is|was) (?:customary|tradition|common|typical|standard|normal|usual))/i,
      // Implied authority via group attribution
      /(?:critics|supporters|opponents|advocates|proponents|defenders|allies|backers|detractors) (?:say|argue|contend|maintain|insist|warn|claim|charge|allege|counter|point out|note)/i,
      // Framing as settled / longstanding
      /(?:has long been|have long been|has always been|it has been|it remains|it continues to be|it is still|is no longer|is now considered|has become|has emerged as)/i,
    ],
    confidence: 0.75,
    disguisePatterns: [
      {
        pattern: /(?:it is|it's) (?:a )?(?:fact|true|clear|obvious|evident|undeniable|proven|established|documented) that/i,
        disguisedAs: "verifiable-observation",
      },
      {
        pattern: /(?:everyone (?:knows|agrees|understands)|no (?:serious|credible|reasonable) person (?:disputes|denies|questions))/i,
        disguisedAs: "verifiable-observation",
      },
    ],
  },

  // ─── Causal Claim ───────────────────────────────────────────────
  {
    id: "causal-language",
    status: "causal-claim",
    patterns: [
      /(?:caused|led to|resulted in|produced|triggered|sparked|fueled|drove|created|generated|enabled|prompted|brought about|gave rise to|paved the way for|set (?:off|the stage for)|touched off|unleashed|spurred|incited|provoked)/i,
      /(?:because of|due to|as a result of|owing to|thanks to|in response to|on account of|stemming from|rooted in|driven by|motivated by|fueled by|sparked by|prompted by|triggered by|in reaction to)/i,
      /(?:the reason|the cause|the effect|the result|the consequence|the impact|the driver|the trigger|the source|the root|the origin) (?:of|is|was|for|behind)/i,
      /(?:if .{5,40}(?:,| then| will| would| may)|when .{5,40} (?:will|would|may|can|could)|this (?:means|implies|shows|proves|demonstrates|ensures|guarantees) that)/i,
      /\b(?:so|therefore|thus|hence|consequently|accordingly|as such|which is why)\b/i,
      /(?:blamed|blame) (?:on|for|the)/i,
      /(?:followed|preceded) by/i,
      /(?:forced|compelled|pushed|pressured|drove) .{1,30} (?:to|into)/i,
      /(?:will (?:be|cause|lead|create|result)|would (?:be|cause|lead|create|result)|could (?:be|cause|lead|create|result)) .{1,40} (?:if|unless|when|because)/i,
      // Consequence framing
      /(?:at the cost of|at the expense of|at the risk of|with the result that|with the consequence that|with the effect that)/i,
      // Predictive causation
      /(?:will (?:inevitably|undoubtedly|certainly|surely|likely|probably|possibly) (?:lead|result|cause|bring|create|produce|generate|trigger|spark|fuel))/i,
      // Conditional causation
      /(?:without .{3,30}(?:,| there| would| will| could)|unless .{3,30}(?:,| there| would| will| could))/i,
    ],
    confidence: 0.65,
    disguisePatterns: [
      {
        pattern: /(?:clearly|obviously|undeniably|inevitably|certainly|definitely|unquestionably|without (?:a )?doubt) (?:caused|led to|resulted in|meant|produced)/i,
        disguisedAs: "verifiable-observation",
      },
      {
        pattern: /(?:proved|proves|proven) that .{1,40} (?:caused|causes|leads to|means)/i,
        disguisedAs: "verifiable-observation",
      },
    ],
  },

  // ─── Value Judgment ─────────────────────────────────────────────
  {
    id: "normative-language",
    status: "value-judgment",
    patterns: [
      /(?:should|must|need to|ought to|have to|has to)\s+(?:be |have |do |take |make |stop |start |end |address|act|respond|condemn|denounce|support|defend)/i,
      /(?:it is|it's|that is|that's|this is)\s+(?:wrong|right|good|bad|immoral|moral|unacceptable|outrageous|shameful|disgraceful|appalling|deplorable|heroic|brave|courageous|cowardly|reckless|irresponsible|dangerous|extremist|radical|unprecedented|historic|devastating|horrific|catastrophic|tragic|heartbreaking|inspiring|stunning|shocking|disturbing)/i,
      /(?:we need|we must|we should|we cannot|we can't|we have to|we're obligated to|we will no longer|we can no longer|we will not|we refuse to|we won't)\s+(?:to |afford |allow |accept |tolerate |ignore |let |stop |start |act|respond|fight|defend|surrender|stand|sit|watch)/i,
      /(?:the right thing|the wrong thing|the responsible thing|the smart thing|the moral thing|the only option|the best option|the only way) (?:to do|is|was|forward)/i,
      /\b(?:devastating|horrific|catastrophic|tragic|heartbreaking|shameful|outrageous|reckless|irresponsible|heroic|brave|courageous|cowardly|appalling|deplorable|inspiring|unprecedented|historic|stunning|shocking|disturbing|alarming|troubling|staggering|brutal|savage|vicious|monstrous)\b/i,
      /(?:where is the outrage|how long (?:will|can|must)|when will|how can anyone|how dare)/i,
      /(?:let us not forget|never forget|make no mistake|let's be clear|mark my words|you heard it here)/i,
      /(?:a disgrace|a travesty|a scandal|a moral (?:failure|outrage|imperative)|a question of (?:right and wrong|basic decency|human dignity))/i,
      /(?:we owe it to|we have a (?:duty|responsibility|moral obligation))/i,
      // Responsibility / blame framing
      /(?:blood on (?:his|her|their|its) hands|complicit|culpable|accountable|to blame|at fault|responsible for|guilty of|on the wrong side of history)/i,
      // Superlative evaluations
      /(?:the (?:worst|best|greatest|most dangerous|most important|most significant|most critical|most pressing|gravest|biggest|largest|smallest|weakest|strongest) .{1,30} (?:in|of|since|ever|facing))/i,
      // Rhetorical questions as judgments
      /(?:how (?:can|could|dare|long) .{5,40}\?|what kind of .{5,30}\?|where is .{3,20}\?|when will .{5,30}\?)/i,
    ],
    confidence: 0.80,
    disguisePatterns: [
      {
        pattern: /(?:everyone knows|no reasonable person|any thinking person|common sense (?:tells|says|dictates|demands))/i,
        disguisedAs: "tacit-consensus",
      },
      {
        pattern: /(?:the fact is|the truth is|the reality is|make no mistake|let's be clear)[,:]?\s+.{0,15}(?:should|must|wrong|right|unacceptable|outrageous)/i,
        disguisedAs: "verifiable-observation",
      },
      {
        pattern: /(?:it is simply|it's simply|plainly|quite simply) (?:unacceptable|wrong|shameful|outrageous|heroic|the case that)/i,
        disguisedAs: "verifiable-observation",
      },
    ],
  },

  // ─── Explicit Hedging (high-confidence model-dependent) ────────
  // Dedicated high-confidence rule for phrases that explicitly signal
  // the speaker is NOT asserting verified fact. These beat loaded
  // adjectives (value-judgment) and bare event reports, because the
  // hedge is the dominant signal — "it appears to have been a deliberate
  // strike" is not a claim that the strike WAS deliberate, it's a claim
  // that SOMEONE THINKS it was deliberate.
  {
    id: "explicit-hedging",
    status: "model-dependent",
    patterns: [
      /\b(?:appears to|appeared to|seems to|seemed to|looks like|looked like|may have|might have|could have|is likely|seemed likely|allegedly|reportedly|purportedly)\b/i,
      /\b(?:consistent with|in keeping with|in line with|reminiscent of|suggestive of|indicative of)\b/i,
      /\b(?:on the brink|on the verge|teetering|hangs by a thread|hanging by a thread|fraying|unraveling)\b/i,
    ],
    confidence: 0.90,
  },

  // ─── Model-Dependent Interpretation ─────────────────────────────
  {
    id: "interpretive-framing",
    status: "model-dependent",
    patterns: [
      /(?:this (?:suggests|indicates|implies|signals|reflects|reveals|demonstrates|shows|highlights|underscores|points to|hints at|speaks to|illustrates|exemplifies))/i,
      /(?:can be (?:seen|viewed|interpreted|understood|read|framed|described) as)/i,
      /(?:in (?:the |a )?(?:context|framework|lens|view|perspective|light|shadow) of)/i,
      /(?:what this (?:means|tells us|shows|reveals|says|amounts to) is)/i,
      /(?:the (?:broader|larger|deeper|real|underlying|true|bigger|hidden) (?:meaning|significance|implication|message|point|issue|story|truth|question))/i,
      /(?:appears to|seems to|looks like|resembles|feels like|smells like|sounds like|comes across as)/i,
      /(?:a (?:sign|symptom|reminder|echo|shadow|reflection|hallmark|harbinger) of|part of a (?:larger|broader|growing|disturbing|troubling) (?:pattern|trend))/i,
      /(?:on the brink|on the verge|teetering|hangs by a thread|fraying|unraveling|crumbling|collapsing) (?:of|on|into)?/i,
      /(?:the question is (?:whether|how|when|why|what|who)|the real question|the bigger question|the deeper question)/i,
      /(?:frames|framed|framing) (?:the|this|an?) (?:issue|debate|discussion|question|story|narrative)/i,
      /(?:narrative|storyline|framing|worldview|ideology|agenda)/i,
      // Strategic/political analysis
      /(?:is (?:seen|viewed|regarded|perceived|interpreted|understood|read|considered) (?:as|to be) (?:a |an )?(?:signal|sign|shift|pivot|move|gambit|play|strategy|attempt|effort|bid|overture|concession|retreat|escalation|de-escalation|provocation|warning))/i,
      // Trend identification
      /(?:a (?:growing|rising|emerging|deepening|widening|narrowing|shifting|evolving|changing|accelerating|decelerating) (?:trend|movement|divide|gap|rift|crisis|tension|consensus|sentiment|mood|backlash|opposition|support))/i,
      // Era/moment framing
      /(?:marks (?:a |the )?(?:turning point|watershed|new era|new chapter|beginning of|end of|shift in|departure from|break with|continuation of|return to))/i,
    ],
    confidence: 0.70,
    disguisePatterns: [
      {
        pattern: /(?:this (?:proves|confirms|establishes|demonstrates beyond|shows definitively|makes (?:clear|plain|obvious)))/i,
        disguisedAs: "verifiable-observation",
      },
      {
        pattern: /(?:undeniable|indisputable|irrefutable) (?:sign|proof|evidence|pattern|reflection) of/i,
        disguisedAs: "verifiable-observation",
      },
    ],
  },
];

// ─── Classification Engine ──────────────────────────────────────────

/**
 * Classify a claim's epistemological status using rule-based patterns.
 * Returns "unclassified" with low confidence if no rules match —
 * these are deferred to the LLM refinement layer.
 */
export function classifyClaimEpistemology(
  claimText: string
): EpistemologicalClassification {
  let bestMatch: {
    rule: ClassificationRule;
    confidence: number;
    patternId: string;
    categoryError: boolean;
    disguisedAs?: EpistemologicalStatus;
  } | null = null;

  for (const rule of RULES) {
    // Check main patterns
    for (const pattern of rule.patterns) {
      if (pattern.test(claimText)) {
        const confidence = rule.confidence;
        if (!bestMatch || confidence > bestMatch.confidence) {
          bestMatch = {
            rule,
            confidence,
            patternId: rule.id,
            categoryError: false,
          };
        }
      }
    }

    // Check disguise patterns (category errors)
    if (rule.disguisePatterns) {
      for (const dp of rule.disguisePatterns) {
        if (dp.pattern.test(claimText)) {
          // Category error detected — this claim is presenting itself as
          // a different epistemological type than it actually is
          const confidence = rule.confidence + 0.1; // boost for catching disguise
          if (!bestMatch || confidence > bestMatch.confidence) {
            bestMatch = {
              rule,
              confidence: Math.min(confidence, 1),
              patternId: `${rule.id}:disguised`,
              categoryError: true,
              disguisedAs: dp.disguisedAs,
            };
          }
        }
      }
    }
  }

  if (!bestMatch) {
    return {
      status: "unclassified",
      confidence: 0,
      matchedPattern: null,
      reasoning: "No rule-based pattern matched. Requires LLM classification.",
      categoryError: false,
    };
  }

  const reasoning = bestMatch.categoryError
    ? `Detected ${bestMatch.rule.status} disguised as ${bestMatch.disguisedAs} (pattern: ${bestMatch.patternId}). This is a category error — presenting one type of knowledge as another.`
    : `Classified as ${bestMatch.rule.status} (pattern: ${bestMatch.patternId})`;

  return {
    status: bestMatch.rule.status,
    confidence: bestMatch.confidence,
    matchedPattern: bestMatch.patternId,
    reasoning,
    categoryError: bestMatch.categoryError,
    disguisedAs: bestMatch.disguisedAs,
  };
}

/**
 * Batch classify multiple claims.
 * Returns classifications with stats on how many need LLM refinement.
 */
export function classifyClaimsBatch(
  claims: { statement: string; sourceWording: string }[]
): {
  classifications: (EpistemologicalClassification & { claimIndex: number })[];
  stats: {
    total: number;
    classified: number;
    unclassified: number;
    categoryErrors: number;
    byStatus: Record<EpistemologicalStatus, number>;
  };
} {
  const classifications: (EpistemologicalClassification & {
    claimIndex: number;
  })[] = [];

  const stats = {
    total: claims.length,
    classified: 0,
    unclassified: 0,
    categoryErrors: 0,
    byStatus: {
      "verifiable-observation": 0,
      "model-dependent": 0,
      "tacit-consensus": 0,
      "causal-claim": 0,
      "value-judgment": 0,
      "statistical-claim": 0,
      unclassified: 0,
    } as Record<EpistemologicalStatus, number>,
  };

  for (let i = 0; i < claims.length; i++) {
    // Classify against source wording first (more likely to contain telltale patterns),
    // fall back to canonical statement
    let result = classifyClaimEpistemology(claims[i].sourceWording);
    if (result.status === "unclassified") {
      result = classifyClaimEpistemology(claims[i].statement);
    }

    classifications.push({ ...result, claimIndex: i });

    if (result.status === "unclassified") {
      stats.unclassified++;
    } else {
      stats.classified++;
    }
    if (result.categoryError) {
      stats.categoryErrors++;
    }
    stats.byStatus[result.status]++;
  }

  return { classifications, stats };
}
