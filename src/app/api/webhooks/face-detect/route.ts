import { NextRequest, NextResponse } from "next/server";
import { detectAndSaveFaces } from "@/lib/faceDetect";

export async function POST(request: NextRequest) {
  // Verify secret so only Supabase can call this
  const secret = request.headers.get("x-webhook-secret");
  if (secret !== process.env.WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = await request.json() as {
    type: string;
    record: {
      id: string;
      album_id: string;
      file_url: string;
      file_type: string;
    };
  };

  // Only process INSERT events on image files
  if (payload.type !== "INSERT") return NextResponse.json({ ok: true });
  const { id, album_id, file_url, file_type } = payload.record;
  if (file_type !== "image") return NextResponse.json({ ok: true });

  await detectAndSaveFaces(id, album_id, file_url);

  return NextResponse.json({ ok: true });
}
