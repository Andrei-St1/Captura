import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getFaceClustersForAlbum } from "@/lib/getFaceClusters";

export async function GET(request: NextRequest) {
  const albumId = request.nextUrl.searchParams.get("albumId");
  if (!albumId) return NextResponse.json({ error: "Missing albumId" }, { status: 400 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    const { data: album } = await supabase
      .from("albums")
      .select("id")
      .eq("id", albumId)
      .eq("owner_id", user.id)
      .single();
    if (!album) return NextResponse.json({ error: "Not found" }, { status: 404 });
  } else {
    const token = request.nextUrl.searchParams.get("token");
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { data: qr } = await supabase
      .from("qr_codes")
      .select("albums(id, face_finder_enabled)")
      .eq("token", token)
      .eq("enabled", true)
      .single();
    const qrAlbum = qr?.albums as any;
    if (!qrAlbum || qrAlbum.id !== albumId) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (!qrAlbum.face_finder_enabled) return NextResponse.json({ error: "Not enabled" }, { status: 403 });
  }

  try {
    const clusters = await getFaceClustersForAlbum(albumId);
    return NextResponse.json(clusters);
  } catch {
    return NextResponse.json({ error: "Failed to load clusters" }, { status: 500 });
  }
}
