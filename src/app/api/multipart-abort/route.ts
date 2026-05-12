import { NextRequest, NextResponse } from "next/server";
import { AbortMultipartUploadCommand } from "@aws-sdk/client-s3";
import { r2, R2_BUCKET } from "@/lib/r2";

export async function POST(request: NextRequest) {
  try {
    const { uploadId, filePath } = await request.json() as {
      uploadId: string;
      filePath: string;
    };

    if (!uploadId || !filePath) {
      return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
    }

    await r2.send(new AbortMultipartUploadCommand({
      Bucket: R2_BUCKET,
      Key: filePath,
      UploadId: uploadId,
    }));

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[multipart-abort] error:", err);
    return NextResponse.json({ error: "Failed to abort upload." }, { status: 500 });
  }
}
