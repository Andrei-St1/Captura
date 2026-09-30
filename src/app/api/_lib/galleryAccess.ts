import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { getQrAlbum } from "@/lib/getQrAlbum";

export const GALLERY_PAGE_SIZE = 30;

export interface GalleryMediaItem {
  id: string;
  file_url: string;
  file_type: string;
  file_size: number;
  uploader_name: string | null;
  created_at: string;
  thumbnail_url?: string | null;
  taken_at?: string | null;
}

export type GallerySort = "taken" | "upload";

/** A QR link works only while enabled and not past its expiry (same rule as the welcome page). */
export function isQrActive(qr: { enabled: boolean; expires_at: string | null }): boolean {
  if (!qr.enabled) return false;
  if (qr.expires_at && new Date(qr.expires_at) < new Date()) return false;
  return true;
}

/**
 * Mirrors the checks in join/[token]/gallery/page.tsx: token resolves to an album,
 * album not deleted, QR link enabled and unexpired, PIN cookie matches when a PIN is required,
 * show_gallery is on.
 */
export async function checkGalleryAccess(token: string | null): Promise<
  { ok: true; album: any } | { ok: false; res: NextResponse }
> {
  if (!token) return { ok: false, res: NextResponse.json({ error: "Missing token" }, { status: 400 }) };
  const qr = await getQrAlbum(token);
  const album = qr?.albums as any;
  if (!qr || !album || album.status === "deleted") {
    return { ok: false, res: NextResponse.json({ error: "Not found" }, { status: 404 }) };
  }
  if (!isQrActive(qr)) {
    return { ok: false, res: NextResponse.json({ error: "Link disabled or expired" }, { status: 403 }) };
  }
  if (album.pin_required && album.pin_hash) {
    const store = await cookies();
    if (store.get(`jn_pin_${album.id}`)?.value !== album.pin_hash) {
      return { ok: false, res: NextResponse.json({ error: "PIN required" }, { status: 401 }) };
    }
  }
  if (!album.show_gallery) {
    return { ok: false, res: NextResponse.json({ error: "Gallery is private" }, { status: 403 }) };
  }
  return { ok: true, album };
}

const SELECT = "id, file_url, file_type, file_size, uploader_name, created_at, thumbnail_url, taken_at";
const UUID_RE = /^[0-9a-fA-F-]{36}$/;
const TS_RE = /^[0-9T:.\-+Z ]{10,40}$/;

/**
 * Fetches one page. Cursors:
 *  - upload sort: "c:<created_at>|<id>" (keyset on created_at desc, id desc)
 *  - taken sort:  "o:<offset>" (taken_at can be null, so keyset is impractical)
 * Returns items plus nextCursor (null when no more).
 */
export async function fetchGalleryPage(
  albumId: string,
  sort: GallerySort,
  cursor: string | null,
): Promise<{ items: GalleryMediaItem[]; nextCursor: string | null; badCursor?: boolean }> {
  const supabase = await createClient();
  let q = supabase.from("media").select(SELECT).eq("album_id", albumId);
  let offset = 0;

  if (sort === "taken") {
    if (cursor) {
      const m = /^o:(\d{1,7})$/.exec(cursor);
      if (!m) return { items: [], nextCursor: null, badCursor: true };
      offset = parseInt(m[1], 10);
    }
    q = q
      .order("taken_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .range(offset, offset + GALLERY_PAGE_SIZE);
  } else {
    if (cursor) {
      const m = /^c:([^|]+)\|(.+)$/.exec(cursor);
      if (!m || !TS_RE.test(m[1]) || !UUID_RE.test(m[2])) {
        return { items: [], nextCursor: null, badCursor: true };
      }
      const ts = m[1].replace(" ", "T").replace(/\+00(:?00)?$/, "Z");
      q = q.or(`created_at.lt."${ts}",and(created_at.eq."${ts}",id.lt.${m[2]})`);
    }
    q = q
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(GALLERY_PAGE_SIZE + 1);
  }

  const { data } = await q;
  const rows = (data ?? []) as GalleryMediaItem[];
  const hasMore = rows.length > GALLERY_PAGE_SIZE;
  const items = hasMore ? rows.slice(0, GALLERY_PAGE_SIZE) : rows;
  let nextCursor: string | null = null;
  if (hasMore) {
    const last = items[items.length - 1];
    nextCursor = sort === "taken" ? `o:${offset + GALLERY_PAGE_SIZE}` : `c:${last.created_at}|${last.id}`;
  }
  return { items, nextCursor };
}
