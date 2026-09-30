import { NextRequest, NextResponse } from "next/server";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { r2, R2_BUCKET } from "@/lib/r2";
import { createServiceClient } from "@/lib/supabase/service";

export async function GET(request: NextRequest) {
  const mediaId = request.nextUrl.searchParams.get("mediaId");
  if (!mediaId) return NextResponse.json({ error: "Missing mediaId." }, { status: 400 });

  const service = createServiceClient();

  const { data: media } = await service
    .from("media")
    .select("id, file_path, file_type, created_at")
    .eq("id", mediaId)
    .single();

  if (!media) return NextResponse.json({ error: "Not found." }, { status: 404 });

  try {
    const range = request.headers.get("range") ?? undefined;
    const cmd = new GetObjectCommand({ Bucket: R2_BUCKET, Key: media.file_path, Range: range });
    const response = await r2.send(cmd);

    const ext      = media.file_path.split(".").pop() ?? (media.file_type === "video" ? "mp4" : "jpg");
    const date     = new Date(media.created_at).toISOString().slice(0, 10);
    const filename = `captura_${date}.${ext}`;

    if (!response.Body) {
      return NextResponse.json({ error: "Failed to fetch file." }, { status: 500 });
    }

    const headers: Record<string, string> = {
      "Content-Type": response.ContentType ?? "application/octet-stream",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
      "Accept-Ranges": "bytes",
    };
    if (response.ContentLength != null) headers["Content-Length"] = String(response.ContentLength);
    const partial = !!range && !!response.ContentRange;
    if (partial) headers["Content-Range"] = response.ContentRange!;

    // Stream straight from R2 instead of buffering the whole object.
    const stream = response.Body.transformToWebStream();
    return new Response(stream, { status: partial ? 206 : 200, headers });
  } catch (err) {
    console.error("File download error:", err);
    return NextResponse.json({ error: "Failed to fetch file." }, { status: 500 });
  }
}
