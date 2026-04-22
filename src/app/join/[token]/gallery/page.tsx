import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { GalleryGrid } from "./GalleryGrid";

export default async function GalleryPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const supabase = await createClient();

  const { data: qr } = await supabase
    .from("qr_codes")
    .select("id, enabled, expires_at, albums(id, title, status, show_gallery)")
    .eq("token", token)
    .single();

  if (!qr) notFound();

  const album = qr.albums as any;
  if (!album || album.status === "deleted") notFound();

  if (!album.show_gallery) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center px-4 font-manrope">
        <div className="w-full max-w-sm rounded-3xl bg-surface-container-lowest shadow-xl p-8 text-center ring-1 ring-outline-variant/20">
          <span className="material-symbols-outlined text-outline-variant block mb-4" style={{ fontSize: "48px" }}>lock</span>
          <p className="font-noto-serif text-xl text-on-surface">Gallery is private</p>
          <p className="mt-2 text-sm text-on-surface-variant">The album owner has disabled public gallery viewing.</p>
          <Link href={`/join/${token}`} className="mt-6 inline-block text-sm font-semibold text-primary hover:underline">← Back to album</Link>
        </div>
      </div>
    );
  }

  const { data: media } = await supabase
    .from("media")
    .select("id, file_url, file_type, file_size, uploader_name, created_at")
    .eq("album_id", album.id)
    .order("created_at", { ascending: false });

  const items = media ?? [];

  return (
    <div className="min-h-screen bg-surface font-manrope" style={{ background: "linear-gradient(135deg, #ede9fe 0%, #f5d0fe 45%, #fecdd3 80%, #fff1f2 100%)" }}>
      <div className="pointer-events-none fixed -top-32 -left-32 h-96 w-96 rounded-full bg-violet-300/20 blur-3xl" />
      <div className="pointer-events-none fixed -bottom-32 -right-32 h-96 w-96 rounded-full bg-rose-300/20 blur-3xl" />

      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-violet-100">
        <div className="mx-auto max-w-4xl px-4 py-4 flex items-center justify-between">
          <div>
            <Link href={`/join/${token}`} className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-violet-600 transition mb-1">
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m12 19-7-7 7-7" /><path d="M19 12H5" />
              </svg>
              Back
            </Link>
            <h1 className="font-noto-serif text-lg font-light text-slate-900">{album.title}</h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-500">{items.length} {items.length === 1 ? "file" : "files"}</span>
            <Link href={`/join/${token}/upload`} className="rounded-xl bg-violet-600 px-4 py-2 text-xs font-semibold text-white hover:bg-violet-500 transition">
              + Upload
            </Link>
          </div>
        </div>
      </div>

      <div className="relative mx-auto max-w-4xl px-4 py-8">
        {items.length === 0 ? (
          <div className="text-center py-24">
            <div className="inline-flex items-center justify-center h-20 w-20 rounded-2xl bg-white/70 mb-5 shadow-sm">
              <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                <rect width="18" height="18" x="3" y="3" rx="2" ry="2" /><circle cx="9" cy="9" r="2" /><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
              </svg>
            </div>
            <p className="font-noto-serif text-xl font-light text-slate-700">Nothing here yet</p>
            <p className="mt-2 text-sm text-slate-500">Be the first to add a memory to this album.</p>
            <Link href={`/join/${token}/upload`} className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-violet-600 px-6 py-3 text-sm font-semibold text-white hover:bg-violet-500 transition shadow-lg shadow-violet-200">
              Add yours →
            </Link>
          </div>
        ) : (
          <GalleryGrid items={items} />
        )}
      </div>

      <p className="pb-8 text-center text-xs text-slate-400">
        Powered by <Link href="/" className="font-semibold text-violet-600 hover:underline">Captura</Link>
      </p>
    </div>
  );
}
