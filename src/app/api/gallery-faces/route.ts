import { NextRequest, NextResponse } from "next/server";
import { checkGalleryAccess } from "../_lib/galleryAccess";
import { getFaceClustersForAlbum } from "@/lib/getFaceClusters";

export async function GET(request: NextRequest) {
  const access = await checkGalleryAccess(request.nextUrl.searchParams.get("token"));
  if (!access.ok) return access.res;
  if (!access.album.face_finder_enabled) return NextResponse.json([]);

  try {
    const clusters = await getFaceClustersForAlbum(access.album.id);
    return NextResponse.json(clusters, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return NextResponse.json({ error: "Failed to load clusters" }, { status: 500 });
  }
}
