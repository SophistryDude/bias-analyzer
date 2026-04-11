import { NextRequest, NextResponse } from "next/server";
import { publishPost } from "../../../../../../lib/db/repositories/posts";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    await publishPost(id);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Failed to publish post:", err);
    return NextResponse.json(
      { error: "Failed to publish post" },
      { status: 500 }
    );
  }
}
