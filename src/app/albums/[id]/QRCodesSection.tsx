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

export function QRCodesSection({ albumId, qrCodes }: Props) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [copied, setCopied] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(
    qrCodes[0]?.id ?? null
  );

  // Sync expandedId when new QR codes arrive after refresh
  useEffect(() => {
    setExpandedId((prev) => {
      const stillExists = qrCodes.some((q) => q.id === prev);
      return stillExists ? prev : (qrCodes[0]?.id ?? null);
    });
  }, [qrCodes]);

  async function handleAdd() {
    setLoadingId("new");
    await createQRCode(albumId, newLabel);
    setNewLabel("");
    setAdding(false);
    setLoadingId(null);
    router.refresh();
  }

  async function handleToggle(qr: QRItem) {
    setLoadingId(qr.id);
    await toggleQRCode(qr.id, albumId);
    setLoadingId(null);
    router.refresh();
  }

  async function handleRegenerate(qrId: string) {
    setLoadingId(qrId);
    await regenerateQRToken(qrId, albumId);
    setLoadingId(null);
    router.refresh();
  }

  async function handleDelete(qrId: string) {
    setLoadingId(qrId);
    await deleteQRCode(qrId, albumId);
    setLoadingId(null);
    setConfirmDelete(null);
    router.refresh();
  }

  async function handleLabelSave(qrId: string) {
    setLoadingId(qrId);
    await updateQRLabel(qrId, albumId, editLabel);
    setEditingId(null);
    setLoadingId(null);
    router.refresh();
  }

  async function handleCopy(url: string, id: string) {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        // Fallback for HTTP / older mobile browsers
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
      setCopied(id);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      // If all else fails, at least don't crash
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="bg-surface-container-low px-6 py-4 border-b border-outline-variant/20 flex items-center justify-between">
        <h2 className="font-noto-serif text-lg font-light text-on-surface">QR Codes</h2>
        <button
          onClick={() => setAdding(true)}
          className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary/90 transition"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" x2="12" y1="5" y2="19" /><line x1="5" x2="19" y1="12" y2="12" />
          </svg>
          Add QR code
        </button>
      </div>

      <div className="p-4 space-y-3">

        {/* Add form */}
        {adding && (
          <div className="rounded-xl bg-surface-container-low border border-outline-variant/20 p-4 flex items-center gap-3">
            <input
              autoFocus
              type="text"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              placeholder="Label (e.g. Ceremony guests)"
              className="flex-1 rounded-lg border border-outline-variant/40 bg-surface px-3 py-2 text-sm text-on-surface placeholder-outline focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20"
              onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); if (e.key === "Escape") setAdding(false); }}
            />
            <button onClick={handleAdd} disabled={loadingId === "new"}
              className="rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-white hover:bg-primary/90 transition disabled:opacity-60">
              {loadingId === "new" ? "Creating…" : "Create"}
            </button>
            <button onClick={() => setAdding(false)} className="text-outline hover:text-on-surface-variant transition">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" x2="6" y1="6" y2="18" /><line x1="6" x2="18" y1="6" y2="18" />
              </svg>
            </button>
          </div>
        )}

        {qrCodes.length === 0 && !adding ? (
          <div className="py-10 text-center">
            <span className="material-symbols-outlined text-outline-variant block mb-3" style={{ fontSize: "40px" }}>qr_code_2</span>
            <p className="text-sm text-on-surface-variant">No QR codes yet.</p>
            <button onClick={() => setAdding(true)} className="mt-3 text-sm font-medium text-primary hover:underline">
              Create your first QR code →
            </button>
          </div>
        ) : (
          qrCodes.map((qr) => (
            <div key={qr.id} className={`rounded-xl border overflow-hidden transition-all ${
              qr.enabled ? "border-outline-variant/30" : "border-outline-variant/15 opacity-60"
            }`}>
              {/* QR header row */}
              <div
                className="flex items-center gap-3 px-4 py-3 bg-surface-container-lowest cursor-pointer"
                onClick={() => setExpandedId(expandedId === qr.id ? null : qr.id)}
              >
                {/* Status dot */}
                <span className={`h-2 w-2 shrink-0 rounded-full ${qr.enabled ? "bg-emerald-400" : "bg-outline-variant"}`} />

                {/* Label */}
                {editingId === qr.id ? (
                  <input
                    autoFocus
                    value={editLabel}
                    onChange={(e) => setEditLabel(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => { if (e.key === "Enter") handleLabelSave(qr.id); if (e.key === "Escape") setEditingId(null); }}
                    className="flex-1 rounded-lg border border-outline-variant/40 bg-surface px-2 py-1 text-sm text-on-surface focus:border-primary focus:outline-none"
                  />
                ) : (
                  <span className="flex-1 text-sm font-medium text-on-surface truncate">{qr.label}</span>
                )}

                {/* Token */}
                <span className="hidden sm:block text-xs font-mono text-outline truncate max-w-[80px]">{qr.token}</span>

                {/* Actions */}
                <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                  {/* Edit label */}
                  {editingId === qr.id ? (
                    <button onClick={() => handleLabelSave(qr.id)}
                      className="rounded-lg bg-primary px-2 py-1 text-xs text-white hover:bg-primary/90 transition">
                      Save
                    </button>
                  ) : (
                    <button onClick={() => { setEditingId(qr.id); setEditLabel(qr.label); }}
                      className="rounded-lg p-1.5 text-outline hover:text-on-surface-variant hover:bg-surface-container transition">
                      <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                      </svg>
                    </button>
                  )}

                  {/* Toggle */}
                  <button
                    onClick={() => handleToggle(qr)}
                    disabled={loadingId === qr.id}
                    className={`relative h-5 w-9 rounded-full transition-colors disabled:opacity-50 ${qr.enabled ? "bg-primary" : "bg-outline-variant/40"}`}
                    title={qr.enabled ? "Disable" : "Enable"}
                  >
                    <span className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${qr.enabled ? "translate-x-4" : "translate-x-0"}`} />
                  </button>

                  {/* Delete */}
                  <button onClick={() => setConfirmDelete(qr.id)}
                    className="rounded-lg p-1.5 text-outline hover:text-red-500 hover:bg-red-50 transition">
                    <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                    </svg>
                  </button>

                  {/* Expand chevron */}
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                    className={`text-outline transition-transform ${expandedId === qr.id ? "rotate-180" : ""}`}>
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </div>
              </div>

              {/* Expanded panel */}
              {expandedId === qr.id && (
                <div className="border-t border-outline-variant/10 bg-surface-container-low/50 p-4 flex flex-col sm:flex-row items-center gap-5">
                  {/* QR image */}
                  <div className="rounded-xl bg-white p-3 shadow-sm ring-1 ring-outline-variant/20 shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={qr.dataUrl} alt={`QR: ${qr.label}`} width={140} height={140} />
                  </div>

                  <div className="flex-1 w-full space-y-3">
                    {/* Join URL */}
                    <div>
                      <p className="text-[10px] uppercase tracking-widest text-on-surface-variant mb-1">Guest join link</p>
                      <p className="text-xs font-mono text-primary break-all bg-surface-container rounded-lg px-3 py-2">
                        {qr.joinUrl}
                      </p>
                    </div>

                    {/* Buttons */}
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => handleCopy(qr.joinUrl, qr.id)}
                        className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-white hover:bg-primary/90 transition"
                      >
                        {copied === qr.id ? (
                          <><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg> Copied!</>
                        ) : (
                          <><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2" /><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" /></svg> Copy link</>
                        )}
                      </button>

                      <a
                        href={qr.dataUrl}
                        download={`${qr.label}-qr.png`}
                        className="flex items-center gap-1.5 rounded-lg border border-outline-variant/40 px-3 py-2 text-xs font-medium text-on-surface-variant hover:border-primary hover:text-primary transition"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" x2="12" y1="15" y2="3" />
                        </svg>
                        Download
                      </a>

                      <button
                        onClick={() => handleRegenerate(qr.id)}
                        disabled={loadingId === qr.id}
                        className="flex items-center gap-1.5 rounded-lg border border-outline-variant/40 px-3 py-2 text-xs font-medium text-on-surface-variant hover:border-amber-400 hover:text-amber-600 transition disabled:opacity-50"
                        title="Generate a new token — old QR code will stop working"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="17 1 21 5 17 9" /><path d="M3 11V9a4 4 0 0 1 4-4h14" /><polyline points="7 23 3 19 7 15" /><path d="M21 13v2a4 4 0 0 1-4 4H3" />
                        </svg>
                        {loadingId === qr.id ? "Regenerating…" : "Regenerate"}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Confirm delete modal */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setConfirmDelete(null)}>
          <div className="bg-surface-container-lowest rounded-2xl p-6 max-w-sm w-full shadow-2xl ring-1 ring-outline-variant/30" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-noto-serif text-xl text-on-surface mb-2">Delete QR code?</h3>
            <p className="text-sm text-on-surface-variant mb-6">
              Anyone with this QR code will no longer be able to join the album. This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(null)}
                className="flex-1 rounded-xl border border-outline-variant/40 py-2.5 text-sm font-medium text-on-surface-variant hover:bg-surface-container transition">
                Cancel
              </button>
              <button onClick={() => handleDelete(confirmDelete!)} disabled={loadingId === confirmDelete}
                className="flex-1 rounded-xl bg-red-500 py-2.5 text-sm font-semibold text-white hover:bg-red-600 transition disabled:opacity-60">
                {loadingId === confirmDelete ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
