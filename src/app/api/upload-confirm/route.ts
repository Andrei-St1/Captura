import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { detectAndSaveFaces } from "@/lib/faceDetect";

export async function POST(request: NextRequest) {
  try {
    const { albumId, filePath, fileUrl, mimeType, fileSize, uploaderName, thumbnailUrl, takenAt } =
      await request.json() as {
        albumId: string;
        filePath: string;
        fileUrl: string;
        mimeType: string;
        fileSize: number;
        uploaderName?: string;
        thumbnailUrl?: string;
        takenAt?: string;
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
        ...(thumbnailUrl ? { thumbnail_url: thumbnailUrl } : {}),
        ...(takenAt ? { taken_at: takenAt } : {}),
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

    // Atomic increment — avoids read-then-write race under concurrent uploads
    await supabase.rpc("increment_album_bytes", { p_album_id: albumId, p_delta: fileSize });

    return NextResponse.json({ success: true, fileUrl, fileType });
  } catch (err) {
    console.error("[upload-confirm] error:", err);
    return NextResponse.json({ error: "Failed to confirm upload." }, { status: 500 });
  }
}
