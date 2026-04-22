"use client";

import { useState } from "react";
import { setAlbumStatus } from "@/app/albums/actions";
import { useRouter } from "next/navigation";

interface Props {
  albumId: string;
  currentStatus: string;
}

export function AlbumStatusButton({ albumId, currentStatus }: Props) {
  const [confirm, setConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const isActive = currentStatus === "active";

  async function handleConfirm() {
    setLoading(true);
    const result = await setAlbumStatus(albumId, isActive ? "archived" : "active");
    setLoading(false);
    setConfirm(false);
    if (!result.error) router.refresh();
  }

  return (
    <>
      <button
        onClick={() => setConfirm(true)}
        className={`flex items-center gap-2 rounded-xl border px-5 py-2.5 text-sm font-medium transition shrink-0 ${
          isActive
            ? "border-outline-variant/40 text-on-surface-variant hover:border-red-300 hover:text-red-500"
            : "border-emerald-200 text-emerald-700 hover:bg-emerald-50"
        }`}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          {isActive ? (
            <><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" /><path d="m3.3 7 8.7 5 8.7-5" /><path d="M12 22V12" /></>
          ) : (
            <><polyline points="17 1 21 5 17 9" /><path d="M3 11V9a4 4 0 0 1 4-4h14" /><polyline points="7 23 3 19 7 15" /><path d="M21 13v2a4 4 0 0 1-4 4H3" /></>
          )}
        </svg>
        {isActive ? "Archive album" : "Reopen album"}
      </button>

      {/* Confirm modal */}
      {confirm && (
        <div
          className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
          onClick={() => setConfirm(false)}
        >
          <div
            className="bg-surface-container-lowest rounded-2xl p-7 max-w-sm w-full shadow-2xl ring-1 ring-outline-variant/30"
            onClick={(e) => e.stopPropagation()}
          >
            <div className={`inline-flex items-center justify-center h-12 w-12 rounded-full mb-4 ${
              isActive ? "bg-red-50" : "bg-emerald-50"
            }`}>
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={isActive ? "#ef4444" : "#059669"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                {isActive ? (
                  <><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" /><path d="m3.3 7 8.7 5 8.7-5" /><path d="M12 22V12" /></>
                ) : (
                  <><polyline points="17 1 21 5 17 9" /><path d="M3 11V9a4 4 0 0 1 4-4h14" /><polyline points="7 23 3 19 7 15" /><path d="M21 13v2a4 4 0 0 1-4 4H3" /></>
                )}
              </svg>
            </div>

            <h3 className="font-noto-serif text-xl text-on-surface mb-2">
              {isActive ? "Archive this album?" : "Reopen this album?"}
            </h3>
            <p className="text-sm text-on-surface-variant leading-relaxed mb-6">
              {isActive
                ? "Guests will no longer be able to join or upload. You can reopen it at any time."
                : "Guests will be able to join and upload again based on the album's open and close dates."}
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setConfirm(false)}
                className="flex-1 rounded-xl border border-outline-variant/40 py-2.5 text-sm font-medium text-on-surface-variant hover:bg-surface-container transition"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                disabled={loading}
                className={`flex-1 rounded-xl py-2.5 text-sm font-semibold text-white transition disabled:opacity-60 ${
                  isActive ? "bg-red-500 hover:bg-red-600" : "bg-emerald-600 hover:bg-emerald-700"
                }`}
              >
                {loading
                  ? (isActive ? "Archiving…" : "Reopening…")
                  : (isActive ? "Archive" : "Reopen")}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
