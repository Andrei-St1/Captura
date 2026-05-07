import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { detectAndSaveFaces } from "@/lib/faceDetect";

export async function POST(request: NextRequest) {
  try {
    const { albumId, filePath, fileUrl, mimeType, fileSize, uploaderName } =
      await request.json() as {
        albumId: string;
        filePath: string;
        fileUrl: string;
        mimeType: string;
        fileSize: number;
        uploaderName?: string;
      };

    if (!albumId || !filePath || !fileUrl || !mimeType || !fileSize) {
      return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
    }

    const supabase = createServiceClient();
    const fileType = mimeType.startsWith("video/") ? "video" : "image";

    // Insert media record
    const { data: inserted, error: dbError } = await supabase
      .from("media")
      .insert({
        album_id: albumId,
        uploader_name: uploaderName || null,
        file_url: fileUrl,
        file_path: filePath,
        file_type: fileType,
        file_size: fileSize,
        mime_type: mimeType,
      })
      .select("id")
      .single();

    if (dbError) {
      return NextResponse.json({ error: dbError.message }, { status: 500 });
    }

    // Kick off face detection for images (non-blocking)
    if (fileType === "image" && inserted?.id) {
      detectAndSaveFaces(inserted.id, albumId, fileUrl).catch(() => {});
    }

    // Update album used_bytes
    const { data: album } = await supabase
      .from("albums")
      .select("used_bytes")
      .eq("id", albumId)
      .single();

    const newUsed = Math.max(0, (album?.used_bytes ?? 0) + fileSize);
    await supabase.from("albums").update({ used_bytes: newUsed }).eq("id", albumId);

    return NextResponse.json({ success: true, fileUrl, fileType });
  } catch (err) {
    console.error("[upload-confirm] error:", err);
    return NextResponse.json({ error: "Failed to confirm upload." }, { status: 500 });
  }
}
