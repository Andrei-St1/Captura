"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { extractExifDate, convertToWebP } from "@/lib/imagePreprocess";
import { IMMUTABLE_CACHE } from "@/lib/cacheControl";

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
const FILE_CONCURRENCY = 3;
const PRESIGN_BATCH_SIZE = 15;
const PREPROCESS_CONCURRENCY = 3;
const CONFIRM_BATCH_SIZE = 10;
const CONFIRM_IDLE_MS = 400;

interface ConfirmPayload {
  filePath: string;
  fileUrl: string;
  mimeType: string;
  fileSize: number;
  thumbnailUrl?: string;
  takenAt?: string;
}

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
    xhr.setRequestHeader("Cache-Control", IMMUTABLE_CACHE);
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
  const t = useTranslations("upload");
  const [files, setFiles] = useState<FileItem[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [allDone, setAllDone] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // ── Batched confirm: lanes enqueue after the R2 upload and move on immediately ──
  const confirmBuf = useRef<{ id: string; payload: ConfirmPayload }[]>([]);
  const confirmTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const confirmInflight = useRef<Set<Promise<void>>>(new Set());
  // Files already stored in R2 whose confirm is pending/failed; retry re-confirms instead of re-uploading
  const uploadedPayloads = useRef<Map<string, ConfirmPayload>>(new Map());

  function failConfirm(ids: string[], error: string) {
    const set = new Set(ids);
    setFiles((prev) => prev.map((f) => set.has(f.id) ? { ...f, status: "error", error, progress: 0 } : f));
  }

  function flushConfirm() {
    if (confirmTimer.current) { clearTimeout(confirmTimer.current); confirmTimer.current = null; }
    if (confirmBuf.current.length === 0) return;
    const batch = confirmBuf.current.splice(0);
    const p: Promise<void> = (async () => {
      try {
        const res = await fetch("/api/upload-confirm-batch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ albumId, items: batch.map((b) => b.payload) }),
        });
        let data: { results?: { index: number; ok: boolean; error?: string }[]; error?: string } = {};
        try { data = await res.json(); } catch { /* handled below */ }
        if (!res.ok || !data.results) {
          failConfirm(batch.map((b) => b.id), data.error ?? `Confirm error ${res.status}`);
          return;
        }
        const okIds = new Set<string>();
        const failed = new Map<string, string>();
        batch.forEach((b, i) => {
          const r = data.results!.find((x) => x.index === i);
          if (r?.ok) okIds.add(b.id);
          else failed.set(b.id, r?.error ?? "Confirm failed");
        });
        okIds.forEach((id) => uploadedPayloads.current.delete(id));
        setFiles((prev) => prev.map((f) => {
          if (okIds.has(f.id)) return { ...f, status: "done", progress: 100, error: undefined };
          const err = failed.get(f.id);
          return err !== undefined ? { ...f, status: "error", error: err, progress: 0 } : f;
        }));
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        failConfirm(batch.map((b) => b.id), `Network error: ${msg}`);
      }
    })();
    confirmInflight.current.add(p);
    p.finally(() => confirmInflight.current.delete(p));
  }

  function enqueueConfirm(id: string, payload: ConfirmPayload) {
    uploadedPayloads.current.set(id, payload);
    confirmBuf.current.push({ id, payload });
    if (confirmBuf.current.length >= CONFIRM_BATCH_SIZE) { flushConfirm(); return; }
    if (confirmTimer.current) clearTimeout(confirmTimer.current);
    confirmTimer.current = setTimeout(flushConfirm, CONFIRM_IDLE_MS);
  }

  async function drainConfirms() {
    flushConfirm();
    while (confirmInflight.current.size > 0) {
      await Promise.all(Array.from(confirmInflight.current));
      flushConfirm();
    }
  }

  useEffect(() => () => { if (confirmTimer.current) clearTimeout(confirmTimer.current); }, []);

  useEffect(() => {
    if (files.length === 0) return;
    const allSettled = files.every(f => f.status === "done" || f.status === "error");
    const anyDone = files.some(f => f.status === "done");
    if (allSettled && anyDone) setAllDone(true);
  }, [files]);

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
      // and PUT the thumbnail concurrently with the main upload.
      const { thumbnailPresignedUrl: thumbPutUrl, thumbnailFileUrl: thumbFileUrl } = presign;
      const thumbPromise: Promise<string | undefined> = thumbPutUrl && thumbFileUrl && uploadFile.type.startsWith("video/")
        ? extractFrameFromFile(uploadFile)
            .then(async (frame) => (frame && (await uploadThumbnail(frame, thumbPutUrl)) ? thumbFileUrl : undefined))
            .catch(() => undefined)
        : Promise.resolve(undefined);

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
        xhr.setRequestHeader("Cache-Control", IMMUTABLE_CACHE);
        xhr.send(uploadFile);
      });

      if (r2Status >= 400) return setErr(`Storage error ${r2Status}`);

      setProgress(85);

      // Thumbnail PUT has been running alongside the main upload; normally already settled
      const thumbnailUrl = await thumbPromise;

      enqueueConfirm(item.id, {
        filePath: presign.filePath,
        fileUrl: presign.fileUrl,
        mimeType: uploadFile.type || "application/octet-stream",
        fileSize: uploadFile.size,
        ...(thumbnailUrl ? { thumbnailUrl } : {}),
        ...(takenAt ? { takenAt } : {}),
      });
      setProgress(95);
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

      // 1. Init multipart upload + presign all parts in one round-trip
      const partCount = Math.ceil(uploadFile.size / CHUNK_SIZE);
      const initRes = await fetch("/api/multipart-init", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          albumId,
          fileName: uploadFile.name,
          mimeType: uploadFile.type || "application/octet-stream",
          fileSize: uploadFile.size,
          partCount,
        }),
      });

      if (!initRes.ok) {
        const { error } = await initRes.json().catch(() => ({ error: "Init failed" }));
        return setErr(error);
      }

      const { uploadId, filePath, fileUrl, presignedUrls, thumbnailPresignedUrl, thumbnailFileUrl } = await initRes.json() as {
        uploadId: string; filePath: string; fileUrl: string;
        presignedUrls: string[];
        thumbnailPresignedUrl?: string; thumbnailFileUrl?: string;
      };

      // Start frame extraction in parallel with chunk uploads
      // and PUT the thumbnail concurrently (don't wait for the main upload to finish)
      const thumbPromise: Promise<string | undefined> = thumbnailPresignedUrl && thumbnailFileUrl
        ? extractFrameFromFile(uploadFile)
            .then(async (frame) => (frame && (await uploadThumbnail(frame, thumbnailPresignedUrl)) ? thumbnailFileUrl : undefined))
            .catch(() => undefined)
        : Promise.resolve(undefined);

      setProgress(8);

      // 2. Upload parts with PART_CONCURRENCY parallel workers
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

      // 3. Complete multipart
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

      const thumbnailUrl = await thumbPromise;

      // 4. Confirm DB record
      enqueueConfirm(item.id, {
        filePath,
        fileUrl,
        mimeType: uploadFile.type || "application/octet-stream",
        fileSize: uploadFile.size,
        ...(thumbnailUrl ? { thumbnailUrl } : {}),
        ...(takenAt ? { takenAt } : {}),
      });
      setProgress(95);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[multipart-upload] threw:", msg);
      setErr(`Network error: ${msg}`);
    }
  }

  async function retryFile(item: FileItem) {
    setAllDone(false);

    // Already in R2 but confirm failed: just re-confirm
    const stored = uploadedPayloads.current.get(item.id);
    if (stored) {
      setFiles((prev) => prev.map((f) => f.id === item.id ? { ...f, status: "uploading", progress: 95, error: undefined } : f));
      enqueueConfirm(item.id, stored);
      return;
    }

    setFiles((prev) => prev.map((f) => f.id === item.id ? { ...f, status: "uploading", progress: 5, error: undefined } : f));

    const [takenAt, uploadFile] = await Promise.all([
      extractExifDate(item.file),
      convertToWebP(item.file),
    ]);

    setFiles((prev) => prev.map((f) => f.id === item.id ? { ...f, progress: 10 } : f));

    if (uploadFile.size >= MULTIPART_THRESHOLD) {
      await uploadOneMultipart(item, uploadFile, takenAt);
    } else {
      const res = await fetch("/api/presign-batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          albumId,
          files: [{ fileName: uploadFile.name, mimeType: uploadFile.type || "application/octet-stream", fileSize: uploadFile.size }],
        }),
      });
      if (!res.ok) {
        const { error } = await res.json().catch(() => ({ error: "Presign failed" }));
        setFiles((prev) => prev.map((f) => f.id === item.id ? { ...f, status: "error", error, progress: 0 } : f));
        return;
      }
      const { results } = await res.json() as { results: { presignedUrl: string; filePath: string; fileUrl: string }[] };
      if (!results[0]) {
        setFiles((prev) => prev.map((f) => f.id === item.id ? { ...f, status: "error", error: "Presign failed", progress: 0 } : f));
        return;
      }
      await uploadOne(item, uploadFile, results[0], takenAt);
    }
  }

  async function handleUpload() {
    if (isUploading) return;
    const pending = files.filter((f) => f.status === "pending");
    if (!pending.length) return;

    setIsUploading(true);
    try {
      type PresignResult = { presignedUrl: string; filePath: string; fileUrl: string };
      type QueueEntry =
        | { kind: "small"; item: FileItem; uploadFile: File; presign: PresignResult; takenAt: string | null }
        | { kind: "large"; item: FileItem; uploadFile: File; takenAt: string | null };

      const queue: QueueEntry[] = [];
      let closed = false;
      // Idle workers park a resolver here; pushEntry/closeQueue wake them (no polling)
      const waiters: (() => void)[] = [];
      function pushEntry(entry: QueueEntry) {
        queue.push(entry);
        waiters.shift()?.();
      }
      function closeQueue() {
        closed = true;
        waiters.splice(0).forEach((w) => w());
      }

      // Workers start immediately — drain queue as items arrive
      async function runWorker() {
        for (;;) {
          while (queue.length === 0 && !closed) {
            await new Promise<void>((r) => waiters.push(r));
          }
          if (queue.length === 0) return;
          const entry = queue.shift()!;
          if (entry.kind === "small") {
            await uploadOne(entry.item, entry.uploadFile, entry.presign, entry.takenAt);
          } else {
            await uploadOneMultipart(entry.item, entry.uploadFile, entry.takenAt);
          }
        }
      }

      const workerPromises = Array.from({ length: FILE_CONCURRENCY }, runWorker);

      // Serialize presign calls via promise chain; flush every PRESIGN_BATCH_SIZE files
      const smallBuffer: { item: FileItem; uploadFile: File; takenAt: string | null }[] = [];
      let presignChain = Promise.resolve();

      function flushSmallBuffer(force = false) {
        if (smallBuffer.length === 0) return;
        if (!force && smallBuffer.length < PRESIGN_BATCH_SIZE) return;
        const batch = smallBuffer.splice(0);
        presignChain = presignChain.then(async () => {
          const res = await fetch("/api/presign-batch", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              albumId,
              files: batch.map(({ uploadFile }) => ({
                fileName: uploadFile.name,
                mimeType: uploadFile.type || "application/octet-stream",
                fileSize: uploadFile.size,
              })),
            }),
          });
          if (!res.ok) {
            const { error } = await res.json().catch(() => ({ error: "Presign failed" }));
            batch.forEach(({ item }) =>
              setFiles((prev) => prev.map((f) =>
                f.id === item.id ? { ...f, status: "error", error, progress: 0 } : f
              ))
            );
            return;
          }
          const { results } = await res.json() as { results: PresignResult[] };
          batch.forEach((b, i) => {
            if (results[i]) pushEntry({ kind: "small", ...b, presign: results[i] });
          });
        });
      }

      // Preprocess all files in parallel; large files enter queue immediately,
      // small files buffer for rolling batch presign
      // Preprocessing is bounded to PREPROCESS_CONCURRENCY at a time to cap memory use.
      let nextIdx = 0;
      async function preprocessWorker() {
        while (nextIdx < pending.length) {
          const item = pending[nextIdx++];
          setFiles((prev) => prev.map((f) =>
            f.id === item.id ? { ...f, status: "uploading", progress: 5 } : f
          ));
          const [takenAt, uploadFile] = await Promise.all([
            extractExifDate(item.file),
            convertToWebP(item.file),
          ]);
          setFiles((prev) => prev.map((f) =>
            f.id === item.id ? { ...f, progress: 10 } : f
          ));

          if (uploadFile.size >= MULTIPART_THRESHOLD) {
            pushEntry({ kind: "large", item, uploadFile, takenAt });
          } else {
            smallBuffer.push({ item, uploadFile, takenAt });
            flushSmallBuffer(false);
          }
        }
      }
      await Promise.all(
        Array.from({ length: Math.min(PREPROCESS_CONCURRENCY, pending.length) }, preprocessWorker)
      );

      flushSmallBuffer(true);
      await presignChain;
      closeQueue();
      await Promise.all(workerPromises);
      await drainConfirms();
    } finally {
      await drainConfirms();
      setIsUploading(false);
      setAllDone(true);
    }
  }

  const pendingCount = files.filter((f) => f.status === "pending").length;
  const doneCount = files.filter((f) => f.status === "done").length;

  // ── Success ────────────────────────────────────────────────────────────────

  if (allDone && doneCount > 0 && pendingCount === 0) {
    return (
      <div className="rounded-2xl bg-surface-container-lowest border border-outline-variant/20 p-8 text-center shadow-sm" style={{ "--color-primary": "var(--cs-accent)" } as React.CSSProperties}>
        <div className="inline-flex items-center justify-center h-14 w-14 rounded-full bg-emerald-50 border border-emerald-200 mb-5">
          <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <h2 className="font-noto-serif text-2xl font-light text-on-surface">
          {doneCount} {doneCount === 1 ? "file" : "files"} {t("successTitle")}
        </h2>
        <p className="mt-2 text-sm text-on-surface-variant">
          {t("successSubtitle")} <span className="font-medium text-on-surface">{albumTitle}</span>.
        </p>
        <div className="mt-6 flex flex-col gap-3">
          <button
            onClick={() => { setFiles([]); setAllDone(false); }}
            className="w-full rounded-xl py-3 text-sm font-semibold text-white transition hover:opacity-90"
            style={{ background: "var(--cs-accent)" }}
          >
            {t("shareMore")}
          </button>
          <Link
            href={`/join/${token}`}
            className="w-full rounded-xl border border-outline-variant/30 py-3 text-sm font-medium text-on-surface-variant hover:border-primary hover:text-primary transition text-center"
          >
            {t("backToAlbum")}
          </Link>
        </div>
      </div>
    );
  }

  // ── Form ───────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4" style={{ "--color-primary": "var(--cs-accent)" } as React.CSSProperties}>

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className="cursor-pointer rounded-2xl border-2 border-dashed py-10 px-6 text-center transition-all border-outline-variant/40 hover:bg-[var(--cs-accent-faint)]"
        style={isDragging ? { borderColor: "var(--cs-accent)", background: "var(--cs-accent-faint)" } : {}}
      >
        <input ref={inputRef} type="file" multiple accept={ACCEPTED} className="hidden"
          onChange={(e) => e.target.files && addFiles(e.target.files)} />
        <span className="mb-3 mx-auto block" style={{ width: 32, height: 32, lineHeight: 0, color: "var(--cs-accent)" }}>
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            {isDragging ? (
              <>
                <path d="M12 3v12" />
                <path d="m7 10 5 5 5-5" />
                <path d="M5 21h14" />
              </>
            ) : (
              <>
                <path d="M14.5 4h-5L7.5 7H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-2.5l-2-3Z" />
                <circle cx="12" cy="13" r="3.5" />
              </>
            )}
          </svg>
        </span>
        <p className="text-sm font-medium text-on-surface">
          {isDragging ? t("dropzone.dropHint") : t("dropzone.label")}
        </p>
        <p className="text-xs text-on-surface-variant mt-1">
          {t("dropzone.hint")}
        </p>
      </div>

      <p className="text-xs text-on-surface-variant text-center px-2">
        {t("batchTip")}
      </p>

      {/* File list */}
      {files.length > 0 && (
        <div className="space-y-1.5">
          {files.map((item) => (
            <div key={item.id} className="flex items-center gap-3 rounded-xl bg-surface-container-lowest border border-outline-variant/20 px-4 py-3 shadow-sm">
              <div className={`shrink-0 rounded-lg p-1.5 ${
                item.status === "done" ? "bg-emerald-50" :
                item.status === "error" ? "bg-red-50" : ""
              }`} style={item.status !== "done" && item.status !== "error" ? { background: "var(--cs-accent-faint)" } : {}}>
                <span className="block" style={{
                  width: 15, height: 15, lineHeight: 0,
                  color: item.status === "done" ? "#059669" : item.status === "error" ? "#dc2626" : "var(--cs-accent)"
                }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    {item.file.type.startsWith("video/") ? (
                      <>
                        <path d="m22 8-6 4 6 4V8Z" />
                        <rect x="2" y="6" width="14" height="12" rx="2" />
                      </>
                    ) : (
                      <>
                        <rect x="3" y="3" width="18" height="18" rx="2" />
                        <circle cx="9" cy="9" r="2" />
                        <path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21" />
                      </>
                    )}
                  </svg>
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
                  <button
                    onClick={(e) => { e.stopPropagation(); retryFile(item); }}
                    title="Retry"
                    className="text-on-surface-variant hover:text-on-surface transition"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" />
                    </svg>
                  </button>
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
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--cs-accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-spin">
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
          style={{ background: "var(--cs-accent)" }}
        >
          Share {pendingCount} {pendingCount === 1 ? "file" : "files"}
        </button>
      )}
    </div>
  );
}
