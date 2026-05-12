import { NextRequest, NextResponse } from "next/server";
import { CreateMultipartUploadCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { r2, R2_BUCKET, R2_PUBLIC_URL } from "@/lib/r2";
import { createServiceClient } from "@/lib/supabase/service";

const ALLOWED_MIME = new Set([
  "image/jpeg", "image/png", "image/webp", "image/gif",
  "image/heic", "image/heif",
  "video/mp4", "video/quicktime", "video/webm",
]);

const MAX_IMAGE = 50 * 1024 * 1024;
const MAX_VIDEO = 500 * 1024 * 1024;

export async function POST(request: NextRequest) {
  try {
    const { albumId, fileName, mimeType, fileSize } = await request.json() as {
      albumId: string;
      fileName: string;
      mimeType: string;
      fileSize: number;
    };

    if (!albumId || !fileName || !mimeType || !fileSize) {
      return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
    }
    if (!ALLOWED_MIME.has(mimeType)) {
      return NextResponse.json({ error: "Unsupported file type." }, { status: 400 });
    }

    const isVideo = mimeType.startsWith("video/");
    if (fileSize > (isVideo ? MAX_VIDEO : MAX_IMAGE)) {
      return NextResponse.json({ error: `File too large.` }, { status: 400 });
    }

    const supabase = createServiceClient();
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
    if ((album.used_bytes ?? 0) + fileSize > allocatedBytes) {
      return NextResponse.json({ error: "Album storage is full." }, { status: 413 });
    }

    const timestamp = Date.now();
    const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
    const filePath = `albums/${albumId}/${timestamp}-${safeName}`;

    const { UploadId } = await r2.send(new CreateMultipartUploadCommand({
      Bucket: R2_BUCKET,
      Key: filePath,
      ContentType: mimeType,
    }));

    if (!UploadId) {
      return NextResponse.json({ error: "Failed to initiate multipart upload." }, { status: 500 });
    }

    // Pre-generate thumbnail slot for videos
    let thumbnailPresignedUrl: string | undefined;
    let thumbnailFileUrl: string | undefined;
    if (isVideo) {
      const thumbPath = `albums/${albumId}/thumbs/${timestamp}-thumb.jpg`;
      thumbnailPresignedUrl = await getSignedUrl(r2, new PutObjectCommand({
        Bucket: R2_BUCKET,
        Key: thumbPath,
        ContentType: "image/jpeg",
      }), { expiresIn: 3600 });
      thumbnailFileUrl = `${R2_PUBLIC_URL}/${thumbPath}`;
    }

    return NextResponse.json({
      uploadId: UploadId,
      filePath,
      fileUrl: `${R2_PUBLIC_URL}/${filePath}`,
      thumbnailPresignedUrl,
      thumbnailFileUrl,
    });
  } catch (err) {
    console.error("[multipart-init] error:", err);
    return NextResponse.json({ error: "Failed to initiate upload." }, { status: 500 });
  }
}
