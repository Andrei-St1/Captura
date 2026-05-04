import { NextRequest, NextResponse } from "next/server";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { r2, R2_BUCKET } from "@/lib/r2";
import { createServiceClient } from "@/lib/supabase/service";

export async function GET(request: NextRequest) {
  const mediaId = request.nextUrl.searchParams.get("id");
  if (!mediaId) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const service = createServiceClient();

  const { data: media } = await service
    .from("media")
    .select("id, file_path, file_type, mime_type, uploader_name, album_id")
    .eq("id", mediaId)
    .single();

  if (!media) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data: album } = await service
    .from("albums")
    .select("status")
    .eq("id", media.album_id)
    .single();

  if (!album || album.status === "deleted") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const cmd = new GetObjectCommand({ Bucket: R2_BUCKET, Key: media.file_path });
    const r2res = await r2.send(cmd);

    const chunks: Uint8Array[] = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for await (const chunk of r2res.Body as any) chunks.push(chunk);
    const buffer = Buffer.concat(chunks);

    const ext = media.file_path.split(".").pop() ?? (media.file_type === "video" ? "mp4" : "jpg");
    const base = media.uploader_name
      ? media.uploader_name.replace(/[^a-zA-Z0-9_-]/g, "_")
      : "file";
    const filename = `${base}.${ext}`;

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": media.mime_type ?? r2res.ContentType ?? "application/octet-stream",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": String(buffer.length),
      },
    });
  } catch {
    return NextResponse.json({ error: "Download failed" }, { status: 500 });
  }
}
