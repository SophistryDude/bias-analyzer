/**
 * YouTube Transcript Ingestion
 *
 * Fetches video metadata and transcripts from YouTube.
 * Uses youtube-transcript for captions and YouTube Data API for metadata.
 */

import type { ContentItem, ContentMetadata } from "../models/types";

// ─── Types ──────────────────────────────────────────────────────────

export interface YouTubeVideoInfo {
  videoId: string;
  title: string;
  channelName: string;
  channelId: string;
  publishedAt: string;
  description: string;
  duration: number;
  viewCount: number;
  likeCount: number;
  thumbnailUrl: string;
  tags: string[];
}

export interface TranscriptSegment {
  text: string;
  start: number; // seconds
  duration: number; // seconds
}

// ─── Video ID Extraction ────────────────────────────────────────────

export function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
    /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }

  // Maybe it's already just a video ID
  if (/^[a-zA-Z0-9_-]{11}$/.test(url)) return url;

  return null;
}

// ─── Transcript Fetching ────────────────────────────────────────────

/**
 * Fetches transcript for a YouTube video.
 * Requires: npm install youtube-transcript
 */
export async function fetchTranscript(
  videoId: string
): Promise<TranscriptSegment[]> {
  // Dynamic import — this dependency is optional
  try {
    // Import the ESM build directly — the package's "main" points to a CJS
    // file that breaks under Node 24's strict ESM mode ("type": "module" in
    // package.json + .js extension = Node treats CJS file as ESM and crashes).
    const { YoutubeTranscript } = await import("youtube-transcript/dist/youtube-transcript.esm.js");
    const segments = await YoutubeTranscript.fetchTranscript(videoId);
    return segments.map((seg: { text: string; offset: number; duration: number }) => ({
      text: seg.text,
      start: seg.offset / 1000,
      duration: seg.duration / 1000,
    }));
  } catch (error) {
    console.error(`Failed to fetch transcript for ${videoId}:`, error);
    throw new Error(
      `Could not fetch transcript for video ${videoId}. The video may not have captions available.`
    );
  }
}

/**
 * Combines transcript segments into full text
 */
export function transcriptToText(segments: TranscriptSegment[]): string {
  return segments.map((s) => s.text).join(" ");
}

// ─── Video Metadata ─────────────────────────────────────────────────

/**
 * Fetches video metadata from YouTube Data API v3
 * Requires YOUTUBE_API_KEY environment variable
 */
export async function fetchVideoInfo(
  videoId: string
): Promise<YouTubeVideoInfo> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    throw new Error(
      "YOUTUBE_API_KEY environment variable is required for video metadata."
    );
  }

  const url = `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&key=${apiKey}&part=snippet,contentDetails,statistics`;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`YouTube API error: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();
  if (!data.items || data.items.length === 0) {
    throw new Error(`Video not found: ${videoId}`);
  }

  const video = data.items[0];
  const snippet = video.snippet;
  const stats = video.statistics;
  const details = video.contentDetails;

  return {
    videoId,
    title: snippet.title,
    channelName: snippet.channelTitle,
    channelId: snippet.channelId,
    publishedAt: snippet.publishedAt,
    description: snippet.description,
    duration: parseDuration(details.duration),
    viewCount: parseInt(stats.viewCount || "0", 10),
    likeCount: parseInt(stats.likeCount || "0", 10),
    thumbnailUrl: snippet.thumbnails?.high?.url || snippet.thumbnails?.default?.url,
    tags: snippet.tags || [],
  };
}

/**
 * Parse ISO 8601 duration (PT1H2M3S) to seconds
 */
function parseDuration(iso: string): number {
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  const hours = parseInt(match[1] || "0", 10);
  const minutes = parseInt(match[2] || "0", 10);
  const seconds = parseInt(match[3] || "0", 10);
  return hours * 3600 + minutes * 60 + seconds;
}

// ─── Full Ingestion ─────────────────────────────────────────────────

/**
 * Ingests a YouTube video: fetches metadata + transcript, returns ContentItem
 */
export async function ingestYouTubeVideo(
  url: string,
  sourceId: string,
  sourceName: string
): Promise<ContentItem> {
  const videoId = extractVideoId(url);
  if (!videoId) throw new Error(`Invalid YouTube URL: ${url}`);

  // Fetch transcript (metadata fetch is optional if no API key)
  const segments = await fetchTranscript(videoId);
  const fullText = transcriptToText(segments);

  let metadata: ContentMetadata = {
    youtubeVideoId: videoId,
  };

  // Try to fetch full metadata if API key is available
  try {
    const info = await fetchVideoInfo(videoId);
    metadata = {
      youtubeVideoId: videoId,
      duration: info.duration,
      viewCount: info.viewCount,
      likeCount: info.likeCount,
      thumbnailUrl: info.thumbnailUrl,
      tags: info.tags,
    };

    return {
      id: `yt-${videoId}`,
      title: info.title,
      url,
      contentType: "youtube-video",
      sourceId,
      sourceName,
      publishedAt: info.publishedAt,
      ingestedAt: new Date().toISOString(),
      rawText: fullText,
      wordCount: fullText.split(/\s+/).length,
      metadata,
    };
  } catch {
    // No API key — return with transcript only
    return {
      id: `yt-${videoId}`,
      title: `YouTube Video ${videoId}`,
      url,
      contentType: "youtube-video",
      sourceId,
      sourceName,
      publishedAt: new Date().toISOString(),
      ingestedAt: new Date().toISOString(),
      rawText: fullText,
      wordCount: fullText.split(/\s+/).length,
      metadata,
    };
  }
}
