import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { logout } from "@/app/auth/actions";
import { AlbumsClient } from "./AlbumsClient";

export default async function AlbumsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const displayName = user.user_metadata?.full_name ?? user.email ?? "User";
  const initials = displayName
    .split(" ")
    .map((n: string) => n[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const { data: albums } = await supabase
    .from("albums")
    .select("*, media(count)")
    .eq("owner_id", user.id)
    .neq("status", "deleted")
    .order("created_at", { ascending: false });

  const albumList = albums ?? [];

  return (
    <div className="min-h-screen bg-surface font-manrope text-on-surface">

      {/* Navbar */}
      <nav className="fixed top-0 w-full z-50 bg-surface/70 backdrop-blur-xl shadow-[0_12px_40px_rgba(78,68,74,0.06)]">
        <div className="flex justify-between items-center px-8 h-16 w-full max-w-screen-2xl mx-auto">
          <div className="flex items-center gap-12">
            <Link href="/" className="font-noto-serif text-xl font-light tracking-tighter text-primary">Captura</Link>
            <div className="hidden md:flex gap-8 items-center h-full">
              <Link href="/dashboard" className="text-on-surface-variant hover:text-primary transition-colors font-noto-serif tracking-wide text-sm uppercase h-16 flex items-center">Dashboard</Link>
              <Link href="/albums" className="text-primary font-semibold border-b-2 border-primary font-noto-serif tracking-wide text-sm uppercase h-16 flex items-center">Albums</Link>
              <Link href="/settings" className="text-on-surface-variant hover:text-primary transition-colors font-noto-serif tracking-wide text-sm uppercase h-16 flex items-center">Settings</Link>
            </div>
          </div>
          <div className="flex items-center gap-5">
            <div className="h-8 w-8 rounded-full bg-primary-container flex items-center justify-center text-white text-xs font-bold ring-2 ring-outline-variant/20 ring-offset-2 ring-offset-surface select-none">
              {initials}
            </div>
            <form action={logout}>
              <button type="submit" className="hidden sm:block text-[11px] text-on-surface-variant hover:text-primary transition-colors font-medium tracking-widest uppercase">
                Sign out
              </button>
            </form>
          </div>
        </div>
      </nav>

      <main className="pt-24 pb-20 px-8 max-w-screen-2xl mx-auto">

        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 gap-6">
          <div>
            <h1 className="font-noto-serif text-4xl font-light text-on-surface tracking-tight">
              Your <span className="italic text-primary">Albums</span>
            </h1>
          </div>
          <Link
            href="/albums/create"
            className="bg-gradient-to-r from-primary to-primary-container text-white px-7 py-3.5 rounded-lg flex items-center gap-2 shadow-lg hover:scale-[1.02] transition-all duration-300 text-sm font-semibold"
          >
            <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>add_circle</span>
            Create Album
          </Link>
        </div>

        {albumList.length === 0 ? (
          <div className="text-center py-32">
            <span className="material-symbols-outlined text-outline-variant block mb-4" style={{ fontSize: "64px" }}>photo_library</span>
            <p className="font-noto-serif text-2xl font-light text-on-surface">No albums yet</p>
            <p className="text-on-surface-variant text-sm mt-2 mb-8">Create your first album to get started</p>
            <Link href="/albums/create" className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-white hover:bg-primary/90 transition">
              Create your first album →
            </Link>
          </div>
        ) : (
          <AlbumsClient albums={albumList as any} />
        )}
      </main>
    </div>
  );
}
