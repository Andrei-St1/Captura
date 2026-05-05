"use client";

import Link from "next/link";

interface MediaItem {
  id: string;
  file_url: string;
  file_type: string;
  uploader_name: string | null;
  created_at: string;
}

interface Props {
  items: MediaItem[];
  totalCount: number;
  albumId: string;
  firstQR?: { dataUrl: string; joinUrl: string; label: string } | null;
}

function CopyButton({ url }: { url: string }) {
  async function handleCopy() {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        const ta = document.createElement("textarea");
        ta.value = url;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
    } catch {
      /* silently fail */
    }
  }
  return (
    <button
      onClick={handleCopy}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        padding: "8px 14px",
        borderRadius: "8px",
        background: "var(--ap-gold, oklch(44% 0.16 72))",
        color: "white",
        fontSize: "12px",
        fontWeight: 500,
        border: "none",
        cursor: "pointer",
        fontFamily: "var(--ap-sans, 'DM Sans', system-ui, sans-serif)",
      }}
    >
      <svg
        viewBox="0 0 16 16"
        width="12"
        height="12"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="3" y="3" width="9" height="9" rx="1" />
        <path d="M5 1h8a1 1 0 011 1v8" />
      </svg>
      Copy link
    </button>
  );
}

export function UploadsPreview({ items, totalCount, albumId, firstQR }: Props) {
  if (items.length === 0) {
    return (
      <div style={{ padding: "32px 24px" }}>
        {firstQR ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              textAlign: "center",
              gap: "24px",
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "12px" }}>
              <div
                style={{
                  borderRadius: "16px",
                  background: "white",
                  padding: "16px",
                  border: "1px solid var(--ap-border, oklch(86% 0.010 80))",
                  boxShadow: "0 4px 16px oklch(0% 0 0 / 0.06)",
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={firstQR.dataUrl} alt="QR code" width={160} height={160} />
              </div>
              <span
                style={{
                  fontSize: "10px",
                  letterSpacing: "0.16em",
                  textTransform: "uppercase",
                  color: "var(--ap-muted, oklch(46% 0.010 265))",
                  fontWeight: 500,
                }}
              >
                {firstQR.label}
              </span>
            </div>
            <div style={{ maxWidth: "280px" }}>
              <p
                style={{
                  fontFamily: "var(--ap-serif, 'Cormorant Garamond', Georgia, serif)",
                  fontSize: "22px",
                  fontWeight: 400,
                  color: "var(--ap-text, oklch(18% 0.015 265))",
                  lineHeight: 1.2,
                }}
              >
                Waiting for the first upload
              </p>
              <p
                style={{
                  fontSize: "13px",
                  color: "var(--ap-muted, oklch(46% 0.010 265))",
                  lineHeight: 1.6,
                  marginTop: "8px",
                }}
              >
                Print it, project it, or send the link — guests scan and upload straight from their phones.
              </p>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "8px" }}>
              <CopyButton url={firstQR.joinUrl} />
              <a
                href={firstQR.dataUrl}
                download="qr-code.png"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "8px 14px",
                  borderRadius: "8px",
                  border: "1px solid var(--ap-border, oklch(86% 0.010 80))",
                  background: "var(--ap-bg, oklch(97% 0.008 80))",
                  color: "var(--ap-text, oklch(18% 0.015 265))",
                  fontSize: "12px",
                  fontWeight: 500,
                  textDecoration: "none",
                  fontFamily: "var(--ap-sans, 'DM Sans', system-ui, sans-serif)",
                }}
              >
                <svg
                  viewBox="0 0 16 16"
                  width="12"
                  height="12"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M8 1v9M5 7l3 3 3-3M2 13h12" />
                </svg>
                Download QR
              </a>
            </div>
          </div>
        ) : (
          <div style={{ textAlign: "center", padding: "24px 0" }}>
            <svg
              viewBox="0 0 24 24"
              width="40"
              height="40"
              fill="none"
              stroke="var(--ap-border2, oklch(78% 0.010 80))"
              strokeWidth="1.4"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ display: "block", margin: "0 auto 12px" }}
            >
              <rect x="3" y="5" width="18" height="14" rx="2" />
              <circle cx="9" cy="11" r="2" />
              <path d="M3 17l5-5 4 4 3-3 6 6" />
            </svg>
            <p style={{ color: "var(--ap-muted, oklch(46% 0.010 265))", fontSize: "13px" }}>No uploads yet.</p>
            <p style={{ color: "var(--ap-muted2, oklch(58% 0.010 265))", fontSize: "12px", marginTop: "4px" }}>
              Create a QR code to start collecting photos from your guests.
            </p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: "10px",
          padding: "18px",
        }}
      >
        {items.slice(0, 4).map((item) => (
          <Link
            key={item.id}
            href={`/albums/${albumId}/gallery`}
            className="ap-thumb"
            style={{
              position: "relative",
              aspectRatio: "1/1",
              borderRadius: "12px",
              overflow: "hidden",
              background: "var(--ap-bg3, oklch(90% 0.012 80))",
              display: "block",
            }}
          >
            {item.file_type === "video" ? (
              <div
                style={{
                  position: "relative",
                  height: "100%",
                  width: "100%",
                  background: "#0f0f0f",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <video
                  src={item.file_url}
                  style={{ height: "100%", width: "100%", objectFit: "cover", opacity: 0.7 }}
                  muted
                  playsInline
                />
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <div
                    style={{
                      borderRadius: "50%",
                      background: "rgba(255,255,255,0.9)",
                      padding: "8px",
                      boxShadow: "0 2px 8px oklch(0% 0 0 / 0.2)",
                      display: "flex",
                    }}
                  >
                    <svg
                      viewBox="0 0 24 24"
                      width="14"
                      height="14"
                      fill="oklch(44% 0.16 72)"
                    >
                      <polygon points="5 3 19 12 5 21 5 3" />
                    </svg>
                  </div>
                </div>
              </div>
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={item.file_url}
                alt={item.uploader_name ?? "Upload"}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  transition: "transform 0.35s ease",
                  display: "block",
                }}
                className="ap-thumb-img"
              />
            )}
            <div className="ap-thumb-overlay">
              <div className="ap-thumb-meta">
                {item.uploader_name ?? "Guest"}
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div style={{ padding: "0 18px 18px" }}>
        <Link
          href={`/albums/${albumId}/gallery`}
          className="ap-view-all"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            marginTop: "0",
            padding: "14px",
            background: "var(--ap-bg, oklch(97% 0.008 80))",
            border: "1px solid var(--ap-border, oklch(86% 0.010 80))",
            borderRadius: "12px",
            fontSize: "13px",
            fontWeight: 500,
            color: "var(--ap-text, oklch(18% 0.015 265))",
            textDecoration: "none",
          }}
        >
          <svg
            viewBox="0 0 16 16"
            width="14"
            height="14"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="2" y="3" width="12" height="10" rx="2" />
            <circle cx="6" cy="7" r="1" />
            <path d="M2 11l3-3 3 3 2-2 4 4" />
          </svg>
          View all {totalCount} {totalCount === 1 ? "file" : "files"}
          <svg
            viewBox="0 0 16 16"
            width="14"
            height="14"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M6 4l4 4-4 4" />
          </svg>
        </Link>
      </div>
    </div>
  );
}
