import { NextRequest, NextResponse } from "next/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { r2, R2_BUCKET, R2_PUBLIC_URL } from "@/lib/r2";
import { createServiceClient } from "@/lib/supabase/service";
import { detectAndSaveFaces } from "@/lib/faceDetect";
import { maybeConvertHeic } from "@/lib/convertHeic";

// Give Vercel enough time for large video uploads
export const maxDuration = 300;

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    const file = formData.get("file") as File | null;
    const albumId = formData.get("albumId") as string | null;
    const uploaderName = formData.get("uploaderName") as string | null;

    if (!file || !albumId) {
      return NextResponse.json({ error: "Missing file or albumId." }, { status: 400 });
    }

    const supabase = createServiceClient();

    // Verify album is active + open + has space
    const { data: album } = await supabase
      .from("albums")
      .select("id, status, open_date, close_date, allocated_gb, used_bytes")
      .eq("id", albumId)
      .single();

    if (!album || album.status !== "active") {
      return NextResponse.json({ error: "Album not found or inactive." }, { status: 404 });
    }

    const now = new Date();
    if (album.open_date && new Date(album.open_date) > now) {
      return NextResponse.json({ error: "Album is not open yet." }, { status: 403 });
    }
    if (album.close_date && new Date(album.close_date) < now) {
      return NextResponse.json({ error: "Album is closed." }, { status: 403 });
    }

    const allocatedBytes = album.allocated_gb * 1024 * 1024 * 1024;
    const usedBytes = album.used_bytes ?? 0;
    if (usedBytes + file.size > allocatedBytes) {
      return NextResponse.json({ error: "Album storage is full." }, { status: 413 });
    }

    // Build R2 path
    const timestamp = Date.now();
    let mimeType = file.type || "application/octet-stream";
    let fileName = file.name;
    const fileType = mimeType.startsWith("video/") ? "video" : "image";

    let body: Buffer | File;
    let contentLength: number;

    if (fileType === "video") {
      // Stream video directly to R2 — never load into memory
      body = file;
      contentLength = file.size;
    } else {
      // Images need full buffer (HEIC conversion may change size/type)
      const arrayBuffer = await file.arrayBuffer();
      let buffer = Buffer.from(new Uint8Array(arrayBuffer));
      ({ buffer, mimeType, fileName } = await maybeConvertHeic(buffer, mimeType, fileName));
      body = buffer;
      contentLength = buffer.length;
    }

    const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
    const filePath = `albums/${albumId}/${timestamp}-${safeName}`;

    // Upload to R2
    await r2.send(
      new PutObjectCommand({
        Bucket: R2_BUCKET,
        Key: filePath,
        Body: body,
        ContentType: mimeType,
        ContentLength: contentLength,
      })
    );

    const fileUrl = `${R2_PUBLIC_URL}/${filePath}`;

    // Insert media record + get ID back
    const { data: inserted, error: dbError } = await supabase.from("media").insert({
      album_id: albumId,
      uploader_name: uploaderName || null,
      file_url: fileUrl,
      file_path: filePath,
      file_type: fileType,
      file_size: contentLength,
      mime_type: mimeType,
    }).select("id").single();

    if (dbError) {
      return NextResponse.json({ error: dbError.message }, { status: 500 });
    }

    if (fileType === "image" && inserted?.id) {
      await detectAndSaveFaces(inserted.id, albumId, fileUrl);
    }

    // Update album used_bytes
    await supabase
      .from("albums")
      .update({ used_bytes: usedBytes + contentLength })
      .eq("id", albumId);

    return NextResponse.json({ success: true, fileUrl, fileType });
  } catch (err) {
    console.error("Upload error:", err);
    return NextResponse.json({ error: "Upload failed. Please try again." }, { status: 500 });
  }
}
