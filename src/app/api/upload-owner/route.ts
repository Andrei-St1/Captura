import { NextRequest, NextResponse } from "next/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { r2, R2_BUCKET, R2_PUBLIC_URL } from "@/lib/r2";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { detectAndSaveFaces } from "@/lib/faceDetect";
import { maybeConvertHeic } from "@/lib/convertHeic";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const albumId = formData.get("albumId") as string | null;

    if (!file || !albumId) {
      return NextResponse.json({ error: "Missing file or albumId." }, { status: 400 });
    }

    const service = createServiceClient();

    // Verify ownership + storage
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
    const usedBytes = album.used_bytes ?? 0;
    if (usedBytes + file.size > allocatedBytes) {
      return NextResponse.json({ error: "Album storage is full." }, { status: 413 });
    }

    const timestamp = Date.now();
    const arrayBuffer = await file.arrayBuffer();
    let buffer: Buffer = Buffer.from(new Uint8Array(arrayBuffer));
    let mimeType = file.type;
    let fileName = file.name;

    ({ buffer, mimeType, fileName } = await maybeConvertHeic(buffer, mimeType, fileName));

    const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
    const filePath = `albums/${albumId}/${timestamp}-${safeName}`;
    const fileType = mimeType.startsWith("video/") ? "video" : "image";

    await r2.send(new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: filePath,
      Body: buffer,
      ContentType: mimeType,
      ContentLength: buffer.length,
    }));

    const fileUrl = `${R2_PUBLIC_URL}/${filePath}`;

    const { data: inserted } = await service.from("media").insert({
      album_id: albumId,
      uploader_name: null,
      file_url: fileUrl,
      file_path: filePath,
      file_type: fileType,
      file_size: buffer.length,
      mime_type: mimeType,
    }).select("id").single();

    if (fileType === "image" && inserted?.id) {
      await detectAndSaveFaces(inserted.id, albumId, fileUrl);
    }

    await service
      .from("albums")
      .update({ used_bytes: usedBytes + buffer.length })
      .eq("id", albumId);

    return NextResponse.json({ success: true, fileUrl, fileType });
  } catch (err) {
    console.error("Owner upload error:", err);
    return NextResponse.json({ error: "Upload failed." }, { status: 500 });
  }
}
