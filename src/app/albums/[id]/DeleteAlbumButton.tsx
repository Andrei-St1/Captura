"use client";

import { useState } from "react";
import { deleteAlbum } from "@/app/albums/actions";

export function DeleteAlbumButton({ albumId, albumTitle }: { albumId: string; albumTitle: string }) {
  const [confirm, setConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    setLoading(true);
    await deleteAlbum(albumId);
  }

  return (
    <>
      <button
        onClick={() => setConfirm(true)}
        className="flex items-center gap-2 rounded-xl border border-red-200 px-5 py-2.5 text-sm font-medium text-red-500 hover:bg-red-50 hover:border-red-300 transition shrink-0"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="3 6 5 6 21 6" />
          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
          <path d="M10 11v6" /><path d="M14 11v6" />
          <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
        </svg>
        Delete album
      </button>

      {confirm && (
        <div
          className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
          onClick={() => !loading && setConfirm(false)}
        >
          <div
            className="bg-surface-container-lowest rounded-2xl p-7 max-w-sm w-full shadow-2xl ring-1 ring-outline-variant/30"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-red-50 mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                <path d="M10 11v6" /><path d="M14 11v6" />
                <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
              </svg>
            </div>

            <h3 className="font-noto-serif text-xl text-on-surface mb-2">Delete &ldquo;{albumTitle}&rdquo;?</h3>
            <p className="text-sm text-on-surface-variant leading-relaxed mb-1">
              This will permanently delete:
            </p>
            <ul className="text-sm text-on-surface-variant list-disc list-inside mb-6 space-y-0.5">
              <li>All uploaded photos and videos</li>
              <li>All QR codes for this album</li>
              <li>The cover photo</li>
              <li>All album settings</li>
            </ul>
            <p className="text-sm font-semibold text-red-500 mb-6">This cannot be undone.</p>

            <div className="flex gap-3">
              <button
                onClick={() => setConfirm(false)}
                disabled={loading}
                className="flex-1 rounded-xl border border-outline-variant/40 py-2.5 text-sm font-medium text-on-surface-variant hover:bg-surface-container transition disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={loading}
                className="flex-1 rounded-xl bg-red-500 py-2.5 text-sm font-semibold text-white hover:bg-red-600 transition disabled:opacity-60"
              >
                {loading ? "Deleting…" : "Delete permanently"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
