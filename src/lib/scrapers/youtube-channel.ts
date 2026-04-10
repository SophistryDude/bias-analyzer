/**
 * YouTube Channel Monitor
 *
 * Fetches recent videos from a YouTube channel using the Data API v3.
 * Returns video IDs that haven't been ingested yet.
 */

export interface ChannelVideo {
  videoId: string;
  title: string;
  publishedAt: string;
  thumbnailUrl: string;
}

/**
 * Extract channel ID from various YouTube channel URL formats.
 */
export function extractChannelId(url: string): string | null {
  const patterns = [
    /youtube\.com\/channel\/([a-zA-Z0-9_-]+)/,
    /youtube\.com\/@([a-zA-Z0-9_.-]+)/,
    /youtube\.com\/c\/([a-zA-Z0-9_.-]+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }

  // Might already be a channel ID
  if (/^UC[a-zA-Z0-9_-]{22}$/.test(url)) return url;

  return null;
}

/**
 * Fetch recent videos from a YouTube channel.
 * Requires YOUTUBE_API_KEY environment variable.
 *
 * For @handle URLs, resolves the handle to a channel ID first.
 */
export async function fetchChannelVideos(
  channelUrl: string,
  maxResults: number = 10
): Promise<ChannelVideo[]> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    throw new Error("YOUTUBE_API_KEY environment variable is required");
  }

  const identifier = extractChannelId(channelUrl);
  if (!identifier) {
    throw new Error(`Could not extract channel identifier from: ${channelUrl}`);
  }

  // Resolve @handle to channel ID if needed
  let channelId = identifier;
  if (!identifier.startsWith("UC")) {
    channelId = await resolveHandle(identifier, apiKey);
  }

  // Search for recent uploads from this channel
  const searchUrl = `https://www.googleapis.com/youtube/v3/search?channelId=${channelId}&key=${apiKey}&part=snippet&order=date&type=video&maxResults=${maxResults}`;

  const res = await fetch(searchUrl);
  if (!res.ok) {
    throw new Error(`YouTube API error: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();
  if (!data.items) return [];

  return data.items.map(
    (item: {
      id: { videoId: string };
      snippet: {
        title: string;
        publishedAt: string;
        thumbnails: { high?: { url: string }; default?: { url: string } };
      };
    }): ChannelVideo => ({
      videoId: item.id.videoId,
      title: item.snippet.title,
      publishedAt: item.snippet.publishedAt,
      thumbnailUrl:
        item.snippet.thumbnails?.high?.url ||
        item.snippet.thumbnails?.default?.url ||
        "",
    })
  );
}

/**
 * Resolve a YouTube @handle or custom URL to a channel ID.
 */
async function resolveHandle(
  handle: string,
  apiKey: string
): Promise<string> {
  // Try forHandle parameter first (works for @handles)
  const cleanHandle = handle.startsWith("@") ? handle : `@${handle}`;
  const url = `https://www.googleapis.com/youtube/v3/channels?forHandle=${encodeURIComponent(cleanHandle)}&key=${apiKey}&part=id`;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`YouTube API error resolving handle: ${res.status}`);
  }

  const data = await res.json();
  if (data.items && data.items.length > 0) {
    return data.items[0].id;
  }

  // Fallback: try as custom URL name
  const searchUrl = `https://www.googleapis.com/youtube/v3/search?q=${encodeURIComponent(handle)}&key=${apiKey}&part=snippet&type=channel&maxResults=1`;
  const searchRes = await fetch(searchUrl);
  const searchData = await searchRes.json();

  if (searchData.items && searchData.items.length > 0) {
    return searchData.items[0].snippet.channelId;
  }

  throw new Error(`Could not resolve YouTube handle: ${handle}`);
}
