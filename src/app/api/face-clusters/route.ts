import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getFaceClustersForAlbum } from "@/lib/getFaceClusters";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const albumId = request.nextUrl.searchParams.get("albumId");
  if (!albumId) return NextResponse.json({ error: "Missing albumId" }, { status: 400 });

  const { data: album } = await supabase
    .from("albums")
    .select("id")
    .eq("id", albumId)
    .eq("owner_id", user.id)
    .single();

  if (!album) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    const clusters = await getFaceClustersForAlbum(albumId);
    return NextResponse.json(clusters);
  } catch {
    return NextResponse.json({ error: "Failed to load clusters" }, { status: 500 });
  }
}
