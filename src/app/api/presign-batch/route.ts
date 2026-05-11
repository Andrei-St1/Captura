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

const MAX_IMAGE = 50  * 1024 * 1024;
const MAX_VIDEO = 500 * 1024 * 1024;
const MAX_BATCH  = 50;

interface FileEntry {
  fileName: string;
  mimeType: string;
  fileSize: number;
}

export async function POST(request: NextRequest) {
  try {
    const { albumId, files } = await request.json() as { albumId: string; files: FileEntry[] };

    if (!albumId || !Array.isArray(files) || files.length === 0) {
      return NextResponse.json({ error: "Missing albumId or files." }, { status: 400 });
    }
    if (files.length > MAX_BATCH) {
      return NextResponse.json({ error: `Max ${MAX_BATCH} files per batch.` }, { status: 400 });
    }

    // Validate each entry
    for (const f of files) {
      if (!f.fileName || !f.mimeType || !f.fileSize) {
        return NextResponse.json({ error: "Each file needs fileName, mimeType, fileSize." }, { status: 400 });
      }
      if (!ALLOWED_MIME.has(f.mimeType)) {
        return NextResponse.json({ error: `Unsupported type: ${f.mimeType}` }, { status: 400 });
      }
      const isVideo = f.mimeType.startsWith("video/");
      if (f.fileSize > (isVideo ? MAX_VIDEO : MAX_IMAGE)) {
        return NextResponse.json({ error: `File too large: ${f.fileName}` }, { status: 400 });
      }
    }

    const supabase = createServiceClient();

    // Single DB round-trip for album validation
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

    const totalSize = files.reduce((sum, f) => sum + f.fileSize, 0);
    const allocatedBytes = album.allocated_gb * 1024 * 1024 * 1024;
    if ((album.used_bytes ?? 0) + totalSize > allocatedBytes) {
      return NextResponse.json({ error: "Album storage is full." }, { status: 413 });
    }

    // Generate all presigned URLs in parallel
    const timestamp = Date.now();
    const results = await Promise.all(
      files.map(async (f, idx) => {
        const safeName = f.fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
        const filePath = `albums/${albumId}/${timestamp}-${idx}-${safeName}`;
        const command = new PutObjectCommand({
          Bucket: R2_BUCKET,
          Key: filePath,
          ContentType: f.mimeType,
          ContentLength: f.fileSize,
        });
        const presignedUrl = await getSignedUrl(r2, command, { expiresIn: 900 });
        return { presignedUrl, filePath, fileUrl: `${R2_PUBLIC_URL}/${filePath}` };
      })
    );

    return NextResponse.json({ results });
  } catch (err) {
    console.error("[presign-batch] error:", err);
    return NextResponse.json({ error: "Failed to generate upload URLs." }, { status: 500 });
  }
}
