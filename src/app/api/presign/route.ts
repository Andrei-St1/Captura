import { NextRequest, NextResponse } from "next/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { r2, R2_BUCKET, R2_PUBLIC_URL } from "@/lib/r2";
import { createServiceClient } from "@/lib/supabase/service";

const ALLOWED_MIME = new Set([
  "image/jpeg", "image/png", "image/webp", "image/gif",
  "image/heic", "image/heif",
  "video/mp4", "video/quicktime", "video/webm",
]);

const MAX_IMAGE = 50  * 1024 * 1024;   // 50 MB
const MAX_VIDEO = 500 * 1024 * 1024;   // 500 MB

export async function POST(request: NextRequest) {
  try {
    const { albumId, fileName, mimeType, fileSize } =
      await request.json() as {
        albumId: string;
        fileName: string;
        mimeType: string;
        fileSize: number;
      };

    if (!albumId || !fileName || !mimeType || !fileSize) {
      return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
    }

    // Validate mime type
    if (!ALLOWED_MIME.has(mimeType)) {
      return NextResponse.json({ error: "Unsupported file type." }, { status: 400 });
    }

    // Validate file size
    const isVideo = mimeType.startsWith("video/");
    const maxSize = isVideo ? MAX_VIDEO : MAX_IMAGE;
    if (fileSize > maxSize) {
      return NextResponse.json({
        error: `File too large. Max ${isVideo ? "500 MB" : "50 MB"}.`,
      }, { status: 400 });
    }

    const supabase = createServiceClient();

    // Validate album: active, open, has space
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
    if (usedBytes + fileSize > allocatedBytes) {
      return NextResponse.json({ error: "Album storage is full." }, { status: 413 });
    }

    // Build a unique path
    const timestamp = Date.now();
    const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
    const filePath = `albums/${albumId}/${timestamp}-${safeName}`;

    // Generate presigned PUT URL — valid for 15 minutes
    const command = new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: filePath,
      ContentType: mimeType,
      ContentLength: fileSize,
    });

    const presignedUrl = await getSignedUrl(r2, command, { expiresIn: 900 });
    const fileUrl = `${R2_PUBLIC_URL}/${filePath}`;

    return NextResponse.json({ presignedUrl, filePath, fileUrl });
  } catch (err) {
    console.error("[presign] error:", err);
    return NextResponse.json({ error: "Failed to generate upload URL." }, { status: 500 });
  }
}
