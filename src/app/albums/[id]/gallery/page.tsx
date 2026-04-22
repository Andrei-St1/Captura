import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { logout } from "@/app/auth/actions";
import { OwnerUploadButton } from "./OwnerUploadButton";
import { GalleryWithFaces } from "./GalleryWithFaces";

export default async function AlbumGalleryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: album } = await supabase
    .from("albums")
    .select("id, title, status")
    .eq("id", id)
    .eq("owner_id", user.id)
    .single();

  if (!album || album.status === "deleted") notFound();

  const displayName = user.user_metadata?.full_name ?? user.email ?? "User";
  const initials = displayName
    .split(" ")
    .map((n: string) => n[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const { data: media } = await supabase
    .from("media")
    .select("id, file_url, file_type, file_size, mime_type, uploader_name, created_at")
    .eq("album_id", album.id)
    .order("created_at", { ascending: false });

  const mediaItems = media ?? [];

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

      <main className="pt-24 pb-20 px-8 max-w-screen-xl mx-auto">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-on-surface-variant mb-8">
          <Link href="/albums" className="hover:text-primary transition">Albums</Link>
          <span>/</span>
          <Link href={`/albums/${album.id}`} className="hover:text-primary transition truncate">{album.title}</Link>
          <span>/</span>
          <span className="text-on-surface font-medium">Gallery</span>
        </div>

        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-8">
          <div>
            <h1 className="font-noto-serif text-4xl font-light text-on-surface tracking-tight">
              {album.title}
            </h1>
            <p className="mt-1 text-on-surface-variant text-sm">
              {mediaItems.length} {mediaItems.length === 1 ? "file" : "files"}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <OwnerUploadButton albumId={album.id} />
            <Link
              href={`/albums/${album.id}`}
              className="flex items-center gap-2 rounded-xl border border-outline-variant/40 px-5 py-2.5 text-sm font-medium text-on-surface-variant hover:border-primary hover:text-primary transition"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m12 19-7-7 7-7"/><path d="M19 12H5"/>
              </svg>
              Back to album
            </Link>
          </div>
        </div>

        <GalleryWithFaces
          items={mediaItems}
          albumId={album.id}
          albumTitle={album.title}
        />
      </main>
    </div>
  );
}
