import { NextRequest, NextResponse } from "next/server";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import JSZip from "jszip";
import { r2, R2_BUCKET } from "@/lib/r2";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { albumId, mediaIds } = await request.json() as { albumId: string; mediaIds?: string[] };
    if (!albumId) return NextResponse.json({ error: "Missing albumId." }, { status: 400 });

    // Verify ownership
    const { data: album } = await supabase
      .from("albums")
      .select("id, title")
      .eq("id", albumId)
      .eq("owner_id", user.id)
      .single();

    if (!album) return NextResponse.json({ error: "Album not found." }, { status: 404 });

    // Fetch media records
    const service = createServiceClient();
    let query = service
      .from("media")
      .select("id, file_path, file_url, file_type, uploader_name, created_at")
      .eq("album_id", albumId);

    if (mediaIds && mediaIds.length > 0) {
      query = query.in("id", mediaIds);
    }

    const { data: mediaFiles } = await query;
    if (!mediaFiles || mediaFiles.length === 0) {
      return NextResponse.json({ error: "No files found." }, { status: 404 });
    }

    // Build zip
    const zip = new JSZip();
    const usedNames = new Map<string, number>();

    // Assign names up front, in record order, so dedupe is deterministic.
    const entries = mediaFiles.map((media) => {
      const ext = media.file_path.split(".").pop() ?? (media.file_type === "video" ? "mp4" : "jpg");
      const base = media.uploader_name
        ? `${media.uploader_name.replace(/[^a-zA-Z0-9_-]/g, "_")}`
        : `file`;
      const dateStr = new Date(media.created_at).toISOString().slice(0, 10);
      let name = `${dateStr}_${base}.${ext}`;
      if (usedNames.has(name)) {
        const n = (usedNames.get(name) ?? 0) + 1;
        usedNames.set(name, n);
        name = `${dateStr}_${base}_${n}.${ext}`;
      } else {
        usedNames.set(name, 0);
      }
      return { key: media.file_path, name };
    });

    // Fetch with bounded concurrency.
    const CONCURRENCY = 4;
    let next = 0;
    const worker = async () => {
      while (next < entries.length) {
        const entry = entries[next++];
        try {
          const response = await r2.send(new GetObjectCommand({ Bucket: R2_BUCKET, Key: entry.key }));
          if (!response.Body) continue;
          const bytes = await response.Body.transformToByteArray();
          zip.file(entry.name, bytes);
        } catch {
          // Skip files that fail to fetch
        }
      }
    };
    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, entries.length) }, worker));

    // Photos/videos are already compressed: store without DEFLATE to save CPU.
    const zipBuffer = await zip.generateAsync({ type: "nodebuffer", compression: "STORE" });

    const safeName = album.title.replace(/[^a-zA-Z0-9_-]/g, "_");
    return new NextResponse(new Uint8Array(zipBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${safeName}.zip"`,
        "Content-Length": String(zipBuffer.length),
      },
    });
  } catch (err) {
    console.error("Download error:", err);
    return NextResponse.json({ error: "Download failed." }, { status: 500 });
  }
}
