import { NextRequest, NextResponse } from "next/server";
import { CompleteMultipartUploadCommand } from "@aws-sdk/client-s3";
import { r2, R2_BUCKET } from "@/lib/r2";

export async function POST(request: NextRequest) {
  try {
    const { uploadId, filePath, parts } = await request.json() as {
      uploadId: string;
      filePath: string;
      parts: { PartNumber: number; ETag: string }[];
    };

    if (!uploadId || !filePath || !Array.isArray(parts) || parts.length === 0) {
      return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
    }

    await r2.send(new CompleteMultipartUploadCommand({
      Bucket: R2_BUCKET,
      Key: filePath,
      UploadId: uploadId,
      MultipartUpload: {
        Parts: parts
          .sort((a, b) => a.PartNumber - b.PartNumber)
          .map(p => ({ PartNumber: p.PartNumber, ETag: p.ETag })),
      },
    }));

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[multipart-complete] error:", err);
    return NextResponse.json({ error: "Failed to complete upload." }, { status: 500 });
  }
}
