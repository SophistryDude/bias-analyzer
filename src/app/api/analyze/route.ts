import { NextRequest, NextResponse } from "next/server";
import { extractVideoId, fetchTranscript, transcriptToText } from "../../../lib/scrapers/youtube";
import { scrapeArticle } from "../../../lib/scrapers/article";
import { runAnalysis } from "../../../lib/pipeline/analyzer";
import { saveAnalysis } from "../../../lib/db/repositories/analyses";
import type { ContentItem, ContentType } from "../../../lib/models/types";

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
    let contentType: ContentType = "article";
    let title = "Direct text input";
    let url = "";

    // If URL, fetch the content first
    if (type === "url") {
      url = content;
      const videoId = extractVideoId(content);
      if (videoId) {
        contentType = "youtube-video";
        try {
          const segments = await fetchTranscript(videoId);
          textToAnalyze = transcriptToText(segments);
          title = `YouTube video ${videoId}`;
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
        try {
          const article = await scrapeArticle(content);
          textToAnalyze = article.content;
          title = article.title || "Untitled article";
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

    // Build a ContentItem for the pipeline
    const contentItem: ContentItem = {
      id: `content-${Date.now()}`,
      title,
      url,
      contentType,
      sourceId: "",
      sourceName: "API Direct Input",
      publishedAt: new Date().toISOString(),
      ingestedAt: new Date().toISOString(),
      rawText: textToAnalyze,
      wordCount: textToAnalyze.split(/\s+/).length,
      metadata: {},
    };

    // Run the full analysis pipeline
    const analysis = runAnalysis(contentItem);

    // Persist results (non-blocking — don't fail the request if DB is down)
    try {
      await saveAnalysis(contentItem, analysis);
    } catch (dbErr) {
      console.error("Failed to persist analysis (continuing):", dbErr);
    }

    // Map to API response shape
    return NextResponse.json({
      manipulationScore: analysis.manipulationScore,
      biasLeaning: analysis.biasAssessment.overallLeaning,
      biasConfidence: analysis.biasAssessment.confidence,
      balanceScore: analysis.biasAssessment.balanceScore,
      fallacies: analysis.fallacyDetections.map((f) => ({
        fallacyName: f.fallacyName,
        confidence: f.confidence,
        excerpt: f.excerpt,
        explanation: f.explanation,
      })),
      reframing: analysis.reframingDetections.map((r) => ({
        techniqueName: r.techniqueName,
        confidence: r.confidence,
        excerpt: r.excerpt,
        explanation: r.explanation,
      })),
      overallAssessment: analysis.overallAssessment,
      wordCount: contentItem.wordCount,
    });
  } catch (err) {
    console.error("Analysis error:", err);
    return NextResponse.json(
      { error: "Internal analysis error" },
      { status: 500 }
    );
  }
}
