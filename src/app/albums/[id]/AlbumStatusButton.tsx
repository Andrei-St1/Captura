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
        className="ap-btn ap-btn-ghost"
      >
        <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          {isActive ? (
            <>
              <rect x="2" y="3" width="20" height="4" rx="1" />
              <path d="M3 7v12a1 1 0 001 1h16a1 1 0 001-1V7M10 12h4" />
            </>
          ) : (
            <>
              <polyline points="17 1 21 5 17 9" />
              <path d="M3 11V9a4 4 0 014-4h14" />
              <polyline points="7 23 3 19 7 15" />
              <path d="M21 13v2a4 4 0 01-4 4H3" />
            </>
          )}
        </svg>
        {isActive ? "Archive album" : "Reopen album"}
      </button>

      {/* Confirm modal */}
      {confirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "oklch(0% 0 0 / 0.45)" }}
          onClick={() => setConfirm(false)}
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
              style={{
                background: isActive
                  ? "oklch(52% 0.20 25 / 0.08)"
                  : "oklch(54% 0.14 155 / 0.10)",
              }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke={isActive ? "oklch(52% 0.20 25)" : "oklch(54% 0.14 155)"}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                {isActive ? (
                  <>
                    <rect x="2" y="3" width="20" height="4" rx="1" />
                    <path d="M3 7v12a1 1 0 001 1h16a1 1 0 001-1V7M10 12h4" />
                  </>
                ) : (
                  <>
                    <polyline points="17 1 21 5 17 9" />
                    <path d="M3 11V9a4 4 0 014-4h14" />
                    <polyline points="7 23 3 19 7 15" />
                    <path d="M21 13v2a4 4 0 01-4 4H3" />
                  </>
                )}
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
              {isActive ? "Archive this album?" : "Reopen this album?"}
            </h3>
            <p
              style={{
                fontSize: "13px",
                color: "var(--ap-muted, oklch(46% 0.010 265))",
                lineHeight: 1.6,
                marginBottom: "24px",
              }}
            >
              {isActive
                ? "Guests will no longer be able to join or upload. You can reopen it at any time."
                : "Guests will be able to join and upload again based on the album's open and close dates."}
            </p>

            <div style={{ display: "flex", gap: "10px" }}>
              <button
                onClick={() => setConfirm(false)}
                style={{
                  flex: 1,
                  borderRadius: "8px",
                  border: "1px solid var(--ap-border, oklch(86% 0.010 80))",
                  padding: "10px 16px",
                  fontSize: "12px",
                  fontWeight: 500,
                  color: "var(--ap-muted, oklch(46% 0.010 265))",
                  background: "var(--ap-bg, oklch(97% 0.008 80))",
                  cursor: "pointer",
                  fontFamily: "var(--ap-sans, 'DM Sans', system-ui, sans-serif)",
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                disabled={loading}
                style={{
                  flex: 1,
                  borderRadius: "8px",
                  border: "1px solid transparent",
                  padding: "10px 16px",
                  fontSize: "12px",
                  fontWeight: 500,
                  color: "white",
                  background: isActive ? "oklch(52% 0.20 25)" : "oklch(54% 0.14 155)",
                  cursor: loading ? "not-allowed" : "pointer",
                  opacity: loading ? 0.6 : 1,
                  fontFamily: "var(--ap-sans, 'DM Sans', system-ui, sans-serif)",
                }}
              >
                {loading
                  ? isActive
                    ? "Archiving…"
                    : "Reopening…"
                  : isActive
                  ? "Archive"
                  : "Reopen"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
