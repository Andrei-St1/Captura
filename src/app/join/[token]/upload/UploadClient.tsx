"use client";

import { useState, useRef, useCallback } from "react";
import Link from "next/link";
import { extractExifDate, convertToWebP } from "@/lib/imagePreprocess";

interface FileItem {
  id: string;
  file: File;
  status: "pending" | "uploading" | "done" | "error";
  progress: number;
  error?: string;
}

const MAX_IMAGE_SIZE = 50 * 1024 * 1024;
const MAX_VIDEO_SIZE = 500 * 1024 * 1024;
const ACCEPTED = "image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif,video/mp4,video/quicktime,video/webm";

const MULTIPART_THRESHOLD = 50 * 1024 * 1024;
const CHUNK_SIZE = 50 * 1024 * 1024;
const PART_CONCURRENCY = 4;
const PART_MAX_RETRIES = 3;

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

async function extractFrameFromFile(file: File): Promise<Blob | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const v = document.createElement("video");
    v.muted = true; v.playsInline = true; v.preload = "metadata";
    let done = false;

    function capture() {
      if (done) return; done = true;
      try {
        const MAX = 720;
        const w = v.videoWidth || 320, h = v.videoHeight || 240;
        const scale = Math.min(1, MAX / Math.max(w, h));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(w * scale); canvas.height = Math.round(h * scale);
        canvas.getContext("2d")!.drawImage(v, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => { URL.revokeObjectURL(url); v.src = ""; resolve(blob); }, "image/jpeg", 0.82);
      } catch { URL.revokeObjectURL(url); v.src = ""; resolve(null); }
    }

    v.addEventListener("loadedmetadata", () => { v.currentTime = 0.001; }, { once: true });
    v.addEventListener("seeked", capture, { once: true });
    v.addEventListener("loadeddata", () => { setTimeout(capture, 200); }, { once: true });
    v.addEventListener("error", () => { URL.revokeObjectURL(url); resolve(null); }, { once: true });
    v.src = url;
  });
}

async function uploadThumbnail(blob: Blob, presignedUrl: string): Promise<boolean> {
  const status = await new Promise<number>((resolve) => {
    const xhr = new XMLHttpRequest();
    xhr.onload = () => resolve(xhr.status);
    xhr.onerror = () => resolve(0);
    xhr.open("PUT", presignedUrl);
    xhr.setRequestHeader("Content-Type", "image/jpeg");
    xhr.send(blob);
  });
  return status > 0 && status < 400;
}

async function abortMultipart(uploadId: string, filePath: string) {
  await fetch("/api/multipart-abort", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ uploadId, filePath }),
  }).catch(() => {});
}

export function UploadClient({ albumId, albumTitle, token }: { albumId: string; albumTitle: string; token: string }) {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [allDone, setAllDone] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function validateFile(file: File): string | null {
    const isVideo = file.type.startsWith("video/");
    if (file.size > (isVideo ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE))
      return `Too large. Max ${isVideo ? "500 MB" : "50 MB"}.`;
    if (!ACCEPTED.includes(file.type)) return "Unsupported file type.";
    return null;
  }

  function addFiles(incoming: FileList | File[]) {
    const items: FileItem[] = Array.from(incoming).map((file) => {
      const error = validateFile(file);
      return { id: `${Date.now()}-${Math.random()}`, file, status: error ? "error" : "pending", progress: 0, error: error ?? undefined };
    });
    setFiles((prev) => [...prev, ...items]);
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
  }, []);

  async function uploadOne(
    item: FileItem,
    uploadFile: File,
    presign: { presignedUrl: string; filePath: string; fileUrl: string; thumbnailPresignedUrl?: string; thumbnailFileUrl?: string },
    takenAt: string | null
  ) {
    const setErr = (error: string) =>
      setFiles((prev) => prev.map((f) => f.id === item.id ? { ...f, status: "error", error, progress: 0 } : f));
    const setProgress = (progress: number) =>
      setFiles((prev) => prev.map((f) => f.id === item.id ? { ...f, progress } : f));

    try {
      setProgress(30);

      // Start frame extraction in parallel with upload (for videos)
      const framePromise = presign.thumbnailPresignedUrl && uploadFile.type.startsWith("video/")
        ? extractFrameFromFile(uploadFile)
        : Promise.resolve(null);

      const r2Status = await new Promise<number>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable)
            setProgress(30 + Math.round((e.loaded / e.total) * 55));
        };
        xhr.onload = () => resolve(xhr.status);
        xhr.onerror = () => reject(new Error("Network error"));
        xhr.open("PUT", presign.presignedUrl);
        xhr.setRequestHeader("Content-Type", uploadFile.type || "application/octet-stream");
        xhr.send(uploadFile);
      });

      if (r2Status >= 400) return setErr(`Storage error ${r2Status}`);

      setProgress(85);

      // Upload thumbnail if frame extracted
      let thumbnailUrl: string | undefined;
      if (presign.thumbnailPresignedUrl && presign.thumbnailFileUrl) {
        const frame = await framePromise;
        if (frame) {
          const ok = await uploadThumbnail(frame, presign.thumbnailPresignedUrl);
          if (ok) thumbnailUrl = presign.thumbnailFileUrl;
        }
      }

      const confirmRes = await fetch("/api/upload-confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          albumId,
          filePath: presign.filePath,
          fileUrl: presign.fileUrl,
          mimeType: uploadFile.type || "application/octet-stream",
          fileSize: uploadFile.size,
          ...(thumbnailUrl ? { thumbnailUrl } : {}),
          ...(takenAt ? { takenAt } : {}),
        }),
      });

      const confirmText = await confirmRes.text();
      let confirm: { success?: boolean; error?: string };
      try { confirm = JSON.parse(confirmText); }
      catch { return setErr(`Confirm error ${confirmRes.status}`); }

      if (!confirmRes.ok || confirm.error) return setErr(confirm.error ?? "Confirm failed");

      setFiles((prev) => prev.map((f) => f.id === item.id ? { ...f, status: "done", progress: 100 } : f));
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[upload] threw:", msg);
      setErr(`Network error: ${msg}`);
    }
  }

  async function uploadOneMultipart(item: FileItem, uploadFile: File, takenAt: string | null) {
    const setErr = (error: string) =>
      setFiles((prev) => prev.map((f) => f.id === item.id ? { ...f, status: "error", error, progress: 0 } : f));
    const setProgress = (progress: number) =>
      setFiles((prev) => prev.map((f) => f.id === item.id ? { ...f, progress } : f));

    try {
      setProgress(5);

      // 1. Init multipart upload
      const initRes = await fetch("/api/multipart-init", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          albumId,
          fileName: uploadFile.name,
          mimeType: uploadFile.type || "application/octet-stream",
          fileSize: uploadFile.size,
        }),
      });

      if (!initRes.ok) {
        const { error } = await initRes.json().catch(() => ({ error: "Init failed" }));
        return setErr(error);
      }

      const { uploadId, filePath, fileUrl, thumbnailPresignedUrl, thumbnailFileUrl } = await initRes.json() as {
        uploadId: string; filePath: string; fileUrl: string;
        thumbnailPresignedUrl?: string; thumbnailFileUrl?: string;
      };

      // Start frame extraction in parallel with part presigning + upload
      const framePromise = thumbnailPresignedUrl
        ? extractFrameFromFile(uploadFile)
        : Promise.resolve(null);

      const partCount = Math.ceil(uploadFile.size / CHUNK_SIZE);
      setProgress(8);

      // 2. Presign all parts in one round-trip
      const presignRes = await fetch("/api/multipart-presign-parts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uploadId, filePath, partCount }),
      });

      if (!presignRes.ok) {
        const { error } = await presignRes.json().catch(() => ({ error: "Presign parts failed" }));
        setErr(error);
        return abortMultipart(uploadId, filePath);
      }

      const { presignedUrls } = await presignRes.json() as { presignedUrls: string[] };

      // 3. Upload parts with PART_CONCURRENCY parallel workers
      const parts: { PartNumber: number; ETag: string }[] = new Array(partCount);
      const partProgress = new Array<number>(partCount).fill(0);

      function updateProgress() {
        const avg = partProgress.reduce((a, b) => a + b, 0) / partCount;
        setProgress(10 + Math.round(avg * 75)); // 10–85%
      }

      const partQueue = Array.from({ length: partCount }, (_, i) => i);

      async function uploadPart(partIndex: number, attempt = 0): Promise<void> {
        const start = partIndex * CHUNK_SIZE;
        const chunk = uploadFile.slice(start, start + CHUNK_SIZE);

        try {
          const etag = await new Promise<string>((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.upload.onprogress = (e) => {
              if (e.lengthComputable) {
                partProgress[partIndex] = e.loaded / e.total;
                updateProgress();
              }
            };
            xhr.onload = () => {
              if (xhr.status >= 400) { reject(new Error(`Part upload failed: ${xhr.status}`)); return; }
              const etag = xhr.getResponseHeader("ETag");
              if (!etag) { reject(new Error("Missing ETag")); return; }
              partProgress[partIndex] = 1;
              updateProgress();
              resolve(etag);
            };
            xhr.onerror = () => reject(new Error("Network error"));
            xhr.open("PUT", presignedUrls[partIndex]);
            xhr.send(chunk);
          });
          parts[partIndex] = { PartNumber: partIndex + 1, ETag: etag };
        } catch (err) {
          if (attempt < PART_MAX_RETRIES) {
            partProgress[partIndex] = 0;
            await new Promise((r) => setTimeout(r, 1000 * 2 ** attempt));
            return uploadPart(partIndex, attempt + 1);
          }
          throw err;
        }
      }

      async function runPartWorker() {
        while (partQueue.length > 0) {
          const idx = partQueue.shift()!;
          await uploadPart(idx);
        }
      }

      await Promise.all(Array.from({ length: Math.min(PART_CONCURRENCY, partCount) }, runPartWorker));

      setProgress(87);

      // 4. Complete multipart
      const completeRes = await fetch("/api/multipart-complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uploadId, filePath, parts }),
      });

      if (!completeRes.ok) {
        const { error } = await completeRes.json().catch(() => ({ error: "Complete failed" }));
        setErr(error);
        return abortMultipart(uploadId, filePath);
      }

      setProgress(92);

      // Upload thumbnail if frame extracted (frame should be ready by now)
      let thumbnailUrl: string | undefined;
      if (thumbnailPresignedUrl && thumbnailFileUrl) {
        const frame = await framePromise;
        if (frame) {
          const ok = await uploadThumbnail(frame, thumbnailPresignedUrl);
          if (ok) thumbnailUrl = thumbnailFileUrl;
        }
      }

      // 5. Confirm DB record
      const confirmRes = await fetch("/api/upload-confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          albumId,
          filePath,
          fileUrl,
          mimeType: uploadFile.type || "application/octet-stream",
          fileSize: uploadFile.size,
          ...(thumbnailUrl ? { thumbnailUrl } : {}),
          ...(takenAt ? { takenAt } : {}),
        }),
      });

      let confirm: { success?: boolean; error?: string };
      try { confirm = await confirmRes.json(); }
      catch { return setErr(`Confirm error ${confirmRes.status}`); }

      if (!confirmRes.ok || confirm.error) return setErr(confirm.error ?? "Confirm failed");

      setFiles((prev) => prev.map((f) => f.id === item.id ? { ...f, status: "done", progress: 100 } : f));
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[multipart-upload] threw:", msg);
      setErr(`Network error: ${msg}`);
    }
  }

  async function handleUpload() {
    if (isUploading) return;
    const pending = files.filter((f) => f.status === "pending");
    if (!pending.length) return;

    setIsUploading(true);
    try {
      // Phase 1: extract EXIF + convert to WebP in parallel
      const preprocessed = await Promise.all(
        pending.map(async (item) => {
          setFiles((prev) => prev.map((f) => f.id === item.id ? { ...f, status: "uploading", progress: 5 } : f));
          const takenAt = await extractExifDate(item.file);
          const uploadFile = await convertToWebP(item.file);
          setFiles((prev) => prev.map((f) => f.id === item.id ? { ...f, progress: 10 } : f));
          return { item, uploadFile, takenAt };
        })
      );

      // Split by size: small → single PUT, large → multipart
      const small = preprocessed.filter((c) => c.uploadFile.size < MULTIPART_THRESHOLD);
      const large = preprocessed.filter((c) => c.uploadFile.size >= MULTIPART_THRESHOLD);

      type PresignResult = { presignedUrl: string; filePath: string; fileUrl: string };
      const presignMap = new Map<string, PresignResult>();

      // Phase 2: batch presign small files (single round-trip)
      if (small.length > 0) {
        const batchRes = await fetch("/api/presign-batch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            albumId,
            files: small.map(({ uploadFile }) => ({
              fileName: uploadFile.name,
              mimeType: uploadFile.type || "application/octet-stream",
              fileSize: uploadFile.size,
            })),
          }),
        });

        if (!batchRes.ok) {
          const { error } = await batchRes.json().catch(() => ({ error: "Presign failed" }));
          small.forEach(({ item }) =>
            setFiles((prev) => prev.map((f) => f.id === item.id ? { ...f, status: "error", error, progress: 0 } : f))
          );
        } else {
          const { results } = await batchRes.json() as { results: PresignResult[] };
          small.forEach(({ item }, i) => presignMap.set(item.id, results[i]));
        }
      }

      // Phase 3: unified worker pool for all files
      type QueueEntry =
        | { kind: "small"; item: FileItem; uploadFile: File; presign: PresignResult; takenAt: string | null }
        | { kind: "large"; item: FileItem; uploadFile: File; takenAt: string | null };

      const queue: QueueEntry[] = [
        ...small
          .filter((c) => presignMap.has(c.item.id))
          .map((c) => ({ kind: "small" as const, ...c, presign: presignMap.get(c.item.id)! })),
        ...large.map((c) => ({ kind: "large" as const, ...c })),
      ];

      const CONCURRENCY = 5;

      async function runWorker() {
        while (queue.length > 0) {
          const entry = queue.shift()!;
          if (entry.kind === "small") {
            await uploadOne(entry.item, entry.uploadFile, entry.presign, entry.takenAt);
          } else {
            await uploadOneMultipart(entry.item, entry.uploadFile, entry.takenAt);
          }
        }
      }

      await Promise.all(Array.from({ length: CONCURRENCY }, runWorker));
    } finally {
      setIsUploading(false);
      setAllDone(true);
    }
  }

  const pendingCount = files.filter((f) => f.status === "pending").length;
  const doneCount = files.filter((f) => f.status === "done").length;

  // ── Success ────────────────────────────────────────────────────────────────

  if (allDone && doneCount > 0 && pendingCount === 0) {
    return (
      <div className="rounded-2xl bg-surface-container-lowest border border-outline-variant/20 p-8 text-center shadow-sm" style={{ "--color-primary": "oklch(44% 0.16 72)" } as React.CSSProperties}>
        <div className="inline-flex items-center justify-center h-14 w-14 rounded-full bg-emerald-50 border border-emerald-200 mb-5">
          <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <h2 className="font-noto-serif text-2xl font-light text-on-surface">
          {doneCount} {doneCount === 1 ? "file" : "files"} shared
        </h2>
        <p className="mt-2 text-sm text-on-surface-variant">
          Added to <span className="font-medium text-on-surface">{albumTitle}</span>.
        </p>
        <div className="mt-6 flex flex-col gap-3">
          <button
            onClick={() => { setFiles([]); setAllDone(false); }}
            className="w-full rounded-xl py-3 text-sm font-semibold text-white transition hover:opacity-90"
            style={{ background: "oklch(44% 0.16 72)" }}
          >
            Share more
          </button>
          <Link
            href={`/join/${token}`}
            className="w-full rounded-xl border border-outline-variant/30 py-3 text-sm font-medium text-on-surface-variant hover:border-primary hover:text-primary transition text-center"
          >
            Back to album
          </Link>
        </div>
      </div>
    );
  }

  // ── Form ───────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4" style={{ "--color-primary": "oklch(44% 0.16 72)" } as React.CSSProperties}>

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={`cursor-pointer rounded-2xl border-2 border-dashed py-10 px-6 text-center transition-all ${
          isDragging
            ? "border-primary bg-primary/5"
            : "border-outline-variant/40 hover:border-primary/40 hover:bg-surface-container-low"
        }`}
      >
        <input ref={inputRef} type="file" multiple accept={ACCEPTED} className="hidden"
          onChange={(e) => e.target.files && addFiles(e.target.files)} />
        <span className="material-symbols-outlined text-primary mb-3 block" style={{ fontSize: "32px" }}>
          {isDragging ? "download" : "add_a_photo"}
        </span>
        <p className="text-sm font-medium text-on-surface">
          {isDragging ? "Drop to add" : "Select photos & videos"}
        </p>
        <p className="text-xs text-on-surface-variant mt-1">
          Photos up to 50 MB · Videos up to 500 MB
        </p>
      </div>

      {/* File list */}
      {files.length > 0 && (
        <div className="space-y-1.5">
          {files.map((item) => (
            <div key={item.id} className="flex items-center gap-3 rounded-xl bg-surface-container-lowest border border-outline-variant/20 px-4 py-3 shadow-sm">
              <div className={`shrink-0 rounded-lg p-1.5 ${
                item.status === "done" ? "bg-emerald-50" :
                item.status === "error" ? "bg-red-50" : "bg-primary/8"
              }`}>
                <span className="material-symbols-outlined" style={{
                  fontSize: "15px",
                  color: item.status === "done" ? "#059669" : item.status === "error" ? "#dc2626" : "oklch(44% 0.16 72)"
                }}>
                  {item.file.type.startsWith("video/") ? "videocam" : "image"}
                </span>
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm text-on-surface truncate">{item.file.name}</p>
                <p className="text-xs text-on-surface-variant">{formatBytes(item.file.size)}</p>
                {item.status === "uploading" && (
                  <div className="mt-1 w-full bg-outline-variant/20 rounded-full h-0.5">
                    <div className="bg-primary h-0.5 rounded-full transition-all" style={{ width: `${item.progress}%` }} />
                  </div>
                )}
                {item.status === "error" && (
                  <p className="text-xs text-red-500 mt-0.5">{item.error}</p>
                )}
              </div>

              <div className="shrink-0">
                {item.status === "done" && (
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
                {item.status === "error" && (
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" /><line x1="15" x2="9" y1="9" y2="15" /><line x1="9" x2="15" y1="9" y2="15" />
                  </svg>
                )}
                {item.status === "pending" && (
                  <button onClick={(e) => { e.stopPropagation(); setFiles((p) => p.filter((f) => f.id !== item.id)); }}
                    className="text-outline hover:text-on-surface-variant transition">
                    <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" x2="6" y1="6" y2="18" /><line x1="6" x2="18" y1="6" y2="18" />
                    </svg>
                  </button>
                )}
                {item.status === "uploading" && (
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="oklch(44% 0.16 72)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-spin">
                    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                  </svg>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload button */}
      {pendingCount > 0 && (
        <button
          onClick={handleUpload}
          disabled={isUploading}
          className="w-full rounded-xl py-3.5 text-sm font-semibold text-white transition hover:opacity-90 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ background: "oklch(44% 0.16 72)" }}
        >
          Share {pendingCount} {pendingCount === 1 ? "file" : "files"}
        </button>
      )}
    </div>
  );
}
