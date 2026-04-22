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

    await Promise.all(
      mediaFiles.map(async (media) => {
        try {
          const cmd = new GetObjectCommand({ Bucket: R2_BUCKET, Key: media.file_path });
          const response = await r2.send(cmd);
          const chunks: Uint8Array[] = [];
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          for await (const chunk of response.Body as any) {
            chunks.push(chunk);
          }
          const buffer = Buffer.concat(chunks);

          // Build a readable filename
          const ext = media.file_path.split(".").pop() ?? (media.file_type === "video" ? "mp4" : "jpg");
          const base = media.uploader_name
            ? `${media.uploader_name.replace(/[^a-zA-Z0-9_-]/g, "_")}`
            : `file`;
          const dateStr = new Date(media.created_at).toISOString().slice(0, 10);
          let name = `${dateStr}_${base}.${ext}`;

          // Deduplicate
          if (usedNames.has(name)) {
            const n = (usedNames.get(name) ?? 0) + 1;
            usedNames.set(name, n);
            name = `${dateStr}_${base}_${n}.${ext}`;
          } else {
            usedNames.set(name, 0);
          }

          zip.file(name, buffer);
        } catch {
          // Skip files that fail to fetch
        }
      })
    );

    const zipBuffer = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE", compressionOptions: { level: 3 } });

    const safeName = album.title.replace(/[^a-zA-Z0-9_-]/g, "_");
    return new NextResponse(zipBuffer, {
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
