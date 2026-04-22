import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const albumId = request.nextUrl.searchParams.get("albumId");
  if (!albumId) return NextResponse.json({ error: "Missing albumId" }, { status: 400 });

  // Verify ownership
  const { data: album } = await supabase
    .from("albums")
    .select("id")
    .eq("id", albumId)
    .eq("owner_id", user.id)
    .single();

  if (!album) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const service = createServiceClient();
  const { data: faces } = await service
    .from("album_faces")
    .select("id, media_id, descriptor, box_x, box_y, box_w, box_h")
    .eq("album_id", albumId);

  const result = (faces ?? []).map((f) => ({
    id: f.id,
    mediaId: f.media_id,
    descriptor: f.descriptor as number[],
    box: { x: f.box_x, y: f.box_y, w: f.box_w, h: f.box_h },
  }));

  return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { faces } = await request.json() as {
    faces: { id: string; mediaId: string; albumId: string; descriptor: number[]; box: { x: number; y: number; w: number; h: number } }[];
  };

  if (!faces?.length) return NextResponse.json({ success: true });

  // Verify ownership of the album
  const albumId = faces[0].albumId;
  const { data: album } = await supabase
    .from("albums")
    .select("id")
    .eq("id", albumId)
    .eq("owner_id", user.id)
    .single();

  if (!album) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const service = createServiceClient();
  const rows = faces.map((f) => ({
    id: f.id,
    media_id: f.mediaId,
    album_id: f.albumId,
    descriptor: f.descriptor,
    box_x: f.box.x,
    box_y: f.box.y,
    box_w: f.box.w,
    box_h: f.box.h,
  }));

  await service.from("album_faces").upsert(rows, { onConflict: "id" });

  return NextResponse.json({ success: true });
}
