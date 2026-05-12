import { NextRequest, NextResponse } from "next/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { r2, R2_BUCKET, R2_PUBLIC_URL } from "@/lib/r2";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

const ALLOWED_MIME = new Set([
  "image/jpeg", "image/png", "image/webp", "image/gif",
  "video/mp4", "video/quicktime", "video/webm",
]);

const MAX_IMAGE = 50 * 1024 * 1024;
const MAX_VIDEO = 500 * 1024 * 1024;
const MAX_BATCH = 50;

interface FileEntry { fileName: string; mimeType: string; fileSize: number }

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { albumId, files } = await request.json() as { albumId: string; files: FileEntry[] };

    if (!albumId || !Array.isArray(files) || files.length === 0) {
      return NextResponse.json({ error: "Missing albumId or files." }, { status: 400 });
    }
    if (files.length > MAX_BATCH) {
      return NextResponse.json({ error: `Max ${MAX_BATCH} files per batch.` }, { status: 400 });
    }

    const service = createServiceClient();
    const { data: album } = await service
      .from("albums")
      .select("id, status, allocated_gb, used_bytes, owner_id")
      .eq("id", albumId)
      .eq("owner_id", user.id)
      .single();

    if (!album || album.status === "deleted") {
      return NextResponse.json({ error: "Album not found." }, { status: 404 });
    }

    for (const f of files) {
      if (!ALLOWED_MIME.has(f.mimeType)) {
        return NextResponse.json({ error: `Unsupported type: ${f.mimeType}` }, { status: 400 });
      }
      const isVideo = f.mimeType.startsWith("video/");
      if (f.fileSize > (isVideo ? MAX_VIDEO : MAX_IMAGE)) {
        return NextResponse.json({ error: `File too large: ${f.fileName}` }, { status: 400 });
      }
    }

    const totalSize = files.reduce((sum, f) => sum + f.fileSize, 0);
    const allocatedBytes = album.allocated_gb * 1024 * 1024 * 1024;
    if ((album.used_bytes ?? 0) + totalSize > allocatedBytes) {
      return NextResponse.json({ error: "Album storage is full." }, { status: 413 });
    }

    const timestamp = Date.now();
    const results = await Promise.all(
      files.map(async (f, idx) => {
        const safeName = f.fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
        const filePath = `albums/${albumId}/${timestamp}-${idx}-${safeName}`;
        const presignedUrl = await getSignedUrl(r2, new PutObjectCommand({
          Bucket: R2_BUCKET,
          Key: filePath,
          ContentType: f.mimeType,
          ContentLength: f.fileSize,
        }), { expiresIn: 3600 });

        const isVideo = f.mimeType.startsWith("video/");
        let thumbnailPresignedUrl: string | undefined;
        let thumbnailFileUrl: string | undefined;
        if (isVideo) {
          const thumbPath = `albums/${albumId}/thumbs/${timestamp}-${idx}-thumb.jpg`;
          thumbnailPresignedUrl = await getSignedUrl(r2, new PutObjectCommand({
            Bucket: R2_BUCKET,
            Key: thumbPath,
            ContentType: "image/jpeg",
          }), { expiresIn: 3600 });
          thumbnailFileUrl = `${R2_PUBLIC_URL}/${thumbPath}`;
        }

        return { presignedUrl, filePath, fileUrl: `${R2_PUBLIC_URL}/${filePath}`, thumbnailPresignedUrl, thumbnailFileUrl };
      })
    );

    return NextResponse.json({ results });
  } catch (err) {
    console.error("[presign-owner-batch] error:", err);
    return NextResponse.json({ error: "Failed to generate upload URLs." }, { status: 500 });
  }
}
