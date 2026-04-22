"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { updateWelcomePage } from "@/app/albums/actions";

interface Album {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  cover_url: string | null;
}

export function WelcomeForm({ album, previewToken }: { album: Album; previewToken: string | null }) {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [coverPreview, setCoverPreview] = useState<string | null>(album.cover_url);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [uploadingCover, setUploadingCover] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function handleCoverChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setCoverFile(file);
    setCoverPreview(URL.createObjectURL(file));
  }

  async function handleSubmit(formData: FormData) {
    setError(null);
    setLoading(true);

    // Upload cover if changed
    if (coverFile) {
      setUploadingCover(true);
      const fd = new FormData();
      fd.append("file", coverFile);
      fd.append("albumId", album.id);
      const res = await fetch("/api/upload-cover", { method: "POST", body: fd });
      const result = await res.json();
      setUploadingCover(false);
      if (!res.ok || result.error) {
        setError(result.error ?? "Cover upload failed.");
        setLoading(false);
        return;
      }
    }

    const result = await updateWelcomePage(formData);
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
              Welcome <span className="italic text-primary">page</span>
            </h1>
            <p className="mt-3 text-on-surface-variant font-light">
              Customize what guests see when they scan the QR code.
            </p>
          </div>

          {error && (
            <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>
          )}

          <form action={handleSubmit} className="space-y-8">
            <input type="hidden" name="id" value={album.id} />

            {/* Cover photo */}
            <section className="rounded-2xl bg-surface-container-lowest ring-1 ring-outline-variant/30 shadow-sm overflow-hidden">
              <div className="bg-surface-container-low px-6 py-4 border-b border-outline-variant/20">
                <h2 className="font-noto-serif text-lg font-light text-on-surface">Cover photo</h2>
              </div>
              <div className="p-6">
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleCoverChange} />

                {coverPreview ? (
                  <div className="relative group">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={coverPreview}
                      alt="Cover preview"
                      className="w-full h-56 object-cover rounded-xl"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all rounded-xl flex items-center justify-center">
                      <button
                        type="button"
                        onClick={() => fileRef.current?.click()}
                        className="opacity-0 group-hover:opacity-100 transition-opacity rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow"
                      >
                        Change photo
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="w-full rounded-xl border-2 border-dashed border-outline-variant/40 bg-surface p-10 text-center hover:border-primary hover:bg-surface-container-low transition"
                  >
                    <div className="flex flex-col items-center gap-3">
                      <div className="rounded-2xl bg-primary/10 p-3">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#7d5070" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                          <rect width="18" height="18" x="3" y="3" rx="2" ry="2" /><circle cx="9" cy="9" r="2" /><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                        </svg>
                      </div>
                      <p className="text-sm font-medium text-on-surface-variant">Click to upload cover photo</p>
                      <p className="text-xs text-outline">JPG, PNG, WebP — recommended 1200×800px</p>
                    </div>
                  </button>
                )}
              </div>
            </section>

            {/* Details */}
            <section className="rounded-2xl bg-surface-container-lowest ring-1 ring-outline-variant/30 shadow-sm overflow-hidden">
              <div className="bg-surface-container-low px-6 py-4 border-b border-outline-variant/20">
                <h2 className="font-noto-serif text-lg font-light text-on-surface">Details</h2>
              </div>
              <div className="p-6 space-y-5">

                <div>
                  <label htmlFor="title" className="mb-1.5 block text-sm font-medium text-on-surface-variant">
                    Album name <span className="text-red-400">*</span>
                  </label>
                  <input
                    id="title" name="title" type="text" required
                    defaultValue={album.title}
                    className="w-full rounded-xl border border-outline-variant/40 bg-surface px-4 py-3 text-on-surface text-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                <div>
                  <label htmlFor="description" className="mb-1.5 block text-sm font-medium text-on-surface-variant">
                    Description
                  </label>
                  <textarea
                    id="description" name="description" rows={3}
                    defaultValue={album.description ?? ""}
                    placeholder="e.g. Help capture the magic of the day. Join the shared album to view and upload your favorite memories."
                    className="w-full rounded-xl border border-outline-variant/40 bg-surface px-4 py-3 text-on-surface placeholder-outline text-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                  />
                </div>

                <div>
                  <label htmlFor="location" className="mb-1.5 block text-sm font-medium text-on-surface-variant">
                    Location
                  </label>
                  <input
                    id="location" name="location" type="text"
                    defaultValue={album.location ?? ""}
                    placeholder="e.g. Lake Como, Italy"
                    className="w-full rounded-xl border border-outline-variant/40 bg-surface px-4 py-3 text-on-surface placeholder-outline text-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>

              </div>
            </section>

            {/* Preview note */}
            <div className="rounded-xl bg-violet-50 border border-violet-100 px-4 py-3 flex items-center gap-3 text-sm text-violet-700">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                <circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" />
              </svg>
              <span>
                Preview the welcome page at{" "}
                {previewToken ? (
                  <Link href={`/join/${previewToken}`} target="_blank" className="font-semibold underline underline-offset-2">
                    /join/{previewToken}
                  </Link>
                ) : (
                  <span className="text-outline">No active QR code — create one first</span>
                )}
              </span>
            </div>

            {/* Submit */}
            <div className="flex items-center justify-end gap-4 pt-2">
              <Link href={`/albums/${album.id}`} className="rounded-xl px-6 py-3 text-sm font-medium text-on-surface-variant hover:text-on-surface transition">
                Cancel
              </Link>
              <button
                type="submit"
                disabled={loading}
                className="rounded-xl bg-gradient-to-r from-primary to-primary-container px-8 py-3 text-sm font-semibold text-white shadow-md hover:scale-[1.02] transition-all disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                {uploadingCover ? "Uploading cover…" : loading ? "Saving…" : "Save welcome page"}
              </button>
            </div>

          </form>
        </div>
      </main>
    </div>
  );
}
