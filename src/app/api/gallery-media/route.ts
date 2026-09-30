import { NextRequest, NextResponse } from "next/server";
import { checkGalleryAccess, fetchGalleryPage } from "../_lib/galleryAccess";

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const access = await checkGalleryAccess(sp.get("token"));
  if (!access.ok) return access.res;

  const sort = sp.get("sort") === "taken" ? "taken" : "upload";
  const result = await fetchGalleryPage(access.album.id, sort, sp.get("cursor"));
  if (result.badCursor) return NextResponse.json({ error: "Bad cursor" }, { status: 400 });

  return NextResponse.json(
    { items: result.items, nextCursor: result.nextCursor },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
