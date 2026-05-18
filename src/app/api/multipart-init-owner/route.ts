import { NextRequest, NextResponse } from "next/server";
import { CreateMultipartUploadCommand, PutObjectCommand, UploadPartCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { r2, R2_BUCKET, R2_PUBLIC_URL } from "@/lib/r2";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

const MAX_VIDEO = 500 * 1024 * 1024;
const MAX_PARTS = 100;

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { albumId, fileName, mimeType, fileSize, partCount } = await request.json() as {
      albumId: string; fileName: string; mimeType: string; fileSize: number; partCount: number;
    };

    if (!albumId || !fileName || !mimeType || !fileSize || !partCount || partCount < 1 || partCount > MAX_PARTS) {
      return NextResponse.json({ error: "Missing or invalid fields." }, { status: 400 });
    }
    if (fileSize > MAX_VIDEO) {
      return NextResponse.json({ error: "File too large." }, { status: 400 });
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

    const isVideo = mimeType.startsWith("video/");
    const thumbPath = isVideo ? `albums/${albumId}/thumbs/${timestamp}-thumb.jpg` : null;

    const [presignedUrls, thumbnailPresignedUrl] = await Promise.all([
      Promise.all(
        Array.from({ length: partCount }, (_, i) =>
          getSignedUrl(r2, new UploadPartCommand({
            Bucket: R2_BUCKET,
            Key: filePath,
            UploadId,
            PartNumber: i + 1,
          }), { expiresIn: 3600 })
        )
      ),
      thumbPath
        ? getSignedUrl(r2, new PutObjectCommand({
            Bucket: R2_BUCKET,
            Key: thumbPath,
            ContentType: "image/jpeg",
          }), { expiresIn: 3600 })
        : Promise.resolve(undefined),
    ]);

    return NextResponse.json({
      uploadId: UploadId,
      filePath,
      fileUrl: `${R2_PUBLIC_URL}/${filePath}`,
      presignedUrls,
      ...(thumbPath ? { thumbnailPresignedUrl, thumbnailFileUrl: `${R2_PUBLIC_URL}/${thumbPath}` } : {}),
    });
  } catch (err) {
    console.error("[multipart-init-owner] error:", err);
    return NextResponse.json({ error: "Failed to initiate upload." }, { status: 500 });
  }
}
