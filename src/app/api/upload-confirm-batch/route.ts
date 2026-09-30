import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import {
  type ConfirmItem,
  buildMediaRow,
  checkAlbumAcceptsUploads,
  fileTypeOf,
  hasRequiredFields,
  scheduleBytesIncrement,
  scheduleImageWork,
  validatePathAndMime,
} from "@/lib/confirmUpload";

const MAX_BATCH = 50;

interface BatchResult { index: number; ok: boolean; id?: string; fileUrl?: string; error?: string }

export async function POST(request: NextRequest) {
  try {
    const { albumId, items } = await request.json() as { albumId: string; items: ConfirmItem[] };

    if (!albumId || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "Missing albumId or items." }, { status: 400 });
    }
    if (items.length > MAX_BATCH) {
      return NextResponse.json({ error: `Max ${MAX_BATCH} items per batch.` }, { status: 400 });
    }

    const results: BatchResult[] = items.map((_, index) => ({ index, ok: false }));
    const valid: { index: number; item: ConfirmItem }[] = [];

    items.forEach((item, index) => {
      if (!hasRequiredFields(albumId, item)) {
        results[index].error = "Missing required fields.";
      } else if (validatePathAndMime(albumId, item)) {
        results[index].error = validatePathAndMime(albumId, item)!;
      } else {
        valid.push({ index, item });
      }
    });

    if (valid.length > 0) {
      const supabase = createServiceClient();

      // Guests: album must be active and open (same rules as presign-batch)
      const gate = await checkAlbumAcceptsUploads(supabase, albumId, null);
      if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status });

      // ONE multi-row insert; rows come back in insertion order
      const { data: inserted, error: dbError } = await supabase
        .from("media")
        .insert(valid.map(({ item }) => buildMediaRow(albumId, item)))
        .select("id, file_path");

      if (dbError || !inserted) {
        const message = dbError?.message ?? "Insert failed";
        valid.forEach(({ index }) => { results[index].error = message; });
      } else {
        const byPath = new Map(inserted.map((r: { id: string; file_path: string }) => [r.file_path, r.id]));
        let totalBytes = 0;
        for (const { index, item } of valid) {
          const id = byPath.get(item.filePath);
          if (!id) { results[index].error = "Insert failed"; continue; }
          results[index] = { index, ok: true, id, fileUrl: item.fileUrl };
          totalBytes += item.fileSize;
          if (fileTypeOf(item.mimeType) === "image") {
            scheduleImageWork(supabase, "upload-confirm-batch", id, albumId, item);
          }
        }
        if (totalBytes > 0) scheduleBytesIncrement(supabase, "upload-confirm-batch", albumId, totalBytes);
      }
    }

    return NextResponse.json({ results });
  } catch (err) {
    console.error("[upload-confirm-batch] error:", err);
    return NextResponse.json({ error: "Failed to confirm uploads." }, { status: 500 });
  }
}
