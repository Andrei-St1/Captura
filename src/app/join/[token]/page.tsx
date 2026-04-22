import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

type AlbumStatus = "not_open" | "open" | "closed" | "archived" | "qr_disabled";

function getStatus(qr: { enabled: boolean; expires_at: string | null }, album: {
  status: string; open_date: string | null; close_date: string | null;
}): AlbumStatus {
  if (!qr.enabled) return "qr_disabled";
  if (qr.expires_at && new Date(qr.expires_at) < new Date()) return "qr_disabled";
  if (album.status !== "active") return "archived";
  const now = new Date();
  if (album.open_date && new Date(album.open_date) > now) return "not_open";
  if (album.close_date && new Date(album.close_date) < now) return "closed";
  return "open";
}

function formatEventDate(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

export default async function JoinPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const supabase = await createClient();

  const { data: qr } = await supabase
    .from("qr_codes")
    .select("id, token, enabled, expires_at, albums(id, title, description, location, cover_url, open_date, close_date, status, show_gallery)")
    .eq("token", token)
    .single();

  if (!qr) notFound();

  const album = qr.albums as any;
  if (!album || album.status === "deleted") notFound();

  const status = getStatus(qr, album);
  const eventDate = formatEventDate(album.open_date);

  return (
    <div className="bg-surface font-manrope text-on-surface min-h-screen">
      <div className="pointer-events-none fixed -top-24 -left-24 w-96 h-96 rounded-full bg-primary/5 blur-3xl z-0" />
      <div className="pointer-events-none fixed -bottom-24 -right-24 w-[32rem] h-[32rem] rounded-full bg-secondary/5 blur-3xl z-0" />

      <main className="relative z-10 min-h-screen pt-8 pb-12 flex flex-col items-center justify-center px-6">
        <div className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-12 gap-0 overflow-hidden relative">

          {/* Left: Cover image (desktop) */}
          <div className="md:col-span-5 relative z-10 hidden md:block">
            <div className="h-full min-h-[600px] relative rounded-l-2xl overflow-hidden shadow-2xl">
              {album.cover_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={album.cover_url} alt={album.title} className="absolute inset-0 w-full h-full object-cover" />
              ) : (
                <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, #7c3aed 0%, #a855f7 50%, #ec4899 100%)" }}>
                  <div className="flex h-full items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" width="72" height="72" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="opacity-30">
                      <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
                      <circle cx="12" cy="13" r="3" />
                    </svg>
                  </div>
                </div>
              )}
              <div className="absolute inset-0 bg-primary/10 mix-blend-multiply" />
            </div>
          </div>

          {/* Mobile cover */}
          <div className="md:hidden order-first mb-6 rounded-2xl overflow-hidden h-52 shadow-lg">
            {album.cover_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={album.cover_url} alt={album.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full" style={{ background: "linear-gradient(135deg, #7c3aed 0%, #a855f7 50%, #ec4899 100%)" }} />
            )}
          </div>

          {/* Right: Content */}
          <div className="md:col-span-7 bg-surface-container-lowest p-8 md:p-14 flex flex-col justify-center relative z-10 shadow-xl rounded-2xl md:rounded-l-none border border-outline-variant/10 md:border-l-0">

            <div className="mb-10">
              <span className="font-manrope text-[10px] uppercase tracking-[0.3em] text-on-surface-variant block mb-4">
                You are invited to contribute to
              </span>
              <h1 className="font-noto-serif text-5xl md:text-6xl text-primary leading-tight tracking-tight mb-2">
                {album.title}
              </h1>
              <div className="w-12 h-px bg-secondary-container mt-6" />
            </div>

            <div className="space-y-6 mb-12">
              {eventDate && (
                <div className="flex items-start gap-4">
                  <span className="material-symbols-outlined text-secondary mt-0.5" style={{ fontSize: "22px" }}>calendar_today</span>
                  <div>
                    <p className="font-manrope text-[10px] uppercase tracking-widest text-on-surface-variant mb-1">The Date</p>
                    <p className="font-noto-serif text-xl text-on-surface">{eventDate}</p>
                  </div>
                </div>
              )}
              {album.location && (
                <div className="flex items-start gap-4">
                  <span className="material-symbols-outlined text-secondary mt-0.5" style={{ fontSize: "22px" }}>location_on</span>
                  <div>
                    <p className="font-manrope text-[10px] uppercase tracking-widest text-on-surface-variant mb-1">The Setting</p>
                    <p className="font-noto-serif text-xl text-on-surface">{album.location}</p>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-6">
              {album.description && (
                <p className="text-on-surface-variant leading-relaxed max-w-sm text-sm">{album.description}</p>
              )}

              <div className="pt-2 flex flex-col sm:flex-row gap-3">
                {status === "open" && (
                  <>
                    <Link
                      href={`/join/${token}/upload`}
                      className="flex items-center justify-center gap-3 rounded-lg px-8 py-4 font-semibold text-sm tracking-wide shadow-lg hover:scale-[1.02] transition-transform text-white"
                      style={{ background: "linear-gradient(to right, #7d5070, #b784a7)" }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: "20px", fontVariationSettings: "'FILL' 1" }}>add_a_photo</span>
                      Join {album.title}
                    </Link>
                    {album.show_gallery && (
                      <Link href={`/join/${token}/gallery`}
                        className="flex items-center justify-center gap-2 rounded-lg border border-outline-variant/40 px-6 py-4 text-sm font-medium text-on-surface-variant hover:border-primary hover:text-primary transition">
                        <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>photo_library</span>
                        View gallery
                      </Link>
                    )}
                  </>
                )}

                {(status === "qr_disabled" || status === "archived") && (
                  <div className="rounded-xl bg-surface-container px-6 py-4">
                    <p className="font-semibold text-on-surface-variant text-sm">This link is no longer active</p>
                    <p className="text-xs text-on-surface-variant/60 mt-1">Contact the organizer for a new invite link.</p>
                  </div>
                )}

                {status === "not_open" && (
                  <div className="rounded-xl bg-amber-50 border border-amber-100 px-6 py-4">
                    <p className="font-semibold text-amber-800 text-sm">Not open yet</p>
                    <p className="text-xs text-amber-600 mt-1">
                      Opens on {new Date(album.open_date!).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                )}

                {status === "closed" && (
                  <div className="space-y-3">
                    <div className="rounded-xl bg-surface-container px-6 py-4">
                      <p className="font-semibold text-on-surface text-sm">Album is closed</p>
                      <p className="text-xs text-on-surface-variant mt-1">
                        Stopped accepting uploads on {new Date(album.close_date!).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
                      </p>
                    </div>
                    {album.show_gallery && (
                      <Link href={`/join/${token}/gallery`}
                        className="flex items-center justify-center gap-2 rounded-lg border border-outline-variant/40 px-6 py-3.5 text-sm font-medium text-on-surface-variant hover:border-primary hover:text-primary transition">
                        <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>photo_library</span>
                        View gallery
                      </Link>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="mt-14 pt-6 border-t border-outline-variant/10">
              <p className="font-manrope text-[10px] text-on-surface-variant/60 uppercase tracking-widest">
                Powered by <Link href="/" className="hover:text-primary transition">Captura</Link>
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
