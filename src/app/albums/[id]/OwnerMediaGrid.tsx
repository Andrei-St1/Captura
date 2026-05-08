"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { VideoThumb } from "@/components/VideoThumb";
import { deleteMedia, deleteMediaBulk } from "@/app/albums/actions";

/* ─── CopyButton ─────────────────────────────────────────────────────────── */
function CopyButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  async function handleCopy() {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        const ta = document.createElement("textarea");
        ta.value = url; ta.style.position = "fixed"; ta.style.opacity = "0";
        document.body.appendChild(ta); ta.focus(); ta.select();
        document.execCommand("copy"); document.body.removeChild(ta);
      }
      setCopied(true); setTimeout(() => setCopied(false), 2000);
    } catch { /* silently fail */ }
  }
  return (
    <button onClick={handleCopy} style={{
      display: "inline-flex", alignItems: "center", gap: "6px",
      padding: "8px 16px", borderRadius: "10px",
      background: "oklch(44% 0.16 72)", color: "#fff",
      fontSize: "12px", fontWeight: 600,
      fontFamily: "var(--sans, 'DM Sans', system-ui, sans-serif)",
      border: "none", cursor: "pointer",
      transition: "opacity .15s",
    }} onMouseOver={e => (e.currentTarget.style.opacity = ".85")}
       onMouseOut={e  => (e.currentTarget.style.opacity = "1")}>
      {copied ? (
        <><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg> Copied!</>
      ) : (
        <><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2" /><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" /></svg> Copy link</>
      )}
    </button>
  );
}

/* ─── Types ──────────────────────────────────────────────────────────────── */
interface MediaItem {
  id: string;
  file_url: string;
  file_type: string;
  file_size: number;
  mime_type: string | null;
  uploader_name: string | null;
  created_at: string;
}

interface Props {
  items: MediaItem[];
  albumId: string;
  albumTitle: string;
  firstQR?: { dataUrl: string; joinUrl: string; label: string } | null;
  page?: number;
  totalPages?: number;
}

/* ─── Face-filter types & constants ─────────────────────────────────────── */
const CLUSTER_THRESHOLD = 1.1;
const MIN_CLUSTER_SIZE = 2;

interface FaceRecord {
  id: string;
  mediaId: string;
  descriptor: number[];
  box: { x: number; y: number; w: number; h: number };
}

interface FaceCluster {
  id: string;
  mediaIds: string[];
  representative: FaceRecord;
  centroid: number[];
}

/* ─── Face-filter helpers ────────────────────────────────────────────────── */
function euclidean(a: number[], b: number[]): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += (a[i] - b[i]) ** 2;
  return Math.sqrt(s);
}

function clusterFaces(faces: FaceRecord[]): FaceCluster[] {
  const clusters: FaceCluster[] = [];
  for (const face of faces) {
    let best: FaceCluster | null = null;
    let bestDist = CLUSTER_THRESHOLD;
    for (const c of clusters) {
      const d = euclidean(face.descriptor, c.centroid);
      if (d < bestDist) { bestDist = d; best = c; }
    }
    if (best) {
      best.mediaIds.push(face.mediaId);
      const n = best.mediaIds.length;
      best.centroid = best.centroid.map((v, i) => v + (face.descriptor[i] - v) / n);
    } else {
      clusters.push({
        id: crypto.randomUUID(),
        mediaIds: [face.mediaId],
        representative: face,
        centroid: [...face.descriptor],
      });
    }
  }
  return clusters.sort((a, b) => b.mediaIds.length - a.mediaIds.length);
}

async function loadImg(url: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url + (url.includes("?") ? "&" : "?") + "_cb=" + Date.now();
  });
}

async function cropToDataUrl(
  url: string,
  box: { x: number; y: number; w: number; h: number }
): Promise<string | null> {
  const img = await loadImg(url);
  if (!img) return null;
  const size = 72;
  const canvas = document.createElement("canvas");
  canvas.width = size; canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  const iw = img.naturalWidth, ih = img.naturalHeight;
  const faceSize = Math.max(box.w * iw, box.h * ih);
  const cx = (box.x + box.w / 2) * iw;
  const cy = (box.y + box.h / 2) * ih - faceSize * 0.15;
  const half = faceSize * 1.05;
  const sx = Math.max(0, Math.min(iw - half * 2, cx - half));
  const sy = Math.max(0, Math.min(ih - half * 2, cy - half));
  const side = Math.min(half * 2, iw - sx, ih - sy);
  ctx.drawImage(img, sx, sy, side, side, 0, 0, size, size);
  return canvas.toDataURL("image/jpeg", 0.9);
}

/* ─── Time-ago helper ────────────────────────────────────────────────────── */
function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

/* ─── Panel CSS ──────────────────────────────────────────────────────────── */
const panelCss = `
:root {
  --og-bg:       oklch(97% 0.008 80);
  --og-bg2:      oklch(94% 0.010 80);
  --og-bg3:      oklch(90% 0.012 80);
  --og-border:   oklch(86% 0.010 80);
  --og-border2:  oklch(78% 0.010 80);
  --og-text:     oklch(18% 0.015 265);
  --og-muted:    oklch(46% 0.010 265);
  --og-muted2:   oklch(58% 0.010 265);
  --og-gold:     oklch(44% 0.16 72);
  --og-gold-dim: oklch(36% 0.13 72);
  --og-gold-glow:oklch(44% 0.16 72 / 0.10);
  --og-gold-b:   oklch(44% 0.16 72 / 0.22);
  --og-red:      oklch(52% 0.20 25);
}

.og-panel {
  background: var(--og-bg);
  border: 1px solid var(--og-border);
  border-radius: 18px;
  overflow: hidden;
}

/* ── toolbar ── */
.og-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 22px;
  border-bottom: 1px solid var(--og-border);
  gap: 12px;
  flex-wrap: wrap;
}
.og-toolbar-left {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  flex: 1;
}
.og-toolbar-right {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--og-muted);
  font-size: 12px;
  font-weight: 500;
  white-space: nowrap;
}

/* ── face button ── */
.og-face-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 9px 14px;
  border-radius: 9px;
  border: 1px solid var(--og-border);
  background: var(--og-bg);
  font-size: 12px;
  font-weight: 500;
  color: var(--og-text);
  cursor: pointer;
  transition: border-color .2s, background .2s;
}
.og-face-btn:hover {
  border-color: var(--og-gold-b);
  background: var(--og-gold-glow);
}
.og-face-btn.active {
  border-color: var(--og-gold);
  background: var(--og-gold-glow);
  color: var(--og-gold);
}

/* ── progress bar ── */
.og-fp-track {
  flex: 1;
  height: 4px;
  background: var(--og-bg3);
  border-radius: 2px;
  overflow: hidden;
  min-width: 100px;
  max-width: 180px;
}
.og-fp-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--og-gold-dim), var(--og-gold));
  border-radius: 2px;
  animation: loading-bar 1.4s ease-in-out infinite;
  width: 40%;
}

/* ── face chips ── */
.og-face-chip {
  position: relative;
  width: 38px;
  height: 38px;
  border-radius: 50%;
  border: 2px solid transparent;
  cursor: pointer;
  overflow: visible;
  transition: border-color .15s, transform .15s;
  flex-shrink: 0;
}
.og-face-chip:hover { transform: scale(1.06); }
.og-face-chip.selected { border-color: var(--og-gold); border-radius: 50%; }
.og-face-chip img {
  width: 38px;
  height: 38px;
  object-fit: cover;
  border-radius: 50%;
  display: block;
}
.og-face-chip-count {
  position: absolute;
  bottom: -2px;
  right: -2px;
  width: 16px;
  height: 16px;
  background: var(--og-text);
  color: var(--og-bg);
  border-radius: 50%;
  font-size: 9px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1.5px solid var(--og-bg);
  pointer-events: none;
}
.og-all-chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 12px;
  border-radius: 20px;
  border: 1px solid var(--og-border);
  background: var(--og-bg);
  font-size: 11px;
  font-weight: 500;
  color: var(--og-text);
  cursor: pointer;
  transition: border-color .15s, background .15s;
  white-space: nowrap;
  flex-shrink: 0;
}
.og-all-chip:hover {
  border-color: var(--og-gold-b);
  background: var(--og-gold-glow);
}
.og-disable-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 8px;
  border: 1px solid var(--og-border);
  background: none;
  font-size: 11px;
  font-weight: 500;
  color: var(--og-muted);
  cursor: pointer;
  transition: border-color .15s, color .15s;
  white-space: nowrap;
  flex-shrink: 0;
}
.og-disable-btn:hover {
  border-color: var(--og-border2);
  color: var(--og-text);
}

/* ── sub-toolbar ── */
.og-sub {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 22px;
  border-bottom: 1px solid var(--og-border);
  gap: 8px;
  flex-wrap: wrap;
  transition: background .2s, border-color .2s;
}
.og-sub.selecting {
  background: var(--og-gold-glow);
  border-bottom-color: var(--og-gold-b);
}
.og-sub-info {
  font-size: 12px;
  color: var(--og-muted);
  flex: 1;
  min-width: 0;
}
.og-sub-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}
.og-sub-btn {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 7px 14px;
  border-radius: 7px;
  border: 1px solid var(--og-border);
  background: var(--og-bg);
  font-size: 12px;
  font-weight: 500;
  color: var(--og-text);
  cursor: pointer;
  transition: border-color .2s, background .2s;
  white-space: nowrap;
}
.og-sub-btn:hover { border-color: var(--og-border2); }
.og-sub-btn:disabled { opacity: .4; cursor: not-allowed; }
.og-sub-btn.gold {
  background: var(--og-gold);
  color: white;
  border-color: var(--og-gold);
}
.og-sub-btn.gold:hover { background: var(--og-gold-dim); border-color: var(--og-gold-dim); }
.og-sub-btn.danger {
  background: var(--og-gold);
  color: white;
  border-color: var(--og-gold);
}
.og-sub-btn.danger:hover { background: var(--og-gold-dim); border-color: var(--og-gold-dim); }
.og-sub-btn.text-only {
  border-color: transparent;
  background: none;
  color: var(--og-muted);
}
.og-sub-btn.text-only:hover {
  color: var(--og-text);
  border-color: transparent;
  background: none;
}

/* ── masonry grid ── */
.og-grid-wrap { padding: 18px; }
.og-grid {
  columns: 4;
  column-gap: 12px;
}

/* ── tile ── */
.og-tile {
  position: relative;
  break-inside: avoid;
  display: block;
  margin-bottom: 12px;
  border-radius: 12px;
  overflow: hidden;
  cursor: pointer;
  background: var(--og-bg3);
}
.og-tile img {
  width: 100%;
  height: auto;
  display: block;
  transition: transform .35s ease;
}
.og-tile:hover img { transform: scale(1.04); }
.og-tile-video-ph {
  width: 100%;
  aspect-ratio: 4 / 3;
  background: linear-gradient(135deg, oklch(22% 0.02 265), oklch(15% 0.01 265));
  display: flex;
  align-items: center;
  justify-content: center;
}

.og-tile-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg,
    oklch(0% 0 0 / 0.18) 0%,
    transparent 28%,
    transparent 70%,
    oklch(0% 0 0 / 0.4) 100%
  );
  opacity: 0;
  transition: opacity .2s;
  pointer-events: none;
}
.og-tile:hover .og-tile-overlay { opacity: 1; }

.og-tile-check {
  position: absolute;
  top: 10px;
  left: 10px;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: oklch(100% 0 0 / 0.85);
  border: 1.5px solid oklch(80% 0 0);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  backdrop-filter: blur(6px);
  opacity: 0;
  transition: opacity .2s, background .15s, border-color .15s;
  z-index: 2;
}
.og-selecting .og-tile-check,
.og-tile:hover .og-tile-check,
.og-tile.selected .og-tile-check { opacity: 1; }
.og-tile.selected .og-tile-check {
  background: var(--og-gold);
  border-color: var(--og-gold);
}

.og-tile-actions {
  position: absolute;
  top: 10px;
  right: 10px;
  display: flex;
  gap: 6px;
  opacity: 0;
  transition: opacity .2s;
  z-index: 2;
}
.og-tile:hover .og-tile-actions { opacity: 1; }
.og-tile-act {
  width: 30px;
  height: 30px;
  border-radius: 8px;
  background: oklch(100% 0 0 / 0.95);
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(6px);
  transition: transform .12s;
}
.og-tile-act:hover { transform: scale(1.05); }

.og-tile-meta {
  position: absolute;
  bottom: 8px;
  left: 10px;
  right: 10px;
  color: white;
  font-size: 10px;
  opacity: 0;
  transition: opacity .2s;
  font-weight: 500;
  letter-spacing: .04em;
  text-shadow: 0 1px 4px oklch(0% 0 0 / 0.6);
  display: flex;
  justify-content: space-between;
  pointer-events: none;
}
.og-tile:hover .og-tile-meta { opacity: 1; }

.og-tile.selected {
  outline: 3px solid var(--og-gold);
  outline-offset: -3px;
}

.og-video-badge {
  position: absolute;
  top: 8px;
  left: 8px;
  width: 26px;
  height: 26px;
  border-radius: 7px;
  background: oklch(0% 0 0 / 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(4px);
  pointer-events: none;
  z-index: 1;
}

.og-no-results {
  padding: 60px 20px;
  text-align: center;
  color: var(--og-muted);
  font-size: 14px;
}

.og-lb-close {
  position: absolute;
  top: 20px;
  right: 24px;
  width: 42px;
  height: 42px;
  border-radius: 50%;
  background: oklch(100% 0 0 / 0.1);
  border: 1px solid oklch(100% 0 0 / 0.2);
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background .15s;
}
.og-lb-close:hover { background: oklch(100% 0 0 / 0.22); }
.og-lb-arrow {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: oklch(100% 0 0 / 0.1);
  border: 1px solid oklch(100% 0 0 / 0.2);
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background .15s;
}
.og-lb-arrow:hover { background: oklch(100% 0 0 / 0.22); }
.og-lb-prev { left: 20px; }
.og-lb-next { right: 20px; }
.og-lb-img {
  max-width: 90vw;
  max-height: 84vh;
  object-fit: contain;
  border-radius: 8px;
  display: block;
}
.og-lb-caption {
  position: absolute;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  color: oklch(85% 0 0);
  font-size: 12px;
  text-align: center;
  white-space: nowrap;
  pointer-events: none;
}

/* ── modal ── */
.og-modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 300;
  background: oklch(0% 0 0 / 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  backdrop-filter: blur(4px);
}
.og-modal {
  background: white;
  border-radius: 18px;
  padding: 28px;
  max-width: 380px;
  width: 100%;
  box-shadow: 0 24px 80px oklch(0% 0 0 / 0.25);
}
.og-modal h3 {
  font-size: 17px;
  font-weight: 600;
  color: var(--og-text);
  margin-bottom: 8px;
}
.og-modal p {
  font-size: 13px;
  color: var(--og-muted);
  margin-bottom: 22px;
  line-height: 1.55;
}
.og-modal-btns {
  display: flex;
  gap: 10px;
}
.og-modal-btns button {
  flex: 1;
  padding: 10px;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  border: 1px solid var(--og-border);
  background: var(--og-bg);
  color: var(--og-text);
  transition: background .15s, border-color .15s;
}
.og-modal-btns button:hover { background: var(--og-bg2); }
.og-modal-btns button.primary {
  background: var(--og-gold);
  color: white;
  border-color: var(--og-gold);
}
.og-modal-btns button.primary:hover { background: var(--og-gold-dim); border-color: var(--og-gold-dim); }
.og-modal-btns button:disabled { opacity: .5; cursor: not-allowed; }

/* ── face confirm modal icon area ── */
.og-face-modal-icon {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  margin-bottom: 20px;
}
.og-face-modal-icon-wrap {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: var(--og-gold-glow);
  border: 1px solid var(--og-gold-b);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.og-face-modal-text h3 { margin-bottom: 4px; }
.og-face-modal-hint {
  display: block;
  margin-top: 8px;
  font-size: 11px;
  color: var(--og-muted2);
}

/* ── lightbox ── */
.og-lightbox {
  position: fixed; inset: 0; z-index: 10000;
  background: oklch(8% 0.012 265 / 0.96);
  display: flex; align-items: center; justify-content: center;
  padding: 40px;
  backdrop-filter: blur(8px);
}
.og-lb-topbar {
  position: absolute; top: 0; left: 0; right: 0;
  display: flex; align-items: center; gap: 10px;
  padding: 16px 20px;
}
.og-lb-save {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 8px 16px; border-radius: 8px;
  background: oklch(44% 0.16 72);
  color: #fff; font-size: 12px; font-weight: 600;
  font-family: 'DM Sans', system-ui, sans-serif;
  border: none; cursor: pointer;
  transition: opacity .15s;
}
.og-lb-save:hover:not(:disabled) { opacity: .85; }
.og-lb-save:disabled { opacity: .5; cursor: not-allowed; }

.og-pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 20px 22px;
  border-top: 1px solid var(--og-border);
}
.og-page-btn {
  display: inline-flex;
  align-items: center;
  padding: 8px 16px;
  border-radius: 8px;
  border: 1px solid var(--og-border);
  background: var(--og-bg);
  color: var(--og-text);
  font-size: 13px;
  font-weight: 500;
  text-decoration: none;
  transition: border-color .15s, background .15s;
  font-family: 'DM Sans', system-ui, sans-serif;
}
.og-page-btn:not(.disabled):hover {
  border-color: var(--og-border2);
  background: var(--og-bg2);
}
.og-page-btn.disabled {
  opacity: .35;
  cursor: default;
}
.og-page-info {
  font-size: 13px;
  color: var(--og-muted);
  white-space: nowrap;
}

@media (max-width: 768px) {
  .og-toolbar { padding: 14px; }
  .og-sub { padding: 12px 14px; }
  .og-grid-wrap { padding: 10px; }
  .og-grid { columns: 2; column-gap: 8px; }
  .og-tile { margin-bottom: 8px; }
  .og-face-chip { width: 34px; height: 34px; }
  .og-face-chip img { width: 34px; height: 34px; }
  .og-lb-arrow { width: 40px; height: 40px; }
  .og-lightbox { padding: 16px; }
  .og-lb-topbar { padding: 10px 14px; }
}
`;

/* ─── SVG icon helpers ───────────────────────────────────────────────────── */
function IconFace() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4"/><path d="M20 21a8 8 0 1 0-16 0"/>
    </svg>
  );
}
function IconCheck() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  );
}
function IconDownload() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/>
    </svg>
  );
}
function IconTrash({ size = 13 }: { size?: number }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
      <path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
    </svg>
  );
}
function IconClose({ size = 16 }: { size?: number }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" x2="6" y1="6" y2="18"/><line x1="6" x2="18" y1="6" y2="18"/>
    </svg>
  );
}
function IconChevronLeft() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m15 18-6-6 6-6"/>
    </svg>
  );
}
function IconChevronRight() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m9 18 6-6-6-6"/>
    </svg>
  );
}
function IconPlay() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="white">
      <polygon points="5 3 19 12 5 21 5 3"/>
    </svg>
  );
}

/* ─── Main component ─────────────────────────────────────────────────────── */
export function OwnerMediaGrid({ items: initial, albumId, albumTitle, firstQR, page = 1, totalPages = 1 }: Props) {
  /* ── items state ── */
  const [items, setItems] = useState(initial);
  useEffect(() => { setItems(initial); }, [initial]);

  /* ── lightbox ── */
  const [lightbox, setLightbox] = useState<MediaItem | null>(null);

  /* ── selection ── */
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  /* ── download ── */
  const [downloading, setDownloading]   = useState(false);
  const [saving,     setSaving]         = useState(false);

  /* ── delete ── */
  const [deleting, setDeleting] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  /* ── face-filter state ── */
  type FaceStatus = "idle" | "loading" | "done" | "error";
  const [faceStatus, setFaceStatus] = useState<FaceStatus>("idle");
  const [faceEnabled, setFaceEnabled] = useState(false);
  const [showFaceConfirm, setShowFaceConfirm] = useState(false);
  const [faceClusters, setFaceClusters] = useState<FaceCluster[]>([]);
  const [faceCrops, setFaceCrops] = useState<Map<string, string>>(new Map());
  const [selectedFace, setSelectedFace] = useState<string | null>(null);
  const [faceItems, setFaceItems] = useState<MediaItem[] | null>(null);
  const [fetchingFace, setFetchingFace] = useState(false);

  /* ── derived display list ── */
  const displayItems = faceItems ?? items;

  /* ── face loading ── */
  const imageItems = items.filter((i) => i.file_type === "image");
  const itemIds = imageItems.map((i) => i.id).join(",");
  const loadFacesRef = useRef<(() => Promise<void>) | null>(null);

  const loadFaces = useCallback(async () => {
    setFaceStatus("loading");
    setFaceClusters([]);
    setFaceCrops(new Map());

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20_000);

    try {
      const res = await fetch(`/api/faces?albumId=${albumId}`, { signal: controller.signal });
      if (!res.ok) throw new Error("fetch failed");
      const faces: FaceRecord[] = await res.json();
      const clustered = clusterFaces(faces);

      // Build all crops before touching state — prevents a "no faces" flash
      const visible = clustered.filter((c) => c.mediaIds.length >= MIN_CLUSTER_SIZE);
      const newCrops = new Map<string, string>();
      for (const cluster of visible.slice(0, 30)) {
        const item = imageItems.find((i) => i.id === cluster.representative.mediaId);
        if (!item) continue;
        const crop = await cropToDataUrl(item.file_url, cluster.representative.box);
        if (crop) newCrops.set(cluster.id, crop);
      }

      // All three updates in one batch → single render, no intermediate states
      setFaceClusters(clustered);
      setFaceCrops(newCrops);
      setFaceStatus("done");
    } catch (err) {
      // AbortError = 20s timeout → show "no faces found"
      if ((err as { name?: string }).name === "AbortError") {
        setFaceStatus("done");
      } else {
        setFaceStatus("error");
      }
    } finally {
      clearTimeout(timeoutId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [albumId, itemIds]);

  loadFacesRef.current = loadFaces;

  // Re-load when items change while face filter is enabled
  useEffect(() => {
    if (!faceEnabled) return;
    if (imageItems.length === 0) {
      setFaceClusters([]);
      setFaceCrops(new Map());
      setFaceStatus("idle");
      return;
    }
    loadFacesRef.current?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemIds, faceEnabled]);

  function handleFaceEnable() {
    setShowFaceConfirm(false);
    setFaceEnabled(true);
    loadFaces();
  }

  function handleFaceDisable() {
    setFaceEnabled(false);
    setSelectedFace(null);
    setFaceItems(null);
    setFetchingFace(false);
    setFaceStatus("idle");
    setFaceClusters([]);
    setFaceCrops(new Map());
  }

  async function handleFaceChipClick(clusterId: string) {
    if (selectedFace === clusterId) {
      setSelectedFace(null);
      setFaceItems(null);
      return;
    }
    setSelectedFace(clusterId);
    const c = faceClusters.find((c) => c.id === clusterId);
    if (!c) return;
    setFetchingFace(true);
    try {
      const res = await fetch("/api/media-by-ids", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ albumId, mediaIds: [...new Set(c.mediaIds)] }),
      });
      if (res.ok) setFaceItems(await res.json());
    } finally {
      setFetchingFace(false);
    }
  }

  const visibleClusters = faceClusters.filter(
    (c) => c.mediaIds.length >= MIN_CLUSTER_SIZE && faceCrops.has(c.id)
  );

  /* ── selection helpers ── */
  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function exitSelection() {
    setSelecting(false);
    setSelected(new Set());
  }

  /* ── download ── */
  async function triggerDownload(mediaIds?: string[]) {
    setDownloading(true);
    try {
      const res = await fetch("/api/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ albumId, mediaIds }),
      });
      if (!res.ok) { setDownloading(false); return; }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${albumTitle.replace(/[^a-zA-Z0-9_-]/g, "_")}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } finally {
      setDownloading(false);
    }
  }

  /* ── delete ── */
  async function handleDelete(mediaId: string) {
    setDeleting(mediaId);
    const result = await deleteMedia(mediaId, albumId);
    if (result.success) {
      setItems((prev) => prev.filter((i) => i.id !== mediaId));
      setFaceItems((prev) => prev ? prev.filter((i) => i.id !== mediaId) : null);
      if (lightbox?.id === mediaId) setLightbox(null);
    }
    setDeleting(null);
    setConfirmDelete(null);
  }

  async function handleBulkDelete() {
    setBulkDeleting(true);
    const ids = Array.from(selected);
    await deleteMediaBulk(ids, albumId);
    setItems((prev) => prev.filter((i) => !selected.has(i.id)));
    setFaceItems((prev) => prev ? prev.filter((i) => !selected.has(i.id)) : null);
    setConfirmBulkDelete(false);
    setBulkDeleting(false);
    exitSelection();
  }

  /* ── lightbox navigation ── */
  const lbTouchX = useRef(0);

  function lbNavigate(dir: 1 | -1) {
    if (!lightbox) return;
    const idx = displayItems.findIndex((i) => i.id === lightbox.id);
    setLightbox(displayItems[(idx + dir + displayItems.length) % displayItems.length]);
  }
  function lbPrev(e: React.MouseEvent) { e.stopPropagation(); lbNavigate(-1); }
  function lbNext(e: React.MouseEvent) { e.stopPropagation(); lbNavigate(1); }
  function lbTouchStart(e: React.TouchEvent) { lbTouchX.current = e.touches[0].clientX; }
  function lbTouchEnd(e: React.TouchEvent) {
    const delta = e.changedTouches[0].clientX - lbTouchX.current;
    if (Math.abs(delta) < 40) return;
    lbNavigate(delta < 0 ? 1 : -1);
  }

  /* ── sub-toolbar status text ── */
  function subInfo() {
    if (selecting) return `${selected.size} selected`;
    if (selectedFace !== null) {
      if (fetchingFace) return "Loading photos…";
      return `Showing ${displayItems.length} photo${displayItems.length !== 1 ? "s" : ""} with this person`;
    }
    return "Showing all photos · sorted by upload date";
  }

  /* ── keyboard: close lightbox on Escape ── */
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!lightbox) return;
      if (e.key === "Escape") setLightbox(null);
      if (e.key === "ArrowLeft") {
        const idx = displayItems.findIndex((i) => i.id === lightbox.id);
        setLightbox(displayItems[(idx - 1 + displayItems.length) % displayItems.length]);
      }
      if (e.key === "ArrowRight") {
        const idx = displayItems.findIndex((i) => i.id === lightbox.id);
        setLightbox(displayItems[(idx + 1) % displayItems.length]);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightbox, displayItems]);

  /* ── empty state ── */
  if (items.length === 0) {
    return (
      <>
        <style>{panelCss}</style>
        <div className="og-panel">
          <div style={{ padding: "40px 24px" }}>
            {firstQR ? (
              <div className="flex flex-col items-center text-center gap-6">
                <div className="flex flex-col items-center gap-3">
                  <div className="rounded-2xl bg-white p-4 shadow-lg ring-1 ring-outline-variant/20">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={firstQR.dataUrl} alt="QR code" width={180} height={180} />
                  </div>
                  <span className="text-xs tracking-widest uppercase text-secondary font-semibold">{firstQR.label}</span>
                </div>
                <div className="max-w-xs">
                  <p className="font-noto-serif text-2xl font-light text-on-surface">Waiting for the first upload</p>
                  <p className="text-sm text-on-surface-variant leading-relaxed mt-2">
                    Print it, project it, or send the link — guests scan and upload straight from their phones.
                  </p>
                </div>
                <div className="flex flex-wrap justify-center gap-2">
                  <CopyButton url={firstQR.joinUrl} />
                  <a
                    href={firstQR.dataUrl}
                    download="qr-code.png"
                    className="flex items-center gap-1.5 rounded-xl border border-outline-variant/40 px-4 py-2 text-xs font-medium text-on-surface-variant hover:border-primary hover:text-primary transition"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/>
                    </svg>
                    Download QR
                  </a>
                </div>
              </div>
            ) : (
              <div className="og-no-results">
                <p>No uploads yet.</p>
                <p style={{ marginTop: 6, fontSize: 12, opacity: 0.7 }}>Create a QR code to start collecting photos from your guests.</p>
              </div>
            )}
          </div>
        </div>
      </>
    );
  }

  /* ── render ── */
  const lbIdx = lightbox ? displayItems.findIndex((i) => i.id === lightbox.id) : -1;

  return (
    <>
      <style>{panelCss}</style>

      {/* ── Face confirm modal ── */}
      {showFaceConfirm && (
        <div className="og-modal-backdrop" onClick={() => setShowFaceConfirm(false)}>
          <div className="og-modal" onClick={(e) => e.stopPropagation()}>
            <div className="og-face-modal-icon">
              <div className="og-face-modal-icon-wrap">
                <IconFace />
              </div>
              <div className="og-face-modal-text">
                <h3>Enable face filter</h3>
                <p style={{ marginBottom: 0 }}>
                  Captura will group photos by the faces that appear in them. This may take a few moments depending on album size.
                  <span className="og-face-modal-hint">Results are saved — next visit will be instant.</span>
                </p>
              </div>
            </div>
            <div className="og-modal-btns">
              <button onClick={() => setShowFaceConfirm(false)}>Cancel</button>
              <button className="primary" onClick={handleFaceEnable}>Enable</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Single delete confirm ── */}
      {confirmDelete && (
        <div className="og-modal-backdrop" onClick={() => setConfirmDelete(null)}>
          <div className="og-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Delete file?</h3>
            <p>This permanently removes the file from storage and cannot be undone.</p>
            <div className="og-modal-btns">
              <button onClick={() => setConfirmDelete(null)}>Cancel</button>
              <button
                className="primary"
                disabled={deleting === confirmDelete}
                onClick={() => handleDelete(confirmDelete)}
              >
                {deleting === confirmDelete ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Bulk delete confirm ── */}
      {confirmBulkDelete && (
        <div className="og-modal-backdrop" onClick={() => setConfirmBulkDelete(false)}>
          <div className="og-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Delete {selected.size} {selected.size === 1 ? "file" : "files"}?</h3>
            <p>This permanently removes the selected files from storage and cannot be undone.</p>
            <div className="og-modal-btns">
              <button onClick={() => setConfirmBulkDelete(false)}>Cancel</button>
              <button className="primary" disabled={bulkDeleting} onClick={handleBulkDelete}>
                {bulkDeleting ? "Deleting…" : "Delete all"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Panel ── */}
      <div className="og-panel">

        {/* ── Toolbar ── */}
        <div className="og-toolbar">
          <div className="og-toolbar-left">

            {/* Face button — idle */}
            {!faceEnabled && faceStatus === "idle" && imageItems.length > 0 && (
              <button className="og-face-btn" onClick={() => setShowFaceConfirm(true)}>
                <IconFace />
                Filter by face
              </button>
            )}

            {/* Face button — loading */}
            {faceStatus === "loading" && (
              <>
                <button className="og-face-btn active">
                  <IconFace />
                  Scanning faces…
                </button>
                <div className="og-fp-track">
                  <div className="og-fp-fill" />
                </div>
              </>
            )}

            {/* Face button — done, no visible clusters */}
            {faceStatus === "done" && visibleClusters.length === 0 && (
              <>
                <button className="og-face-btn active">
                  <IconFace />
                  No faces found
                </button>
                <button className="og-disable-btn" onClick={handleFaceDisable}>
                  <IconClose size={13} /> Disable
                </button>
              </>
            )}

            {/* Face chips — done with clusters */}
            {faceStatus === "done" && visibleClusters.length > 0 && (
              <>
                <button
                  className={`og-face-btn${faceEnabled ? " active" : ""}`}
                  onClick={handleFaceDisable}
                  title="Click to disable face filter"
                >
                  <IconFace />
                  Filter by face
                </button>

                {/* "All" chip — only when a face is selected */}
                {selectedFace !== null && (
                  <button
                    className="og-all-chip"
                    onClick={() => { setSelectedFace(null); setFaceItems(null); }}
                  >
                    <IconClose size={11} /> All
                  </button>
                )}

                {visibleClusters.map((cluster) => {
                  const count = new Set(cluster.mediaIds).size;
                  return (
                    <button
                      key={cluster.id}
                      className={`og-face-chip${selectedFace === cluster.id ? " selected" : ""}`}
                      onClick={() => handleFaceChipClick(cluster.id)}
                      title={`${count} photo${count !== 1 ? "s" : ""}`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={faceCrops.get(cluster.id)!} alt="face" />
                      <span className="og-face-chip-count">{count > 99 ? "99+" : count}</span>
                    </button>
                  );
                })}

                <button className="og-disable-btn" onClick={handleFaceDisable}>
                  <IconClose size={13} /> Disable
                </button>
              </>
            )}

            {/* Error */}
            {faceStatus === "error" && (
              <>
                <button className="og-face-btn" onClick={() => loadFaces()}>
                  <IconFace />
                  Retry face scan
                </button>
                <button className="og-disable-btn" onClick={handleFaceDisable}>
                  <IconClose size={13} /> Dismiss
                </button>
              </>
            )}
          </div>

          {/* Count */}
          <div className="og-toolbar-right">
            {items.length} {items.length === 1 ? "photo" : "photos"}
          </div>
        </div>

        {/* ── Sub-toolbar ── */}
        <div className={`og-sub${selecting ? " selecting" : ""}`}>
          <span className="og-sub-info">{subInfo()}</span>
          <div className="og-sub-actions">
            {!selecting ? (
              <>
                <button className="og-sub-btn" onClick={() => setSelecting(true)}>
                  Select
                </button>
                <button
                  className="og-sub-btn gold"
                  disabled={downloading}
                  onClick={() => triggerDownload()}
                >
                  <IconDownload />
                  {downloading ? "Preparing…" : "Download all"}
                </button>
              </>
            ) : (
              <>
                <button
                  className="og-sub-btn"
                  disabled={selected.size === items.length}
                  onClick={() => setSelected(new Set(items.map((i) => i.id)))}
                >
                  Select all
                </button>
                <button
                  className="og-sub-btn"
                  disabled={selected.size === 0}
                  onClick={() => setSelected(new Set())}
                >
                  Deselect
                </button>
                <button
                  className="og-sub-btn"
                  disabled={selected.size === 0 || downloading}
                  onClick={() => triggerDownload(Array.from(selected))}
                >
                  <IconDownload />
                  {downloading ? "Preparing…" : "Download"}
                </button>
                <button
                  className="og-sub-btn danger"
                  disabled={selected.size === 0}
                  onClick={() => { if (selected.size > 0) setConfirmBulkDelete(true); }}
                >
                  <IconTrash />
                  Delete
                </button>
                <button className="og-sub-btn text-only" onClick={exitSelection}>
                  Cancel
                </button>
              </>
            )}
          </div>
        </div>

        {/* ── Grid ── */}
        <div className="og-grid-wrap">
          <div className={`og-grid${selecting ? " og-selecting" : ""}`}>
            {displayItems.map((item) => {
              const isSelected = selected.has(item.id);
              return (
                <div
                  key={item.id}
                  className={`og-tile${isSelected ? " selected" : ""}`}
                  onClick={() => selecting ? toggleSelect(item.id) : setLightbox(item)}
                >
                  {/* Media */}
                  {item.file_type === "video" ? (
                    <>
                      <VideoThumb
                        src={item.file_url}
                        imgStyle={{ width: "100%", height: "auto", display: "block" }}
                        placeholder={<div className="og-tile-video-ph" />}
                      />
                      <div className="og-video-badge"><IconPlay /></div>
                    </>
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.file_url}
                      alt={item.uploader_name ?? "Upload"}
                      loading="lazy"
                      onError={(e) => {
                        const t = e.currentTarget;
                        t.style.display = "none";
                        const ph = t.parentElement?.querySelector(".og-img-ph") as HTMLElement | null;
                        if (ph) ph.style.display = "flex";
                      }}
                    />
                  )}
                  {/* Broken-image placeholder (hidden until onError fires) */}
                  {item.file_type !== "video" && (
                    <div className="og-img-ph" style={{ display: "none", position: "absolute", inset: 0, alignItems: "center", justifyContent: "center", background: "var(--og-bg3)", flexDirection: "column", gap: 6 }}>
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--og-muted2)" strokeWidth="1.5" strokeLinecap="round">
                        <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-5-5L5 21"/>
                      </svg>
                    </div>
                  )}

                  {/* Hover overlay gradient */}
                  <div className="og-tile-overlay" />

                  {/* Checkbox — clicking always enters selection mode */}
                  <div
                    className="og-tile-check"
                    onClick={(e) => { e.stopPropagation(); if (!selecting) setSelecting(true); toggleSelect(item.id); }}
                  >
                    {isSelected && <IconCheck />}
                  </div>

                  {/* Action buttons (delete) — hidden in select mode */}
                  {!selecting && (
                    <div className="og-tile-actions">
                      <button
                        className="og-tile-act"
                        onClick={(e) => { e.stopPropagation(); setConfirmDelete(item.id); }}
                        aria-label="Delete"
                      >
                        <IconTrash size={13} />
                      </button>
                    </div>
                  )}

                  {/* Meta */}
                  <div className="og-tile-meta">
                    <span>{item.uploader_name ?? ""}</span>
                    <span>{timeAgo(item.created_at)}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* No results */}
          {displayItems.length === 0 && (
            <div className="og-no-results">No photos match this filter.</div>
          )}
        </div>

        {/* ── Pagination ── */}
        {!faceItems && totalPages > 1 && (
          <div className="og-pagination">
            {page > 1
              ? <a href={`/albums/${albumId}/gallery?page=${page - 1}`} className="og-page-btn">← Previous</a>
              : <span className="og-page-btn disabled">← Previous</span>}
            <span className="og-page-info">Page {page} of {totalPages}</span>
            {page < totalPages
              ? <a href={`/albums/${albumId}/gallery?page=${page + 1}`} className="og-page-btn">Next →</a>
              : <span className="og-page-btn disabled">Next →</span>}
          </div>
        )}
      </div>

      {/* ── Lightbox ── */}
      {lightbox && (
        <div className="og-lightbox" onClick={() => setLightbox(null)}>

          {/* Top bar: close · caption · save */}
          <div className="og-lb-topbar" onClick={(e) => e.stopPropagation()}>
            <button className="og-lb-close" style={{ position: "static" }} onClick={() => setLightbox(null)}>
              <IconClose size={18} />
            </button>
            <div className="og-lb-caption" style={{ position: "static", transform: "none", flex: 1, textAlign: "left", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {lightbox.uploader_name && <>{lightbox.uploader_name} · </>}
              {timeAgo(lightbox.created_at)}
              {displayItems.length > 1 && <> · {lbIdx + 1} / {displayItems.length}</>}
            </div>
            <button
              className="og-lb-save"
              disabled={saving}
              onClick={async () => {
                setSaving(true);
                try {
                  const id  = lightbox.id;
                  const res = await fetch(`/api/download-file?mediaId=${id}`);
                  if (!res.ok) return;
                  const blob = await res.blob();
                  const url  = URL.createObjectURL(blob);
                  const a    = document.createElement("a");
                  const cd   = res.headers.get("content-disposition") ?? "";
                  a.href     = url;
                  a.download = cd.match(/filename="([^"]+)"/)?.[1] ?? "photo";
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  URL.revokeObjectURL(url);
                } finally {
                  setSaving(false);
                }
              }}
            >
              <IconDownload />
              {saving ? "Saving…" : "Save"}
            </button>
          </div>

          {/* Prev */}
          {displayItems.length > 1 && (
            <button className="og-lb-arrow og-lb-prev" onClick={lbPrev}>
              <IconChevronLeft />
            </button>
          )}

          {/* Media — swipeable */}
          <div
            onClick={(e) => e.stopPropagation()}
            onTouchStart={lbTouchStart}
            onTouchEnd={lbTouchEnd}
          >
            {lightbox.file_type === "video" ? (
              <video src={lightbox.file_url} controls autoPlay className="og-lb-img" />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={lightbox.file_url} alt={lightbox.uploader_name ?? "Photo"} className="og-lb-img" />
            )}
          </div>

          {/* Next */}
          {displayItems.length > 1 && (
            <button className="og-lb-arrow og-lb-next" onClick={lbNext}>
              <IconChevronRight />
            </button>
          )}
        </div>
      )}
    </>
  );
}
