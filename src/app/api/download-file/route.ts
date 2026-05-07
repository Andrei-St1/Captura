import { NextRequest, NextResponse } from "next/server";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { r2, R2_BUCKET } from "@/lib/r2";
import { createServiceClient } from "@/lib/supabase/service";

export async function GET(request: NextRequest) {
  const mediaId = request.nextUrl.searchParams.get("mediaId");
  if (!mediaId) return NextResponse.json({ error: "Missing mediaId." }, { status: 400 });

  const service = createServiceClient();

  // Fetch media + album in one query, validate gallery is public
  const { data: media } = await service
    .from("media")
    .select("id, file_path, file_type, created_at, albums(show_gallery)")
    .eq("id", mediaId)
    .single();

  if (!media) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const album = media.albums as any;
  if (!album?.show_gallery) {
    return NextResponse.json({ error: "Gallery is private." }, { status: 403 });
  }

  try {
    const cmd = new GetObjectCommand({ Bucket: R2_BUCKET, Key: media.file_path });
    const response = await r2.send(cmd);

    const ext  = media.file_path.split(".").pop() ?? (media.file_type === "video" ? "mp4" : "jpg");
    const date = new Date(media.created_at).toISOString().slice(0, 10);
    const filename = `captura_${date}.${ext}`;

    const chunks: Uint8Array[] = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for await (const chunk of response.Body as any) chunks.push(chunk);
    const buffer = Buffer.concat(chunks);

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": response.ContentType ?? "application/octet-stream",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": String(buffer.length),
        "Cache-Control": "private, no-store",
      },
    });
  } catch (err) {
    console.error("File download error:", err);
    return NextResponse.json({ error: "Failed to fetch file." }, { status: 500 });
  }
}
