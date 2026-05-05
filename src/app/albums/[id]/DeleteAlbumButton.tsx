"use client";

import { useState } from "react";
import { deleteAlbum } from "@/app/albums/actions";

export function DeleteAlbumButton({
  albumId,
  albumTitle,
}: {
  albumId: string;
  albumTitle: string;
}) {
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
        className="ap-btn ap-btn-danger"
      >
        <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path d="M3 6h18" />
          <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
          <path d="M10 11v6M14 11v6" />
          <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" />
        </svg>
        Delete album
      </button>

      {confirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "oklch(0% 0 0 / 0.45)" }}
          onClick={() => !loading && setConfirm(false)}
        >
          <div
            className="rounded-2xl p-7 max-w-sm w-full shadow-2xl"
            style={{
              background: "var(--ap-bg, oklch(97% 0.008 80))",
              border: "1px solid var(--ap-border, oklch(86% 0.010 80))",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="inline-flex items-center justify-center h-12 w-12 rounded-full mb-4"
              style={{ background: "oklch(52% 0.20 25 / 0.08)" }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="oklch(52% 0.20 25)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M3 6h18" />
                <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
                <path d="M10 11v6M14 11v6" />
                <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" />
              </svg>
            </div>

            <h3
              style={{
                fontFamily: "var(--ap-serif, 'Cormorant Garamond', Georgia, serif)",
                fontSize: "22px",
                fontWeight: 400,
                color: "var(--ap-text, oklch(18% 0.015 265))",
                marginBottom: "8px",
              }}
            >
              Delete &ldquo;{albumTitle}&rdquo;?
            </h3>
            <p
              style={{
                fontSize: "13px",
                color: "var(--ap-muted, oklch(46% 0.010 265))",
                lineHeight: 1.6,
                marginBottom: "4px",
              }}
            >
              This will permanently delete:
            </p>
            <ul
              style={{
                fontSize: "13px",
                color: "var(--ap-muted, oklch(46% 0.010 265))",
                listStyleType: "disc",
                paddingLeft: "18px",
                marginBottom: "16px",
                lineHeight: 1.7,
              }}
            >
              <li>All uploaded photos and videos</li>
              <li>All QR codes for this album</li>
              <li>The cover photo</li>
              <li>All album settings</li>
            </ul>
            <p
              style={{
                fontSize: "13px",
                fontWeight: 600,
                color: "oklch(52% 0.20 25)",
                marginBottom: "24px",
              }}
            >
              This cannot be undone.
            </p>

            <div style={{ display: "flex", gap: "10px" }}>
              <button
                onClick={() => setConfirm(false)}
                disabled={loading}
                style={{
                  flex: 1,
                  borderRadius: "8px",
                  border: "1px solid var(--ap-border, oklch(86% 0.010 80))",
                  padding: "10px 16px",
                  fontSize: "12px",
                  fontWeight: 500,
                  color: "var(--ap-muted, oklch(46% 0.010 265))",
                  background: "var(--ap-bg, oklch(97% 0.008 80))",
                  cursor: loading ? "not-allowed" : "pointer",
                  opacity: loading ? 0.5 : 1,
                  fontFamily: "var(--ap-sans, 'DM Sans', system-ui, sans-serif)",
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={loading}
                style={{
                  flex: 1,
                  borderRadius: "8px",
                  border: "1px solid transparent",
                  padding: "10px 16px",
                  fontSize: "12px",
                  fontWeight: 500,
                  color: "white",
                  background: "oklch(52% 0.20 25)",
                  cursor: loading ? "not-allowed" : "pointer",
                  opacity: loading ? 0.6 : 1,
                  fontFamily: "var(--ap-sans, 'DM Sans', system-ui, sans-serif)",
                }}
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
