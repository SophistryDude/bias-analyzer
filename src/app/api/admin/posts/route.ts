import { NextResponse } from "next/server";
import { getAllPosts } from "../../../../lib/db/repositories/posts";

export async function GET() {
  try {
    const posts = await getAllPosts();
    return NextResponse.json({ posts });
  } catch {
    return NextResponse.json({ posts: [] });
  }
}
