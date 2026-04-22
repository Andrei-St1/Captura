"use client";

import { useEffect, useRef, useState } from "react";

const CLUSTER_THRESHOLD = 0.55;
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
  const [clusters, setClusters] = useState<FaceCluster[]>([]);
  const [crops, setCrops] = useState<Map<string, string>>(new Map());
  const [selected, setSelected] = useState<string | null>(null);
  const ran = useRef(false);

  const imageItems = items.filter((i) => i.file_type === "image");

  useEffect(() => {
    if (ran.current || imageItems.length === 0) return;
    ran.current = true;
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  function select(clusterId: string) {
    if (selected === clusterId) {
      setSelected(null);
      onFilter(null);
    } else {
      setSelected(clusterId);
      const c = clusters.find((c) => c.id === clusterId);
      if (c) onFilter(new Set(c.mediaIds));
    }
  }

  const visible = clusters.filter((c) => c.mediaIds.length >= MIN_CLUSTER_SIZE && crops.has(c.id));

  if (imageItems.length === 0) return null;

  return (
    <div className="border-b border-outline-variant/20 px-4 py-2 min-h-[72px] flex items-center">

      {status === "loading" && (
        <div className="flex items-center gap-2 text-xs text-on-surface-variant">
          <svg className="animate-spin shrink-0" xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
          </svg>
          Loading faces…
        </div>
      )}

      {status === "done" && visible.length === 0 && (
        <p className="text-xs text-on-surface-variant">No recurring faces detected.</p>
      )}

      {visible.length > 0 && (
        <div className="flex items-center gap-3 overflow-x-auto py-2">
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
              title={`${cluster.mediaIds.length} photos`}
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
              <span className="text-[10px] text-on-surface-variant tabular-nums">{cluster.mediaIds.length}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
