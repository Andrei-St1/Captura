import { NextRequest, NextResponse } from "next/server";
import { UploadPartCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { r2, R2_BUCKET } from "@/lib/r2";

const MAX_PARTS = 100;

export async function POST(request: NextRequest) {
  try {
    const { uploadId, filePath, partCount } = await request.json() as {
      uploadId: string;
      filePath: string;
      partCount: number;
    };

    if (!uploadId || !filePath || !partCount || partCount < 1 || partCount > MAX_PARTS) {
      return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    }

    const presignedUrls = await Promise.all(
      Array.from({ length: partCount }, (_, i) =>
        getSignedUrl(r2, new UploadPartCommand({
          Bucket: R2_BUCKET,
          Key: filePath,
          UploadId: uploadId,
          PartNumber: i + 1,
        }), { expiresIn: 3600 })
      )
    );

    return NextResponse.json({ presignedUrls });
  } catch (err) {
    console.error("[multipart-presign-parts] error:", err);
    return NextResponse.json({ error: "Failed to presign parts." }, { status: 500 });
  }
}
