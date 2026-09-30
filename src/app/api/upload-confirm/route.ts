import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { createClient } from "@/lib/supabase/server";
import {
  type ConfirmItem,
  buildMediaRow,
  checkAlbumAcceptsUploads,
  fileTypeOf,
  hasRequiredFields,
  scheduleBytesIncrement,
  scheduleImageWork,
  validatePathAndMime,
} from "@/lib/confirmUpload";

export async function POST(request: NextRequest) {
  try {
    const { albumId, ...item } = await request.json() as ConfirmItem & { albumId: string };
    const { filePath, fileUrl, mimeType, fileSize, thumbnailUrl } = item;

    if (!hasRequiredFields(albumId, item)) {
      return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
    }

    const invalid = validatePathAndMime(albumId, item);
    if (invalid) return NextResponse.json({ error: invalid }, { status: 400 });

    const supabase = createServiceClient();

    // Guests: album must be active and open. The album owner is exempt (as in presign-owner-batch).
    const { data: { user } } = await (await createClient()).auth.getUser();
    const gate = await checkAlbumAcceptsUploads(supabase, albumId, user?.id ?? null);
    if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status });

    const fileType = fileTypeOf(mimeType);

    const { data: inserted, error: dbError } = await supabase
      .from("media")
      .insert(buildMediaRow(albumId, item))
      .select("id")
      .single();

    if (dbError) {
      return NextResponse.json({ error: dbError.message }, { status: 500 });
    }

    // Background work for images: thumbnail (presigned uploads have none) + face detection
    if (fileType === "image" && inserted?.id) {
      scheduleImageWork(supabase, "upload-confirm", inserted.id, albumId, { filePath, fileUrl, thumbnailUrl });
    }

    // Atomic increment — avoids read-then-write race under concurrent uploads
    scheduleBytesIncrement(supabase, "upload-confirm", albumId, fileSize);

    return NextResponse.json({ success: true, fileUrl, fileType });
  } catch (err) {
    console.error("[upload-confirm] error:", err);
    return NextResponse.json({ error: "Failed to confirm upload." }, { status: 500 });
  }
}
