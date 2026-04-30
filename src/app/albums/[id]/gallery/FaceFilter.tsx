"use client";

import { useEffect, useState } from "react";

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

interface MediaItem {
  id: string;
  file_url: string;
  file_type: string;
}

interface Props {
  items: MediaItem[];
  albumId: string;
  onFilter: (ids: Set<string> | null) => void;
}

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

export function FaceFilter({ items, albumId, onFilter }: Props) {
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [showConfirm, setShowConfirm] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [clusters, setClusters] = useState<FaceCluster[]>([]);
  const [crops, setCrops] = useState<Map<string, string>>(new Map());
  const [selected, setSelected] = useState<string | null>(null);
  const [dots, setDots] = useState(".");

  const imageItems = items.filter((i) => i.file_type === "image");
  const itemIds = imageItems.map((i) => i.id).join(",");

  // Animated dots while loading
  useEffect(() => {
    if (status !== "loading") return;
    const t = setInterval(() => setDots((d) => d.length >= 3 ? "." : d + "."), 500);
    return () => clearInterval(t);
  }, [status]);

  // Re-load when items change (new uploads / deletions)
  useEffect(() => {
    if (!enabled) return;
    if (imageItems.length === 0) {
      setClusters([]);
      setCrops(new Map());
      setStatus("idle");
      return;
    }
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemIds]);

  async function load() {
    setStatus("loading");
    try {
      const res = await fetch(`/api/faces?albumId=${albumId}`);
      if (!res.ok) throw new Error("fetch failed");
      const faces: FaceRecord[] = await res.json();

      const clustered = clusterFaces(faces);
      setClusters(clustered);
      setStatus("done");

      const visible = clustered.filter((c) => c.mediaIds.length >= MIN_CLUSTER_SIZE);
      const newCrops = new Map<string, string>();
      for (const cluster of visible.slice(0, 30)) {
        const item = imageItems.find((i) => i.id === cluster.representative.mediaId);
        if (!item) continue;
        const crop = await cropToDataUrl(item.file_url, cluster.representative.box);
        if (crop) newCrops.set(cluster.id, crop);
      }
      setCrops(newCrops);
    } catch {
      setStatus("error");
    }
  }

  function handleEnable() {
    setShowConfirm(false);
    setEnabled(true);
    load();
  }

  function handleDisable() {
    setEnabled(false);
    setSelected(null);
    onFilter(null);
    setStatus("idle");
    setClusters([]);
    setCrops(new Map());
  }

  function select(clusterId: string) {
    if (selected === clusterId) {
      setSelected(null);
      onFilter(null);
    } else {
      setSelected(clusterId);
      const c = clusters.find((c) => c.id === clusterId);
      if (c) onFilter(new Set(c.mediaIds)); // Set deduplicates automatically
    }
  }

  const visible = clusters.filter((c) => c.mediaIds.length >= MIN_CLUSTER_SIZE && crops.has(c.id));

  if (imageItems.length === 0) return null;

  return (
    <>
      {/* Confirmation modal */}
      {showConfirm && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
          onClick={() => setShowConfirm(false)}
        >
          <div
            className="bg-surface-container-lowest rounded-2xl p-6 max-w-sm w-full shadow-2xl ring-1 ring-outline-variant/30"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-4 mb-5">
              <div className="rounded-xl bg-primary/10 p-2.5 shrink-0">
                <span className="material-symbols-outlined text-primary" style={{ fontSize: "22px" }}>face</span>
              </div>
              <div>
                <h3 className="font-noto-serif text-lg text-on-surface">Enable face filter</h3>
                <p className="mt-1 text-sm text-on-surface-variant leading-relaxed">
                  Captura will group photos by the faces that appear in them. This may take a few moments depending on album size.
                </p>
                <p className="mt-2 text-xs text-outline">Results are saved — next visit will be instant.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 rounded-xl border border-outline-variant/40 py-2.5 text-sm font-medium text-on-surface-variant hover:bg-surface-container transition"
              >
                Cancel
              </button>
              <button
                onClick={handleEnable}
                className="flex-1 rounded-xl bg-primary py-2.5 text-sm font-semibold text-white hover:bg-primary/90 transition"
              >
                Enable
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="border-b border-outline-variant/20 px-4 py-3 min-h-[100px] flex items-center gap-3">

        {/* Idle — activate button */}
        {!enabled && status === "idle" && (
          <button
            onClick={() => setShowConfirm(true)}
            className="flex items-center gap-2 rounded-xl border border-outline-variant/40 px-4 py-2 text-xs font-medium text-on-surface-variant hover:border-primary hover:text-primary transition"
          >
            <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>face</span>
            Filter by face
          </button>
        )}

        {/* Loading */}
        {status === "loading" && (
          <div className="flex items-center gap-3 flex-1">
            <div className="relative shrink-0">
              <div className="h-9 w-9 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
              <span className="material-symbols-outlined text-primary absolute inset-0 flex items-center justify-center" style={{ fontSize: "16px" }}>face</span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-medium text-on-surface">Finding faces{dots}</span>
              <span className="text-xs text-on-surface-variant">Scanning photos and grouping similar faces</span>
            </div>
            {/* Animated bar */}
            <div className="flex-1 max-w-[160px] ml-auto">
              <div className="h-1 w-full rounded-full bg-outline-variant/20 overflow-hidden">
                <div className="h-full bg-primary rounded-full animate-[loading-bar_1.4s_ease-in-out_infinite]" style={{ width: "40%" }} />
              </div>
            </div>
          </div>
        )}

        {/* Done — no faces */}
        {status === "done" && visible.length === 0 && (
          <div className="flex items-center gap-3 flex-1">
            <p className="text-xs text-on-surface-variant flex-1">No recurring faces detected.</p>
            <button
              onClick={handleDisable}
              className="flex items-center gap-1.5 rounded-xl border border-outline-variant/40 px-3 py-1.5 text-xs font-medium text-on-surface-variant hover:border-red-400 hover:text-red-500 transition"
            >
              <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>close</span>
              Disable
            </button>
          </div>
        )}

        {/* Done — face bubbles */}
        {status === "done" && visible.length > 0 && (
          <div className="flex items-center gap-3 overflow-x-auto overflow-y-visible flex-1 min-w-0 py-2">
            <span className="shrink-0 text-xs text-on-surface-variant font-medium">Filter by face</span>

            {selected && (
              <button
                onClick={() => { setSelected(null); onFilter(null); }}
                className="shrink-0 flex items-center gap-1 rounded-full border border-outline-variant/40 px-3 py-1 text-xs text-on-surface-variant hover:border-primary hover:text-primary transition"
              >
                <span className="material-symbols-outlined" style={{ fontSize: "13px" }}>close</span>
                All
              </button>
            )}

            {visible.map((cluster) => (
              <button
                key={cluster.id}
                onClick={() => select(cluster.id)}
                title={`${new Set(cluster.mediaIds).size} photos`}
                className={`shrink-0 flex flex-col items-center gap-1 transition-all duration-200 ${
                  selected === cluster.id ? "scale-110" : "hover:scale-105 opacity-80 hover:opacity-100"
                }`}
              >
                <div className={`rounded-full overflow-hidden ring-2 ring-offset-2 ring-offset-surface-container-lowest transition-all shadow-sm ${
                  selected === cluster.id ? "ring-primary" : "ring-outline-variant/30"
                }`} style={{ width: 52, height: 52 }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={crops.get(cluster.id)!} alt="face" className="w-full h-full object-cover" />
                </div>
                <span className="text-[10px] text-on-surface-variant tabular-nums">{new Set(cluster.mediaIds).size}</span>
              </button>
            ))}

            {/* Disable button at the end */}
            <button
              onClick={handleDisable}
              className="shrink-0 ml-auto flex items-center gap-1.5 rounded-xl border border-outline-variant/40 px-3 py-1.5 text-xs font-medium text-on-surface-variant hover:border-red-400 hover:text-red-500 transition"
            >
              <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>face_retouching_off</span>
              Disable
            </button>
          </div>
        )}

        {/* Error */}
        {status === "error" && (
          <div className="flex items-center gap-3 flex-1">
            <p className="text-xs text-red-500 flex-1">Failed to load faces. <button onClick={load} className="underline">Retry</button></p>
            <button onClick={handleDisable} className="text-xs text-on-surface-variant hover:text-on-surface transition">Dismiss</button>
          </div>
        )}
      </div>
    </>
  );
}
