import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

export async function POST(req: Request) {
  const { albumId, mediaIds } = await req.json();

  if (!albumId || !Array.isArray(mediaIds) || mediaIds.length === 0) {
    return NextResponse.json([]);
  }

  const supabase = createServiceClient();
  const { data } = await supabase
    .from("media")
    .select("id, file_url, file_type, file_size, uploader_name, created_at")
    .eq("album_id", albumId)
    .in("id", [...new Set(mediaIds)])
    .order("created_at", { ascending: false });

  return NextResponse.json(data ?? []);
}
