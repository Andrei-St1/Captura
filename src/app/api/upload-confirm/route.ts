import { NextRequest, NextResponse, after } from "next/server";
import { makeThumbnailFromUrl } from "@/lib/makeThumbnail";
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

    // Background work for images: thumbnail (presigned uploads have none) + face detection
    if (fileType === "image" && inserted?.id) {
      const mediaId = inserted.id;
      try {
        after(async () => {
          try {
            if (!thumbnailUrl) {
              const safeName = (filePath.split("/").pop() ?? "image").replace(/^\d+-/, "");
              const thumb = await makeThumbnailFromUrl(fileUrl, albumId, Date.now(), safeName);
              if (thumb) {
                await supabase.from("media").update({ thumbnail_url: thumb }).eq("id", mediaId);
              }
            }
          } catch (e) { console.error("[upload-confirm] thumbnail:", e); }
          try { await detectAndSaveFaces(mediaId, albumId, fileUrl); } catch (e) { console.error("[upload-confirm] face detect:", e); }
        });
      } catch (e) {
        console.error("[upload-confirm] after() failed:", e);
      }
    }

    // Atomic increment — avoids read-then-write race under concurrent uploads
    await supabase.rpc("increment_album_bytes", { p_album_id: albumId, p_delta: fileSize });

    return NextResponse.json({ success: true, fileUrl, fileType });
  } catch (err) {
    console.error("[upload-confirm] error:", err);
    return NextResponse.json({ error: "Failed to confirm upload." }, { status: 500 });
  }
}
