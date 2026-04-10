/**
 * Formal Logical Fallacy Definitions
 *
 * Independent rule-based system — not reliant on LLM reasoning.
 * Each fallacy has a formal definition, detection patterns, and examples.
 * These rules are used by the logic engine to score arguments.
 */

export type FallacyCategory =
  | "relevance" // Argument's premises are not relevant to conclusion
  | "presumption" // Argument presumes something not established
  | "ambiguity" // Argument exploits ambiguous language
  | "induction" // Weak inductive reasoning
  | "causal" // Flawed cause-effect reasoning
  | "emotional"; // Appeals to emotion over logic

export interface FallacyRule {
  id: string;
  name: string;
  latinName?: string;
  category: FallacyCategory;
  description: string;
  formalStructure: string; // Logical form of the fallacy
  detectionPatterns: DetectionPattern[];
  examples: FallacyExample[];
  severity: "low" | "medium" | "high"; // How misleading this typically is
  commonIn: string[]; // Media contexts where this is frequently seen
}

export interface DetectionPattern {
  id: string;
  type: "keyword" | "structural" | "semantic" | "contextual";
  pattern: string; // Regex or description
  weight: number; // 0-1, how strongly this indicates the fallacy
  description: string;
}

export interface FallacyExample {
  text: string;
  explanation: string;
  source?: string;
}

export interface FallacyDetection {
  fallacyId: string;
  confidence: number; // 0-1
  matchedPatterns: string[]; // Pattern IDs that triggered
  excerpt: string; // The text segment containing the fallacy
  explanation: string; // Why this was flagged
  startIndex: number;
  endIndex: number;
}

// ─── Core Fallacy Database ──────────────────────────────────────────

export const FALLACY_RULES: FallacyRule[] = [
  // ── Relevance Fallacies ──
  {
    id: "ad-hominem",
    name: "Ad Hominem",
    latinName: "Argumentum ad Hominem",
    category: "relevance",
    description:
      "Attacking the person making the argument rather than the argument itself.",
    formalStructure: "Person A makes claim X. Person A has quality Y. Therefore X is false.",
    detectionPatterns: [
      {
        id: "ah-character-attack",
        type: "structural",
        pattern: "attacks character instead of addressing claim",
        weight: 0.8,
        description: "Speaker shifts from the argument to the person's character",
      },
      {
        id: "ah-keyword",
        type: "keyword",
        pattern:
          "\\b(of course they would say that|consider the source|what do you expect from|you're just a|coming from someone who)\\b",
        weight: 0.6,
        description: "Common phrases used in ad hominem attacks",
      },
      {
        id: "ah-credential-dismiss",
        type: "structural",
        pattern: "dismisses argument based on speaker's credentials or background",
        weight: 0.7,
        description: "Argument dismissed due to who is making it, not its content",
      },
    ],
    examples: [
      {
        text: "You can't trust his economic policy — he's never run a business.",
        explanation:
          "The argument's validity doesn't depend on whether the person has business experience.",
      },
      {
        text: "Of course a liberal would say that about gun control.",
        explanation:
          "Dismisses the argument based on political affiliation rather than engaging with the logic.",
      },
    ],
    severity: "medium",
    commonIn: ["political commentary", "debate coverage", "opinion pieces"],
  },
  {
    id: "straw-man",
    name: "Straw Man",
    category: "relevance",
    description:
      "Misrepresenting someone's argument to make it easier to attack.",
    formalStructure:
      "Person A makes claim X. Person B restates X as distorted claim Y. Person B attacks Y.",
    detectionPatterns: [
      {
        id: "sm-misrepresent",
        type: "structural",
        pattern: "restates opponent's position in exaggerated or distorted form",
        weight: 0.9,
        description: "The original argument is distorted before being addressed",
      },
      {
        id: "sm-keyword",
        type: "keyword",
        pattern:
          "\\b(so you're saying|what they really mean|basically saying|in other words they want|they think that)\\b",
        weight: 0.5,
        description: "Phrases that precede a restatement of someone's position",
      },
      {
        id: "sm-extreme",
        type: "semantic",
        pattern: "adds extreme language not present in original claim",
        weight: 0.7,
        description:
          "Original moderate position restated with absolutist language",
      },
    ],
    examples: [
      {
        text: "They want to regulate some firearms? So basically they want to abolish the Second Amendment.",
        explanation:
          "Proposing regulation is restated as abolishing a constitutional right — a much stronger claim than what was made.",
      },
    ],
    severity: "high",
    commonIn: [
      "political news",
      "cable news panels",
      "social media commentary",
    ],
  },
  {
    id: "false-dichotomy",
    name: "False Dichotomy",
    latinName: "Bifurcation",
    category: "presumption",
    description:
      "Presenting only two options when more exist.",
    formalStructure: "Either A or B. Not A. Therefore B. (When C, D, etc. also exist)",
    detectionPatterns: [
      {
        id: "fd-binary",
        type: "keyword",
        pattern:
          "\\b(either.*or|you're either.*or|there are only two|you have to choose|it's one or the other|which side are you on)\\b",
        weight: 0.7,
        description: "Binary framing language",
      },
      {
        id: "fd-structural",
        type: "structural",
        pattern: "presents complex issue as having only two possible positions",
        weight: 0.8,
        description: "Reduces a spectrum of positions to a binary",
      },
    ],
    examples: [
      {
        text: "You're either with us or against us.",
        explanation:
          "Ignores the possibility of partial agreement, neutrality, or nuanced positions.",
      },
      {
        text: "Either we ban all immigration or our country is destroyed.",
        explanation:
          "Presents a complex policy issue as having only two extreme outcomes.",
      },
    ],
    severity: "high",
    commonIn: [
      "political rhetoric",
      "editorial pieces",
      "campaign speeches",
    ],
  },
  {
    id: "appeal-to-authority",
    name: "Appeal to Authority",
    latinName: "Argumentum ad Verecundiam",
    category: "relevance",
    description:
      "Using an authority figure's opinion as evidence, especially when they lack relevant expertise.",
    formalStructure:
      "Person A is an authority (in some field). Person A says X. Therefore X is true.",
    detectionPatterns: [
      {
        id: "aa-expert-claim",
        type: "keyword",
        pattern:
          "\\b(experts say|scientists agree|studies show|according to|research proves|doctors recommend)\\b",
        weight: 0.4,
        description:
          "Vague appeals to unnamed authorities (low weight — sometimes legitimate)",
      },
      {
        id: "aa-irrelevant-expert",
        type: "structural",
        pattern: "cites authority whose expertise is not in the relevant field",
        weight: 0.8,
        description: "Expert opinion cited outside their area of expertise",
      },
      {
        id: "aa-celebrity",
        type: "structural",
        pattern: "cites celebrity or public figure as authority on technical topic",
        weight: 0.7,
        description: "Celebrity endorsement used as evidence for factual claim",
      },
    ],
    examples: [
      {
        text: "A famous actor says vaccines are dangerous, so we should be worried.",
        explanation:
          "The actor's fame does not constitute medical expertise.",
      },
    ],
    severity: "medium",
    commonIn: ["health reporting", "advertising", "political endorsements"],
  },
  {
    id: "appeal-to-emotion",
    name: "Appeal to Emotion",
    latinName: "Argumentum ad Passiones",
    category: "emotional",
    description:
      "Using emotional manipulation instead of logical argument to persuade.",
    formalStructure:
      "X evokes strong emotion. Therefore X is true/we should do X.",
    detectionPatterns: [
      {
        id: "ae-fear",
        type: "keyword",
        pattern:
          "\\b(terrifying|devastating|nightmare|catastrophe|crisis|threat to our way of life|endangering our children)\\b",
        weight: 0.5,
        description: "Fear-inducing language used to bypass logical reasoning",
      },
      {
        id: "ae-anecdote-over-data",
        type: "structural",
        pattern: "uses individual emotional story to override statistical evidence",
        weight: 0.7,
        description: "Substitutes data with anecdotal emotional appeal",
      },
      {
        id: "ae-moral-panic",
        type: "semantic",
        pattern: "frames issue as moral emergency requiring immediate action",
        weight: 0.6,
        description:
          "Creates urgency through moral framing rather than evidence",
      },
    ],
    examples: [
      {
        text: "Think of the children! We must ban this immediately.",
        explanation:
          "Uses emotional concern for children to skip over evidence-based analysis.",
      },
    ],
    severity: "medium",
    commonIn: [
      "cable news",
      "political ads",
      "social media",
      "opinion columns",
    ],
  },
  {
    id: "red-herring",
    name: "Red Herring",
    latinName: "Ignoratio Elenchi",
    category: "relevance",
    description:
      "Introducing an irrelevant topic to divert attention from the original issue.",
    formalStructure:
      "Topic A is being discussed. Topic B is introduced. Topic A is abandoned.",
    detectionPatterns: [
      {
        id: "rh-topic-shift",
        type: "structural",
        pattern: "abrupt topic change when pressed on original point",
        weight: 0.8,
        description: "Shifts to unrelated topic when original argument is challenged",
      },
      {
        id: "rh-whatabout",
        type: "keyword",
        pattern: "\\b(what about|but what about|but they also|yes but|the real issue is|let's not forget)\\b",
        weight: 0.6,
        description: "Deflection phrases that redirect the conversation",
      },
    ],
    examples: [
      {
        text: "Why are we talking about the deficit when there are people starving?",
        explanation:
          "While hunger is important, it's unrelated to the fiscal discussion and is used to deflect.",
      },
    ],
    severity: "medium",
    commonIn: ["interviews", "press conferences", "debate", "panel shows"],
  },
  {
    id: "whataboutism",
    name: "Whataboutism",
    latinName: "Tu Quoque",
    category: "relevance",
    description:
      "Deflecting criticism by pointing to someone else's wrongdoing instead of addressing the argument.",
    formalStructure:
      "Person A criticizes X. Person B responds: 'But what about Y?' (Y is unrelated or a different actor)",
    detectionPatterns: [
      {
        id: "wa-deflect",
        type: "keyword",
        pattern:
          "\\b(what about when|but (Obama|Trump|Biden|they) did|where were you when|you didn't complain when|but the other side)\\b",
        weight: 0.8,
        description: "Classic whataboutism deflection to the opposing side",
      },
      {
        id: "wa-structural",
        type: "structural",
        pattern: "responds to criticism of A by citing unrelated wrongdoing of B",
        weight: 0.9,
        description:
          "Instead of defending A, attacks B for something unrelated",
      },
    ],
    examples: [
      {
        text: "Sure the president lied, but what about when the last president lied?",
        explanation:
          "The previous president's dishonesty doesn't make the current one's acceptable.",
      },
    ],
    severity: "high",
    commonIn: [
      "political commentary",
      "cable news",
      "social media debates",
    ],
  },
  {
    id: "slippery-slope",
    name: "Slippery Slope",
    category: "causal",
    description:
      "Arguing that one event will inevitably lead to a chain of negative events without establishing causal links.",
    formalStructure: "If A, then B, then C, then D (catastrophe). Therefore not A.",
    detectionPatterns: [
      {
        id: "ss-chain",
        type: "keyword",
        pattern:
          "\\b(next thing you know|before you know it|where does it end|it's only a matter of time|this will lead to|opens the door to|first.*then.*then)\\b",
        weight: 0.7,
        description: "Chain-of-events language without causal evidence",
      },
      {
        id: "ss-structural",
        type: "structural",
        pattern:
          "predicts escalating consequences without establishing each causal link",
        weight: 0.8,
        description: "Unsubstantiated causal chain to an extreme outcome",
      },
    ],
    examples: [
      {
        text: "If we allow any gun regulation, next they'll take all guns, then free speech, then we're living in a dictatorship.",
        explanation:
          "Each step in the chain is asserted without evidence that it would follow.",
      },
    ],
    severity: "medium",
    commonIn: ["political debate", "editorial columns", "talk radio"],
  },
  {
    id: "loaded-question",
    name: "Loaded Question",
    latinName: "Plurium Interrogationum",
    category: "presumption",
    description:
      "Asking a question that contains a presupposition or assumption that hasn't been established.",
    formalStructure:
      "Question assumes X is true. Answering either yes or no accepts X.",
    detectionPatterns: [
      {
        id: "lq-presupposition",
        type: "structural",
        pattern: "question embeds an unproven assumption",
        weight: 0.8,
        description: "The question smuggles in an unstated premise",
      },
      {
        id: "lq-keyword",
        type: "keyword",
        pattern:
          "\\b(have you stopped|why do you (hate|love|refuse|insist)|when did you start|why won't you admit)\\b",
        weight: 0.7,
        description: "Classic loaded question phrasing",
      },
    ],
    examples: [
      {
        text: "When did you stop beating your wife?",
        explanation:
          "Presupposes that the person was beating their wife — any direct answer accepts this premise.",
      },
      {
        text: "Why does the president hate America?",
        explanation:
          "Assumes as fact that the president hates America.",
      },
    ],
    severity: "high",
    commonIn: ["interviews", "press conferences", "political talk shows"],
  },
  {
    id: "bandwagon",
    name: "Bandwagon / Appeal to Popularity",
    latinName: "Argumentum ad Populum",
    category: "relevance",
    description:
      "Arguing something is true or good because many people believe it or do it.",
    formalStructure: "Many people believe X. Therefore X is true.",
    detectionPatterns: [
      {
        id: "bw-keyword",
        type: "keyword",
        pattern:
          "\\b(everyone knows|most people agree|the majority|polls show|the American people want|nobody believes)\\b",
        weight: 0.6,
        description: "Appeals to popular opinion as evidence",
      },
    ],
    examples: [
      {
        text: "Everyone knows this policy is wrong.",
        explanation:
          "Popular belief doesn't determine whether a policy is logically sound.",
      },
    ],
    severity: "low",
    commonIn: ["political speeches", "opinion pieces", "social media"],
  },
  {
    id: "false-equivalence",
    name: "False Equivalence",
    category: "relevance",
    description:
      "Treating two things as equivalent when they differ in significant ways.",
    formalStructure: "A and B share property X. Therefore A and B are the same.",
    detectionPatterns: [
      {
        id: "fe-both-sides",
        type: "keyword",
        pattern:
          "\\b(both sides|just as bad|no different from|equivalent to|the same as|equally guilty)\\b",
        weight: 0.6,
        description: "Both-sides framing that flattens meaningful distinctions",
      },
      {
        id: "fe-structural",
        type: "structural",
        pattern:
          "equates two actions or positions that differ in scale, intent, or consequence",
        weight: 0.8,
        description: "False equating of meaningfully different things",
      },
    ],
    examples: [
      {
        text: "A jaywalking ticket is just like a felony — they're both crimes.",
        explanation:
          "While technically both are crimes, equating them ignores vast differences in severity.",
      },
    ],
    severity: "high",
    commonIn: [
      "media coverage",
      "political commentary",
      "both-sides journalism",
    ],
  },
  {
    id: "cherry-picking",
    name: "Cherry Picking",
    category: "induction",
    description:
      "Selecting only evidence that supports a position while ignoring contradictory evidence.",
    formalStructure:
      "Evidence set contains A, B, C, D. Only A supports conclusion X. Present only A.",
    detectionPatterns: [
      {
        id: "cp-selective",
        type: "structural",
        pattern: "presents isolated data points while ignoring broader trends",
        weight: 0.8,
        description: "Selective use of evidence to support a predetermined conclusion",
      },
      {
        id: "cp-keyword",
        type: "keyword",
        pattern:
          "\\b(one study shows|this one example|look at this case|just look at)\\b",
        weight: 0.5,
        description: "Phrases introducing isolated evidence",
      },
    ],
    examples: [
      {
        text: "Crime went up 10% last month — proof the policy failed. (Ignoring the 40% decrease over the past year)",
        explanation:
          "Isolates one unfavorable data point while ignoring the broader positive trend.",
      },
    ],
    severity: "high",
    commonIn: [
      "news reporting",
      "political ads",
      "opinion pieces",
      "data journalism",
    ],
  },
  {
    id: "moving-goalposts",
    name: "Moving the Goalposts",
    category: "presumption",
    description:
      "Changing the criteria for proof or success after the original criteria have been met.",
    formalStructure:
      "Claim: X proves Y. X is shown. New claim: actually Z proves Y. (Z was not originally required)",
    detectionPatterns: [
      {
        id: "mg-shift",
        type: "structural",
        pattern: "changes the standard of proof after original standard is met",
        weight: 0.9,
        description: "Requirements change when the original ones are satisfied",
      },
      {
        id: "mg-keyword",
        type: "keyword",
        pattern:
          "\\b(yes but that's not enough|that doesn't count|what I really meant|the real question is|sure but)\\b",
        weight: 0.6,
        description: "Phrases that shift the burden after it's been met",
      },
    ],
    examples: [
      {
        text: "Show me evidence. *evidence shown* Well that's just one study. *more studies shown* Well those are all biased.",
        explanation:
          "Each time evidence is provided, the criteria for acceptable evidence changes.",
      },
    ],
    severity: "high",
    commonIn: ["debate", "interviews", "political discourse"],
  },
  {
    id: "gish-gallop",
    name: "Gish Gallop",
    category: "relevance",
    description:
      "Overwhelming an opponent with a flood of arguments, regardless of their accuracy, making it impossible to address each one.",
    formalStructure:
      "Assert A, B, C, D, E, F, G rapidly. Opponent can only address A and B. Claim C-G are uncontested.",
    detectionPatterns: [
      {
        id: "gg-flood",
        type: "structural",
        pattern:
          "rapid succession of many unrelated or loosely related claims",
        weight: 0.8,
        description:
          "Floods the argument with quantity over quality",
      },
    ],
    examples: [
      {
        text: "The economy is failing, crime is up, the border is open, education is ruined, gas prices are insane, and the military is weak.",
        explanation:
          "Rapid-fire claims that can't all be individually addressed in a normal exchange.",
      },
    ],
    severity: "high",
    commonIn: ["debate", "cable news", "social media threads"],
  },
];

// Helper to get a fallacy by ID
export function getFallacy(id: string): FallacyRule | undefined {
  return FALLACY_RULES.find((f) => f.id === id);
}

// Get all fallacies in a category
export function getFallaciesByCategory(
  category: FallacyCategory
): FallacyRule[] {
  return FALLACY_RULES.filter((f) => f.category === category);
}

// Get all categories
export function getCategories(): FallacyCategory[] {
  return [...new Set(FALLACY_RULES.map((f) => f.category))];
}
