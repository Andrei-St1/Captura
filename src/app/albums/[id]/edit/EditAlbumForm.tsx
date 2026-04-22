"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { updateAlbum } from "@/app/albums/actions";

interface Album {
  id: string;
  title: string;
  open_date: string | null;
  close_date: string | null;
  allocated_gb: number;
  show_gallery: boolean;
  thumbnail_url: string | null;
}

interface Props {
  album: Album;
  planStorageGb: number;
  allocatedGbOthers: number; // total allocated by OTHER albums (excluding this one)
}

function toDatetimeLocal(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toISOString().slice(0, 16);
}

export function EditAlbumForm({ album, planStorageGb, allocatedGbOthers }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showGallery, setShowGallery] = useState(album.show_gallery);
  const [inputGb, setInputGb] = useState(album.allocated_gb);
  const [coverPreview, setCoverPreview] = useState<string | null>(album.thumbnail_url ?? null);
  const [coverUploading, setCoverUploading] = useState(false);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const remaining = planStorageGb - allocatedGbOthers; // max this album can have
  const usedByOthersPercent = Math.round((allocatedGbOthers / planStorageGb) * 100);
  const thisPercent = Math.min(100 - usedByOthersPercent, Math.round((inputGb / planStorageGb) * 100));

  async function handleCoverChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setCoverPreview(URL.createObjectURL(file));
    setCoverUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("albumId", album.id);
    await fetch("/api/upload-thumbnail", { method: "POST", body: fd });
    setCoverUploading(false);
  }

  function removeCover() {
    setCoverPreview(null);
    if (coverInputRef.current) coverInputRef.current.value = "";
  }

  async function handleSubmit(formData: FormData) {
    setError(null);
    setLoading(true);
    formData.set("show_gallery", showGallery ? "true" : "false");
    const result = await updateAlbum(formData);
    if (result?.error) {
      setError(result.error);
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-surface font-manrope text-on-surface">

      {/* Navbar */}
      <nav className="fixed top-0 w-full z-50 bg-surface/70 backdrop-blur-xl shadow-[0_12px_40px_rgba(78,68,74,0.06)]">
        <div className="flex justify-between items-center px-8 h-16 w-full max-w-screen-2xl mx-auto">
          <Link href="/" className="font-noto-serif text-xl font-light tracking-tighter text-primary">Captura</Link>
          <Link href={`/albums/${album.id}`} className="flex items-center gap-2 text-sm text-on-surface-variant hover:text-primary transition">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m12 19-7-7 7-7" /><path d="M19 12H5" />
            </svg>
            Back to album
          </Link>
        </div>
      </nav>

      <main className="pt-28 pb-20 px-6">
        <div className="mx-auto max-w-2xl">

          <div className="mb-10">
            <h1 className="font-noto-serif text-4xl font-light text-on-surface tracking-tight">
              Edit <span className="italic text-primary">{album.title}</span>
            </h1>
            <p className="mt-3 text-on-surface-variant font-light">
              Update your album details. The QR code and join link stay the same.
            </p>
          </div>

          {error && (
            <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}

          <form action={handleSubmit} className="space-y-8">
            <input type="hidden" name="id" value={album.id} />

            {/* Basic info */}
            <section className="rounded-2xl bg-surface-container-lowest ring-1 ring-outline-variant/30 shadow-sm overflow-hidden">
              <div className="bg-surface-container-low px-6 py-4 border-b border-outline-variant/20">
                <h2 className="font-noto-serif text-lg font-light text-on-surface">Basic info</h2>
              </div>
              <div className="p-6 space-y-5">
                <div>
                  <label htmlFor="title" className="mb-1.5 block text-sm font-medium text-on-surface-variant">
                    Album title <span className="text-red-400">*</span>
                  </label>
                  <input
                    id="title" name="title" type="text" required
                    defaultValue={album.title}
                    className="w-full rounded-xl border border-outline-variant/40 bg-surface px-4 py-3 text-on-surface placeholder-outline text-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                <div className="rounded-xl bg-surface-container-low px-4 py-3 text-xs text-on-surface-variant">
                  Personalize the guest welcome page (cover photo, description, location) from the album detail page.
                </div>
              </div>
            </section>

            {/* Card thumbnail */}
            <section className="rounded-2xl bg-surface-container-lowest ring-1 ring-outline-variant/30 shadow-sm overflow-hidden">
              <div className="bg-surface-container-low px-6 py-4 border-b border-outline-variant/20">
                <div>
                  <h2 className="font-noto-serif text-lg font-light text-on-surface">Card thumbnail</h2>
                  <p className="text-xs text-on-surface-variant mt-0.5">Shown on the dashboard album card. Different from the guest welcome page cover.</p>
                </div>
              </div>
              <div className="p-6">
                {coverPreview ? (
                  <div className="relative w-full aspect-[4/3] rounded-xl overflow-hidden group">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={coverPreview} alt="Thumbnail" className="w-full h-full object-cover" />
                    {coverUploading && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <span className="text-white text-sm font-medium">Uploading…</span>
                      </div>
                    )}
                    {!coverUploading && (
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                        <label className="flex items-center gap-1.5 rounded-xl bg-white/20 backdrop-blur-sm px-4 py-2 text-sm font-semibold text-white hover:bg-white/30 transition cursor-pointer">
                          <span className="material-symbols-outlined text-base">edit</span>
                          Change
                          <input ref={coverInputRef} type="file" accept="image/*" className="hidden" onChange={handleCoverChange} />
                        </label>
                        <button
                          type="button"
                          onClick={removeCover}
                          className="flex items-center gap-1.5 rounded-xl bg-white/20 backdrop-blur-sm px-4 py-2 text-sm font-semibold text-white hover:bg-red-500/70 transition"
                        >
                          <span className="material-symbols-outlined text-base">delete</span>
                          Remove
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center gap-3 w-full aspect-[4/3] rounded-xl border-2 border-dashed border-outline-variant/40 cursor-pointer hover:border-primary hover:bg-surface-container transition-colors text-center p-6">
                    <span className="material-symbols-outlined text-outline-variant" style={{ fontSize: "40px" }}>add_photo_alternate</span>
                    <div>
                      <p className="text-sm font-medium text-on-surface-variant">Click to upload a thumbnail</p>
                      <p className="text-xs text-outline mt-1">JPG, PNG or WebP — shown on album cards</p>
                    </div>
                    <input ref={coverInputRef} type="file" accept="image/*" className="hidden" onChange={handleCoverChange} />
                  </label>
                )}
              </div>
            </section>

            {/* Dates */}
            <section className="rounded-2xl bg-surface-container-lowest ring-1 ring-outline-variant/30 shadow-sm overflow-hidden">
              <div className="bg-surface-container-low px-6 py-4 border-b border-outline-variant/20">
                <h2 className="font-noto-serif text-lg font-light text-on-surface">Dates</h2>
              </div>
              <div className="p-6 grid gap-5 sm:grid-cols-2">
                <div>
                  <label htmlFor="open_date" className="mb-1.5 block text-sm font-medium text-on-surface-variant">Open date</label>
                  <input
                    id="open_date" name="open_date" type="datetime-local"
                    defaultValue={toDatetimeLocal(album.open_date)}
                    className="w-full rounded-xl border border-outline-variant/40 bg-surface px-4 py-3 text-on-surface text-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <div>
                  <label htmlFor="close_date" className="mb-1.5 block text-sm font-medium text-on-surface-variant">Close date</label>
                  <input
                    id="close_date" name="close_date" type="datetime-local"
                    defaultValue={toDatetimeLocal(album.close_date)}
                    className="w-full rounded-xl border border-outline-variant/40 bg-surface px-4 py-3 text-on-surface text-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>
            </section>

            {/* Storage */}
            <section className="rounded-2xl bg-surface-container-lowest ring-1 ring-outline-variant/30 shadow-sm overflow-hidden">
              <div className="bg-surface-container-low px-6 py-4 border-b border-outline-variant/20">
                <h2 className="font-noto-serif text-lg font-light text-on-surface">Storage allocation</h2>
              </div>
              <div className="p-6 space-y-5">

                <div className="rounded-xl bg-surface-container-low p-4 space-y-3">
                  <div className="flex justify-between items-center text-sm">
                    <span className="font-medium text-on-surface">Your storage pool</span>
                    <span className="text-on-surface-variant">{planStorageGb} GB total</span>
                  </div>
                  <div className="w-full bg-outline-variant/20 rounded-full h-3 overflow-hidden">
                    <div className="h-full flex">
                      <div className="h-full bg-primary-container rounded-l-full transition-all" style={{ width: `${usedByOthersPercent}%` }} />
                      <div className="h-full bg-primary/60 transition-all" style={{ width: `${thisPercent}%` }} />
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-4 text-xs text-on-surface-variant">
                    <span className="flex items-center gap-1.5">
                      <span className="inline-block h-2.5 w-2.5 rounded-full bg-primary-container" />
                      Other albums — {allocatedGbOthers} GB
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="inline-block h-2.5 w-2.5 rounded-full bg-primary/60" />
                      This album — {inputGb} GB
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="inline-block h-2.5 w-2.5 rounded-full bg-outline-variant/30" />
                      Free — {Math.max(0, remaining - inputGb)} GB
                    </span>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label htmlFor="allocated_gb" className="text-sm font-medium text-on-surface-variant">
                      Allocate to this album (GB) <span className="text-red-400">*</span>
                    </label>
                    <span className="text-xs font-semibold text-primary">{remaining} GB available</span>
                  </div>
                  <input
                    id="allocated_gb" name="allocated_gb" type="number"
                    min={1} max={remaining} required
                    value={inputGb}
                    onChange={(e) => setInputGb(Math.max(1, Math.min(remaining, parseInt(e.target.value) || 1)))}
                    className="w-full rounded-xl border border-outline-variant/40 bg-surface px-4 py-3 text-on-surface text-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                  <p className="mt-1.5 text-xs text-outline">Enter between 1 and {remaining} GB.</p>
                </div>
              </div>
            </section>

            {/* Settings */}
            <section className="rounded-2xl bg-surface-container-lowest ring-1 ring-outline-variant/30 shadow-sm overflow-hidden">
              <div className="bg-surface-container-low px-6 py-4 border-b border-outline-variant/20">
                <h2 className="font-noto-serif text-lg font-light text-on-surface">Settings</h2>
              </div>
              <div className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-on-surface">Gallery visibility</p>
                    <p className="mt-1 text-xs text-outline leading-relaxed">
                      When enabled, guests can browse all uploads. When disabled, guests only see their own.
                    </p>
                  </div>
                  <button
                    type="button" role="switch" aria-checked={showGallery}
                    onClick={() => setShowGallery((v) => !v)}
                    className={`relative mt-0.5 shrink-0 h-6 w-11 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary/30 ${showGallery ? "bg-primary" : "bg-outline-variant"}`}
                  >
                    <span className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-200 ${showGallery ? "translate-x-5" : "translate-x-0"}`} />
                  </button>
                </div>
              </div>
            </section>

            {/* Submit */}
            <div className="flex items-center justify-end gap-4 pt-2">
              <Link href={`/albums/${album.id}`} className="rounded-xl px-6 py-3 text-sm font-medium text-on-surface-variant hover:text-on-surface transition">
                Cancel
              </Link>
              <button
                type="submit" disabled={loading}
                className="rounded-xl bg-gradient-to-r from-primary to-primary-container px-8 py-3 text-sm font-semibold text-white shadow-md hover:scale-[1.02] transition-all disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                {loading ? "Saving…" : "Save changes"}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
