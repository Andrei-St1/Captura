"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  createQRCode,
  toggleQRCode,
  regenerateQRToken,
  deleteQRCode,
  updateQRLabel,
} from "@/app/albums/qr-actions";

interface QRItem {
  id: string;
  token: string;
  label: string;
  enabled: boolean;
  expires_at: string | null;
  created_at: string;
  dataUrl: string;
  joinUrl: string;
}

interface Props {
  albumId: string;
  qrCodes: QRItem[];
}

// Inline style helpers using --ap-* CSS vars from the album page
const S = {
  gold:      "oklch(44% 0.16 72)",
  goldDim:   "oklch(36% 0.13 72)",
  goldGlow:  "oklch(44% 0.16 72 / 0.10)",
  goldB:     "oklch(44% 0.16 72 / 0.22)",
  bg:        "oklch(97% 0.008 80)",
  bg2:       "oklch(94% 0.010 80)",
  bg3:       "oklch(90% 0.012 80)",
  border:    "oklch(86% 0.010 80)",
  border2:   "oklch(78% 0.010 80)",
  text:      "oklch(18% 0.015 265)",
  muted:     "oklch(46% 0.010 265)",
  muted2:    "oklch(58% 0.010 265)",
  green:     "oklch(54% 0.14 155)",
  red:       "oklch(52% 0.20 25)",
  redBg:     "oklch(52% 0.20 25 / 0.08)",
  redB:      "oklch(52% 0.20 25 / 0.25)",
} as const;

export function QRCodesSection({ albumId, qrCodes }: Props) {
  const router = useRouter();
  const [adding, setAdding]           = useState(false);
  const [newLabel, setNewLabel]       = useState("");
  const [loadingId, setLoadingId]     = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [editingId, setEditingId]     = useState<string | null>(null);
  const [editLabel, setEditLabel]     = useState("");
  const [copied, setCopied]           = useState<string | null>(null);
  const [expandedId, setExpandedId]   = useState<string | null>(qrCodes[0]?.id ?? null);

  useEffect(() => {
    setExpandedId((prev) => {
      const stillExists = qrCodes.some((q) => q.id === prev);
      return stillExists ? prev : (qrCodes[0]?.id ?? null);
    });
  }, [qrCodes]);

  async function handleAdd() {
    setLoadingId("new");
    await createQRCode(albumId, newLabel);
    setNewLabel(""); setAdding(false); setLoadingId(null);
    router.refresh();
  }

  async function handleToggle(qr: QRItem) {
    setLoadingId(qr.id);
    await toggleQRCode(qr.id, albumId);
    setLoadingId(null); router.refresh();
  }

  async function handleRegenerate(qrId: string) {
    setLoadingId(qrId);
    await regenerateQRToken(qrId, albumId);
    setLoadingId(null); router.refresh();
  }

  async function handleDelete(qrId: string) {
    setLoadingId(qrId);
    await deleteQRCode(qrId, albumId);
    setLoadingId(null); setConfirmDelete(null); router.refresh();
  }

  async function handleLabelSave(qrId: string) {
    setLoadingId(qrId);
    await updateQRLabel(qrId, albumId, editLabel);
    setEditingId(null); setLoadingId(null); router.refresh();
  }

  async function handleCopy(url: string, id: string) {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        const ta = document.createElement("textarea");
        ta.value = url; ta.style.position = "fixed"; ta.style.opacity = "0";
        document.body.appendChild(ta); ta.focus(); ta.select();
        document.execCommand("copy"); document.body.removeChild(ta);
      }
      setCopied(id);
      setTimeout(() => setCopied(null), 2000);
    } catch { /* silently fail */ }
  }

  return (
    <div style={{ fontFamily: "var(--ap-sans, 'DM Sans', system-ui, sans-serif)", color: S.text }}>

      {/* ── Header ── */}
      <div style={{
        background: S.bg2,
        borderBottom: `1px solid ${S.border}`,
        padding: "16px 22px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <h2 style={{ fontFamily: "var(--ap-serif, 'Cormorant Garamond', Georgia, serif)", fontSize: 20, fontWeight: 400, color: S.text }}>
          QR codes
        </h2>
        <button
          onClick={() => setAdding(true)}
          style={{ background: S.gold, color: "white", border: "none", borderRadius: 7, padding: "7px 12px", fontSize: 11, fontWeight: 500, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6, fontFamily: "inherit" }}
        >
          <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M8 3v10M3 8h10" />
          </svg>
          Add QR code
        </button>
      </div>

      <div style={{ padding: "14px 14px", display: "flex", flexDirection: "column", gap: 10 }}>

        {/* ── Add form ── */}
        {adding && (
          <div style={{ border: `1px solid ${S.border}`, borderRadius: 10, padding: "12px 14px", display: "flex", alignItems: "center", gap: 10, background: S.bg }}>
            <input
              autoFocus
              type="text"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              placeholder="Label (e.g. Ceremony guests)"
              onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); if (e.key === "Escape") setAdding(false); }}
              style={{ flex: 1, border: `1px solid ${S.border}`, borderRadius: 7, padding: "8px 10px", fontSize: 13, color: S.text, background: S.bg2, outline: "none", fontFamily: "inherit" }}
            />
            <button onClick={handleAdd} disabled={loadingId === "new"}
              style={{ background: S.gold, color: "white", border: "none", borderRadius: 7, padding: "7px 14px", fontSize: 11, fontWeight: 500, cursor: "pointer", opacity: loadingId === "new" ? 0.6 : 1, fontFamily: "inherit" }}>
              {loadingId === "new" ? "Creating…" : "Create"}
            </button>
            <button onClick={() => setAdding(false)} style={{ background: "none", border: "none", cursor: "pointer", color: S.muted, display: "flex", padding: 4 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="18" x2="6" y1="6" y2="18" /><line x1="6" x2="18" y1="6" y2="18" />
              </svg>
            </button>
          </div>
        )}

        {/* ── Empty state ── */}
        {qrCodes.length === 0 && !adding && (
          <div style={{ padding: "40px 20px", textAlign: "center" }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke={S.muted2} strokeWidth="1.4" strokeLinecap="round" style={{ margin: "0 auto 12px" }}>
              <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" />
              <path d="M14 14h2v2h-2zM17 14h4M14 17h3M17 17v4" />
            </svg>
            <p style={{ fontSize: 13, color: S.muted }}>No QR codes yet.</p>
            <button onClick={() => setAdding(true)} style={{ marginTop: 10, fontSize: 12, color: S.gold, background: "none", border: "none", cursor: "pointer", fontFamily: "inherit" }}>
              Create your first QR code →
            </button>
          </div>
        )}

        {/* ── QR list ── */}
        {qrCodes.map((qr) => (
          <div key={qr.id} style={{
            border: `1px solid ${qr.enabled ? S.border : S.border}`,
            borderRadius: 12,
            overflow: "hidden",
            opacity: qr.enabled ? 1 : 0.6,
            background: S.bg,
          }}>
            {/* Row header */}
            <div
              style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", cursor: "pointer", background: S.bg }}
              onClick={() => setExpandedId(expandedId === qr.id ? null : qr.id)}
            >
              {/* Status dot */}
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: qr.enabled ? S.green : S.muted2, flexShrink: 0 }} />

              {/* Label / edit input */}
              {editingId === qr.id ? (
                <input
                  autoFocus
                  value={editLabel}
                  onChange={(e) => setEditLabel(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => { if (e.key === "Enter") handleLabelSave(qr.id); if (e.key === "Escape") setEditingId(null); }}
                  style={{ flex: 1, border: `1px solid ${S.border2}`, borderRadius: 6, padding: "4px 8px", fontSize: 13, color: S.text, background: S.bg2, outline: "none", fontFamily: "inherit" }}
                />
              ) : (
                <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: S.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{qr.label}</span>
              )}

              {/* Token */}
              <span style={{ fontSize: 11, fontFamily: "ui-monospace, Consolas, monospace", color: S.muted2, letterSpacing: "0.02em", maxWidth: 80, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{qr.token}</span>

              {/* Actions */}
              <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
                {editingId === qr.id ? (
                  <button onClick={() => handleLabelSave(qr.id)}
                    style={{ background: S.gold, color: "white", border: "none", borderRadius: 6, padding: "4px 10px", fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}>
                    Save
                  </button>
                ) : (
                  <button onClick={() => { setEditingId(qr.id); setEditLabel(qr.label); }}
                    style={{ background: "none", border: "none", cursor: "pointer", color: S.muted2, padding: 5, borderRadius: 6, display: "flex" }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                    </svg>
                  </button>
                )}

                {/* Toggle */}
                <button
                  onClick={() => handleToggle(qr)}
                  disabled={loadingId === qr.id}
                  title={qr.enabled ? "Disable" : "Enable"}
                  style={{
                    position: "relative", width: 32, height: 18, borderRadius: 100,
                    background: qr.enabled ? S.gold : S.bg3,
                    border: `1px solid ${qr.enabled ? S.gold : S.border}`,
                    cursor: "pointer", flexShrink: 0, opacity: loadingId === qr.id ? 0.5 : 1, transition: "background .2s",
                  }}
                >
                  <span style={{
                    position: "absolute", top: 1, left: 1, width: 14, height: 14,
                    borderRadius: "50%", background: "white", transition: "transform .2s",
                    transform: qr.enabled ? "translateX(14px)" : "translateX(0)",
                    boxShadow: "0 1px 2px oklch(0% 0 0 / 0.15)",
                    display: "block",
                  }} />
                </button>

                {/* Delete */}
                <button onClick={() => setConfirmDelete(qr.id)}
                  style={{ background: "none", border: "none", cursor: "pointer", color: S.muted2, padding: 5, borderRadius: 6, display: "flex" }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                  </svg>
                </button>

                {/* Chevron */}
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={S.muted2} strokeWidth="2" strokeLinecap="round"
                  style={{ transition: "transform .2s", transform: expandedId === qr.id ? "rotate(180deg)" : "none", flexShrink: 0 }}>
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </div>
            </div>

            {/* Expanded body */}
            {expandedId === qr.id && (
              <div style={{ borderTop: `1px solid ${S.border}`, background: S.bg2, padding: "16px 16px 18px", display: "flex", flexDirection: "row", flexWrap: "wrap", gap: 18, alignItems: "flex-start" }}>
                {/* QR image */}
                <div style={{ background: "white", border: `1px solid ${S.border}`, borderRadius: 10, padding: 8, flexShrink: 0 }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={qr.dataUrl} alt={`QR: ${qr.label}`} width={130} height={130} />
                </div>

                {/* Right side */}
                <div style={{ flex: 1, minWidth: 140, display: "flex", flexDirection: "column", gap: 10 }}>
                  <div>
                    <p style={{ fontSize: 9, letterSpacing: "0.16em", textTransform: "uppercase", color: S.muted, fontWeight: 500, marginBottom: 6 }}>
                      Guest join link
                    </p>
                    <p style={{ fontSize: 11, fontFamily: "ui-monospace, Consolas, monospace", color: S.text, background: S.bg, border: `1px solid ${S.border}`, borderRadius: 7, padding: "8px 10px", wordBreak: "break-all", lineHeight: 1.4 }}>
                      {qr.joinUrl}
                    </p>
                  </div>

                  {/* Action buttons */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <button
                      onClick={() => handleCopy(qr.joinUrl, qr.id)}
                      style={{ background: S.gold, color: "white", border: "none", borderRadius: 7, padding: "7px 10px", fontSize: 11, fontWeight: 500, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, fontFamily: "inherit" }}
                    >
                      {copied === qr.id ? (
                        <><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg> Copied!</>
                      ) : (
                        <><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect width="14" height="14" x="8" y="8" rx="2" /><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" /></svg> Copy link</>
                      )}
                    </button>

                    <a
                      href={qr.dataUrl}
                      download={`${qr.label}-qr.png`}
                      style={{ border: `1px solid ${S.border}`, background: S.bg, borderRadius: 7, padding: "7px 10px", fontSize: 11, fontWeight: 500, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, color: S.text, textDecoration: "none", fontFamily: "inherit" }}
                    >
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" x2="12" y1="15" y2="3" />
                      </svg>
                      Download
                    </a>

                    <button
                      onClick={() => handleRegenerate(qr.id)}
                      disabled={loadingId === qr.id}
                      style={{ border: `1px solid ${S.border}`, background: S.bg, borderRadius: 7, padding: "7px 10px", fontSize: 11, fontWeight: 500, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, color: S.text, opacity: loadingId === qr.id ? 0.5 : 1, fontFamily: "inherit" }}
                    >
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <polyline points="17 1 21 5 17 9" /><path d="M3 11V9a4 4 0 0 1 4-4h14" /><polyline points="7 23 3 19 7 15" /><path d="M21 13v2a4 4 0 0 1-4 4H3" />
                      </svg>
                      {loadingId === qr.id ? "Regenerating…" : "Regenerate"}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* ── Confirm delete modal ── */}
      {confirmDelete && (
        <div
          style={{ position: "fixed", inset: 0, zIndex: 200, background: "oklch(0% 0 0 / 0.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
          onClick={() => setConfirmDelete(null)}
        >
          <div
            style={{ background: S.bg, border: `1px solid ${S.border}`, borderRadius: 18, padding: 24, maxWidth: 380, width: "100%", boxShadow: "0 24px 80px oklch(0% 0 0 / 0.25)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ fontFamily: "var(--ap-serif, 'Cormorant Garamond', Georgia, serif)", fontSize: 22, fontWeight: 400, color: S.text, marginBottom: 8 }}>Delete QR code?</h3>
            <p style={{ fontSize: 13, color: S.muted, lineHeight: 1.6, marginBottom: 22 }}>
              Anyone with this QR code will no longer be able to join the album. This cannot be undone.
            </p>
            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={() => setConfirmDelete(null)}
                style={{ flex: 1, border: `1px solid ${S.border}`, background: S.bg, borderRadius: 8, padding: "10px 0", fontSize: 13, fontWeight: 500, color: S.muted, cursor: "pointer", fontFamily: "inherit" }}
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(confirmDelete!)}
                disabled={loadingId === confirmDelete}
                style={{ flex: 1, background: S.red, border: "none", borderRadius: 8, padding: "10px 0", fontSize: 13, fontWeight: 600, color: "white", cursor: "pointer", opacity: loadingId === confirmDelete ? 0.6 : 1, fontFamily: "inherit" }}
              >
                {loadingId === confirmDelete ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
