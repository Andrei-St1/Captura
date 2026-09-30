import { after } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { makeThumbnailFromUrl } from "@/lib/makeThumbnail";
import { detectAndSaveFaces } from "@/lib/faceDetect";

export interface ConfirmItem {
  filePath: string;
  fileUrl: string;
  mimeType: string;
  fileSize: number;
  uploaderName?: string;
  thumbnailUrl?: string;
  takenAt?: string;
}

export const ALLOWED_MIME = new Set([
  "image/jpeg", "image/png", "image/webp", "image/gif",
  "image/heic", "image/heif",
  "video/mp4", "video/quicktime", "video/webm",
]);

export function hasRequiredFields(albumId: string, i: Partial<ConfirmItem> | null | undefined): boolean {
  return !!(albumId && i && i.filePath && i.fileUrl && i.mimeType && i.fileSize);
}

/** Path must be inside the album prefix and the mime type allowed. Returns an error message or null. */
export function validatePathAndMime(albumId: string, i: Pick<ConfirmItem, "filePath" | "mimeType">): string | null {
  if (!i.filePath.startsWith(`albums/${albumId}/`) || i.filePath.includes("..")) return "Invalid file path.";
  if (!ALLOWED_MIME.has(i.mimeType)) return `Unsupported type: ${i.mimeType}`;
  return null;
}

export type AlbumGate = { ok: true } | { ok: false; status: number; error: string };

/**
 * Album-level gate for confirming an upload. Guests need an active, open album
 * (same rules as presign-batch). The album owner may confirm into any non-deleted
 * album, matching presign-owner-batch.
 */
export async function checkAlbumAcceptsUploads(
  supabase: SupabaseClient,
  albumId: string,
  viewerId: string | null,
): Promise<AlbumGate> {
  const { data: album } = await supabase
    .from("albums")
    .select("id, status, open_date, close_date, owner_id")
    .eq("id", albumId)
    .single();
  if (!album || album.status === "deleted") return { ok: false, status: 404, error: "Album not found." };
  if (viewerId && album.owner_id === viewerId) return { ok: true };
  if (album.status !== "active") return { ok: false, status: 404, error: "Album not found or inactive." };
  const now = new Date();
  if (album.open_date && new Date(album.open_date) > now) return { ok: false, status: 403, error: "Album is not open yet." };
  if (album.close_date && new Date(album.close_date) < now) return { ok: false, status: 403, error: "Album is closed." };
  return { ok: true };
}

export function fileTypeOf(mimeType: string): "video" | "image" {
  return mimeType.startsWith("video/") ? "video" : "image";
}

export function buildMediaRow(albumId: string, i: ConfirmItem) {
  return {
    album_id: albumId,
    uploader_name: i.uploaderName || null,
    file_url: i.fileUrl,
    file_path: i.filePath,
    file_type: fileTypeOf(i.mimeType),
    file_size: i.fileSize,
    mime_type: i.mimeType,
    ...(i.thumbnailUrl ? { thumbnail_url: i.thumbnailUrl } : {}),
    ...(i.takenAt ? { taken_at: i.takenAt } : {}),
  };
}

/** Schedules (in after()) thumbnail generation if missing + face detection for one image. */
export function scheduleImageWork(
  supabase: SupabaseClient,
  tag: string,
  mediaId: string,
  albumId: string,
  i: Pick<ConfirmItem, "filePath" | "fileUrl" | "thumbnailUrl">
) {
  try {
    after(async () => {
      try {
        if (!i.thumbnailUrl) {
          const safeName = (i.filePath.split("/").pop() ?? "image").replace(/^\d+-/, "");
          const thumb = await makeThumbnailFromUrl(i.fileUrl, albumId, Date.now(), safeName);
          if (thumb) {
            await supabase.from("media").update({ thumbnail_url: thumb }).eq("id", mediaId);
          }
        }
      } catch (e) { console.error(`[${tag}] thumbnail:`, e); }
      try { await detectAndSaveFaces(mediaId, albumId, i.fileUrl); } catch (e) { console.error(`[${tag}] face detect:`, e); }
    });
  } catch (e) {
    console.error(`[${tag}] after() failed:`, e);
  }
}

/** Schedules (in after()) one atomic album byte increment. */
export function scheduleBytesIncrement(supabase: SupabaseClient, tag: string, albumId: string, delta: number) {
  try {
    after(async () => {
      try {
        const { error: rpcError } = await supabase.rpc("increment_album_bytes", { p_album_id: albumId, p_delta: delta });
        if (rpcError) console.error(`[${tag}] increment_album_bytes:`, rpcError);
      } catch (e) { console.error(`[${tag}] increment_album_bytes:`, e); }
    });
  } catch (e) {
    console.error(`[${tag}] after() failed for bytes increment:`, e);
  }
}
