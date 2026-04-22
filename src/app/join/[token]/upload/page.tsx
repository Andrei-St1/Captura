import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { UploadClient } from "./UploadClient";

export default async function UploadPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const supabase = await createClient();

  const { data: qr } = await supabase
    .from("qr_codes")
    .select("id, enabled, expires_at, albums(id, title, status, open_date, close_date)")
    .eq("token", token)
    .single();

  if (!qr) notFound();

  const album = qr.albums as any;
  if (!album || album.status === "deleted") notFound();

  const now = new Date();
  const qrDisabled = !qr.enabled || (qr.expires_at && new Date(qr.expires_at) < now);
  const notOpen = album.open_date && new Date(album.open_date) > now;
  const closed = album.close_date && new Date(album.close_date) < now;
  const isOpen = !qrDisabled && album.status === "active" && !notOpen && !closed;

  return (
    <div className="min-h-screen bg-surface font-manrope text-on-surface flex flex-col">
      <div className="pointer-events-none fixed -top-24 -left-24 w-96 h-96 rounded-full bg-primary/5 blur-3xl" />
      <div className="pointer-events-none fixed -bottom-24 -right-24 w-[32rem] h-[32rem] rounded-full bg-secondary/5 blur-3xl" />

      <header className="relative z-10 flex items-center justify-between px-6 py-5 border-b border-outline-variant/10">
        <Link href={`/join/${token}`} className="flex items-center gap-2 text-xs text-on-surface-variant hover:text-primary transition">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m12 19-7-7 7-7" /><path d="M19 12H5" />
          </svg>
          Back
        </Link>
        <Link href="/" className="font-noto-serif text-base font-light tracking-tight text-primary">Captura</Link>
      </header>

      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center">
            <span className="text-[10px] uppercase tracking-[0.3em] text-on-surface-variant block mb-3">Contributing to</span>
            <h1 className="font-noto-serif text-3xl font-light text-primary leading-tight">{album.title}</h1>
            <div className="mx-auto mt-4 w-10 h-px bg-outline-variant" />
          </div>

          {isOpen ? (
            <UploadClient albumId={album.id} albumTitle={album.title} token={token} />
          ) : qrDisabled ? (
            <div className="rounded-2xl bg-surface-container-lowest border border-outline-variant/20 p-8 text-center shadow-sm">
              <span className="material-symbols-outlined text-outline block mb-3" style={{ fontSize: "40px" }}>link_off</span>
              <p className="font-noto-serif text-xl text-on-surface">Link is inactive</p>
              <p className="text-sm text-on-surface-variant mt-2">Contact the organizer for a new invite link.</p>
            </div>
          ) : notOpen ? (
            <div className="rounded-2xl bg-surface-container-lowest border border-outline-variant/20 p-8 text-center shadow-sm">
              <span className="material-symbols-outlined text-secondary block mb-3" style={{ fontSize: "40px" }}>schedule</span>
              <p className="font-noto-serif text-xl text-on-surface">Not open yet</p>
              <p className="text-sm text-on-surface-variant mt-2">Check back when the event starts.</p>
            </div>
          ) : closed ? (
            <div className="rounded-2xl bg-surface-container-lowest border border-outline-variant/20 p-8 text-center shadow-sm">
              <span className="material-symbols-outlined text-secondary block mb-3" style={{ fontSize: "40px" }}>lock</span>
              <p className="font-noto-serif text-xl text-on-surface">Album is closed</p>
              <p className="text-sm text-on-surface-variant mt-2">This album no longer accepts uploads.</p>
            </div>
          ) : (
            <div className="rounded-2xl bg-surface-container-lowest border border-outline-variant/20 p-8 text-center shadow-sm">
              <span className="material-symbols-outlined text-outline block mb-3" style={{ fontSize: "40px" }}>folder_off</span>
              <p className="font-noto-serif text-xl text-on-surface">Album unavailable</p>
            </div>
          )}

          <p className="mt-8 text-center text-[10px] uppercase tracking-widest text-on-surface-variant/50">Powered by Captura</p>
        </div>
      </main>
    </div>
  );
}
