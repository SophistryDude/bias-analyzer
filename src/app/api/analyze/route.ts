import { NextRequest, NextResponse } from "next/server";
import { analyzeText } from "../../../lib/logic-engine/engine";
import { detectReframing } from "../../../lib/logic-engine/reframing";
import { FALLACY_RULES } from "../../../lib/logic-engine/fallacies";
import { extractVideoId, fetchTranscript, transcriptToText } from "../../../lib/scrapers/youtube";
import { scrapeArticle } from "../../../lib/scrapers/article";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type, content } = body;

    if (!content || typeof content !== "string") {
      return NextResponse.json(
        { error: "Content is required" },
        { status: 400 }
      );
    }

    let textToAnalyze = content;

    // If URL, fetch the content first
    if (type === "url") {
      const videoId = extractVideoId(content);
      if (videoId) {
        // YouTube video
        try {
          const segments = await fetchTranscript(videoId);
          textToAnalyze = transcriptToText(segments);
        } catch {
          return NextResponse.json(
            {
              error:
                "Could not fetch YouTube transcript. The video may not have captions.",
            },
            { status: 422 }
          );
        }
      } else {
        // Article URL
        try {
          const article = await scrapeArticle(content);
          textToAnalyze = article.content;
        } catch {
          return NextResponse.json(
            { error: "Could not fetch article content from the provided URL." },
            { status: 422 }
          );
        }
      }
    }

    if (!textToAnalyze.trim()) {
      return NextResponse.json(
        { error: "No text content found to analyze" },
        { status: 422 }
      );
    }

    // Run logic engine
    const logicResult = analyzeText(textToAnalyze);

    // Run reframing detection
    const reframingResults = detectReframing(textToAnalyze);

    // Run bias assessment (inline — same logic as pipeline/analyzer.ts)
    const LEFT_TERMS = [
      "progressive", "equity", "systemic", "marginalized", "inclusive",
      "social justice", "privilege", "intersectional", "climate crisis",
      "reproductive rights", "wealth gap", "corporate greed",
    ];
    const RIGHT_TERMS = [
      "traditional values", "personal responsibility", "free market",
      "limited government", "second amendment", "border security",
      "law and order", "sanctity of life", "deregulation",
      "religious freedom", "family values", "woke", "cancel culture",
    ];

    const lower = textToAnalyze.toLowerCase();
    let leftScore = 0;
    let rightScore = 0;

    for (const term of LEFT_TERMS) {
      const matches = lower.match(new RegExp(`\\b${term}\\b`, "g"));
      if (matches) leftScore += matches.length;
    }
    for (const term of RIGHT_TERMS) {
      const matches = lower.match(new RegExp(`\\b${term}\\b`, "g"));
      if (matches) rightScore += matches.length;
    }

    const total = leftScore + rightScore;
    const balanceScore = total === 0 ? 1 : 1 - Math.abs(leftScore - rightScore) / total;

    let biasLeaning = "center";
    if (total > 0) {
      const ratio = (rightScore - leftScore) / total;
      if (ratio > 0.6) biasLeaning = "far-right";
      else if (ratio > 0.3) biasLeaning = "right";
      else if (ratio > 0.1) biasLeaning = "center-right";
      else if (ratio < -0.6) biasLeaning = "far-left";
      else if (ratio < -0.3) biasLeaning = "left";
      else if (ratio < -0.1) biasLeaning = "center-left";
    }

    const biasConfidence = Math.min(total / 20, 1);

    // Compile response
    const fallacies = logicResult.detections.map((d) => {
      const rule = FALLACY_RULES.find((r) => r.id === d.fallacyId);
      return {
        fallacyName: rule?.name || d.fallacyId,
        confidence: d.confidence,
        excerpt: d.excerpt,
        explanation: d.explanation,
      };
    });

    const reframing = reframingResults.map((r) => ({
      techniqueName: r.technique,
      confidence: r.confidence,
      excerpt: r.excerpt,
      explanation: r.explanation,
    }));

    // Calculate manipulation score
    const fallacyWeight = logicResult.overallManipulationScore * 40;
    const reframingWeight = reframingResults.length > 0
      ? Math.min(reframingResults.reduce((sum, r) => sum + r.confidence, 0) / 2, 1) * 30
      : 0;
    const biasWeight = (1 - balanceScore) * 30;
    const manipulationScore = Math.round(fallacyWeight + reframingWeight + biasWeight);

    // Generate assessment
    let assessment = "";
    if (manipulationScore >= 70) assessment = "This content shows significant signs of manipulation.";
    else if (manipulationScore >= 40) assessment = "This content shows moderate signs of bias or manipulation.";
    else if (manipulationScore >= 15) assessment = "This content shows mild signs of bias.";
    else assessment = "This content appears relatively neutral and well-reasoned.";

    if (fallacies.length > 0) {
      assessment += ` Detected ${fallacies.length} logical fallacy/fallacies.`;
    }
    if (reframing.length > 0) {
      assessment += ` Found ${reframing.length} reframing technique(s).`;
    }

    return NextResponse.json({
      manipulationScore,
      biasLeaning,
      biasConfidence,
      balanceScore,
      fallacies,
      reframing,
      overallAssessment: assessment,
      wordCount: textToAnalyze.split(/\s+/).length,
    });
  } catch (err) {
    console.error("Analysis error:", err);
    return NextResponse.json(
      { error: "Internal analysis error" },
      { status: 500 }
    );
  }
}
