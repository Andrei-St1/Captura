"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { extractExifDate, convertToWebP } from "@/lib/imagePreprocess";

interface Props {
  albumId: string;
  compact?: boolean;
}

const MULTIPART_THRESHOLD = 50 * 1024 * 1024;
const CHUNK_SIZE = 50 * 1024 * 1024;
const PART_CONCURRENCY = 4;
const PART_MAX_RETRIES = 3;
const FILE_CONCURRENCY = 3;
const PRESIGN_BATCH_SIZE = 15;
const HEIC_TYPES = new Set(["image/heic", "image/heif"]);

type PresignResult = {
  presignedUrl: string; filePath: string; fileUrl: string;
  thumbnailPresignedUrl?: string; thumbnailFileUrl?: string;
};

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

export function OwnerUploadButton({ albumId, compact }: Props) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [errors, setErrors] = useState<string[]>([]);

  async function uploadViaServer(file: File): Promise<string | null> {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("albumId", albumId);
    const res = await fetch("/api/upload-owner", { method: "POST", body: fd });
    const data = await res.json();
    if (!res.ok) return data.error ?? "Upload failed";
    return null;
  }

  async function uploadSmall(file: File, presign: PresignResult, takenAt: string | null): Promise<string | null> {
    const framePromise = presign.thumbnailPresignedUrl && file.type.startsWith("video/")
      ? extractFrameFromFile(file)
      : Promise.resolve(null);

    const r2Status = await new Promise<number>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.onload = () => resolve(xhr.status);
      xhr.onerror = () => reject(new Error("Network error"));
      xhr.open("PUT", presign.presignedUrl);
      xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
      xhr.send(file);
    });

    if (r2Status >= 400) return `Storage error ${r2Status}`;

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
        mimeType: file.type || "application/octet-stream",
        fileSize: file.size,
        ...(thumbnailUrl ? { thumbnailUrl } : {}),
        ...(takenAt ? { takenAt } : {}),
      }),
    });

    if (!confirmRes.ok) {
      const { error } = await confirmRes.json().catch(() => ({ error: "Confirm failed" }));
      return error;
    }
    return null;
  }

  async function uploadMultipart(file: File, takenAt: string | null): Promise<string | null> {
    // Init multipart upload + presign all parts in one round-trip
    const partCount = Math.ceil(file.size / CHUNK_SIZE);
    const initRes = await fetch("/api/multipart-init-owner", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        albumId,
        fileName: file.name,
        mimeType: file.type || "application/octet-stream",
        fileSize: file.size,
        partCount,
      }),
    });

    if (!initRes.ok) {
      const { error } = await initRes.json().catch(() => ({ error: "Init failed" }));
      return error;
    }

    const { uploadId, filePath, fileUrl, presignedUrls, thumbnailPresignedUrl, thumbnailFileUrl } = await initRes.json() as {
      uploadId: string; filePath: string; fileUrl: string;
      presignedUrls: string[];
      thumbnailPresignedUrl?: string; thumbnailFileUrl?: string;
    };

    const framePromise = thumbnailPresignedUrl ? extractFrameFromFile(file) : Promise.resolve(null);

    const parts: { PartNumber: number; ETag: string }[] = new Array(partCount);
    const partQueue = Array.from({ length: partCount }, (_, i) => i);

    async function uploadPart(idx: number, attempt = 0): Promise<void> {
      const chunk = file.slice(idx * CHUNK_SIZE, (idx + 1) * CHUNK_SIZE);
      try {
        const etag = await new Promise<string>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.onload = () => {
            if (xhr.status >= 400) { reject(new Error(`Part ${idx + 1} failed: ${xhr.status}`)); return; }
            const etag = xhr.getResponseHeader("ETag");
            if (!etag) { reject(new Error(`Missing ETag for part ${idx + 1}`)); return; }
            resolve(etag);
          };
          xhr.onerror = () => reject(new Error("Network error"));
          xhr.open("PUT", presignedUrls[idx]);
          xhr.send(chunk);
        });
        parts[idx] = { PartNumber: idx + 1, ETag: etag };
      } catch (err) {
        if (attempt < PART_MAX_RETRIES) {
          await new Promise((r) => setTimeout(r, 1000 * 2 ** attempt));
          return uploadPart(idx, attempt + 1);
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

    try {
      await Promise.all(Array.from({ length: Math.min(PART_CONCURRENCY, partCount) }, runPartWorker));
    } catch (err) {
      await abortMultipart(uploadId, filePath);
      return err instanceof Error ? err.message : "Upload failed";
    }

    const completeRes = await fetch("/api/multipart-complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ uploadId, filePath, parts }),
    });

    if (!completeRes.ok) {
      const { error } = await completeRes.json().catch(() => ({ error: "Complete failed" }));
      await abortMultipart(uploadId, filePath);
      return error;
    }

    let thumbnailUrl: string | undefined;
    if (thumbnailPresignedUrl && thumbnailFileUrl) {
      const frame = await framePromise;
      if (frame) {
        const ok = await uploadThumbnail(frame, thumbnailPresignedUrl);
        if (ok) thumbnailUrl = thumbnailFileUrl;
      }
    }

    const confirmRes = await fetch("/api/upload-confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        albumId,
        filePath,
        fileUrl,
        mimeType: file.type || "application/octet-stream",
        fileSize: file.size,
        ...(thumbnailUrl ? { thumbnailUrl } : {}),
        ...(takenAt ? { takenAt } : {}),
      }),
    });

    if (!confirmRes.ok) {
      const { error } = await confirmRes.json().catch(() => ({ error: "Confirm failed" }));
      return error;
    }
    return null;
  }

  async function handleFiles(files: FileList) {
    if (!files.length) return;
    setUploading(true);
    setErrors([]);

    const all = Array.from(files);
    let done = 0;
    setProgress({ done: 0, total: all.length });

    const errs: string[] = [];

    type Task =
      | { kind: "heic"; file: File }
      | { kind: "small"; file: File; processedFile: File; takenAt: string | null; presign: PresignResult }
      | { kind: "large"; file: File; processedFile: File; takenAt: string | null };

    const queue: Task[] = [];
    let allQueued = false;

    // Workers start immediately — drain queue as items arrive
    async function runWorker() {
      while (!allQueued || queue.length > 0) {
        if (queue.length === 0) {
          await new Promise<void>((r) => setTimeout(r, 30));
          continue;
        }
        const task = queue.shift()!;
        let err: string | null = null;

        if (task.kind === "heic") {
          err = await uploadViaServer(task.file);
        } else if (task.kind === "small") {
          err = await uploadSmall(task.processedFile, task.presign, task.takenAt).catch((e: Error) => e.message);
        } else {
          err = await uploadMultipart(task.processedFile, task.takenAt).catch((e: Error) => e.message);
        }

        if (err) errs.push(`${task.file.name}: ${err}`);
        done++;
        setProgress({ done, total: all.length });
      }
    }

    const workerPromises = Array.from({ length: Math.min(FILE_CONCURRENCY, all.length) }, runWorker);

    // Serialize presign calls via promise chain; flush every PRESIGN_BATCH_SIZE files
    const smallBuffer: { file: File; processedFile: File; takenAt: string | null }[] = [];
    let presignChain = Promise.resolve();

    function flushSmallBuffer(force = false) {
      if (smallBuffer.length === 0) return;
      if (!force && smallBuffer.length < PRESIGN_BATCH_SIZE) return;
      const batch = smallBuffer.splice(0);
      presignChain = presignChain.then(async () => {
        const res = await fetch("/api/presign-owner-batch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            albumId,
            files: batch.map((p) => ({
              fileName: p.processedFile.name,
              mimeType: p.processedFile.type || "application/octet-stream",
              fileSize: p.processedFile.size,
            })),
          }),
        });
        if (!res.ok) {
          const { error } = await res.json().catch(() => ({ error: "Presign failed" }));
          batch.forEach((p) => {
            errs.push(`${p.file.name}: ${error}`);
            done++;
            setProgress({ done, total: all.length });
          });
          return;
        }
        const { results } = await res.json() as { results: PresignResult[] };
        batch.forEach((p, i) => {
          if (results[i]) queue.push({ kind: "small", ...p, presign: results[i] });
        });
      });
    }

    // Preprocess all files in parallel; HEIC and large files enter queue immediately,
    // small files buffer for rolling batch presign
    await Promise.all(
      all.map(async (file) => {
        if (HEIC_TYPES.has(file.type)) {
          queue.push({ kind: "heic", file });
          return;
        }

        const [takenAt, processedFile] = file.type.startsWith("image/")
          ? await Promise.all([extractExifDate(file), convertToWebP(file)])
          : [null, file];

        if (processedFile.size >= MULTIPART_THRESHOLD) {
          queue.push({ kind: "large", file, processedFile, takenAt });
        } else {
          smallBuffer.push({ file, processedFile, takenAt });
          flushSmallBuffer(false);
        }
      })
    );

    flushSmallBuffer(true);
    await presignChain;
    allQueued = true;
    await Promise.all(workerPromises);

    setUploading(false);
    setProgress(null);
    setErrors(errs);
    if (inputRef.current) inputRef.current.value = "";
    router.refresh();
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <button
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className={compact ? "ap-btn ap-btn-ghost" : "gp-btn gp-btn-primary"}
      >
        {uploading ? (
          <>
            <svg className="animate-spin" xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
            </svg>
            {progress ? `${progress.done}/${progress.total}…` : "Uploading…"}
          </>
        ) : (
          <>
            <span className="material-symbols-outlined" style={{ fontSize: compact ? "15px" : "18px" }}>upload</span>
            {compact ? "Upload" : "Upload photos"}
          </>
        )}
      </button>

      {errors.length > 0 && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-xs text-red-600 max-w-xs">
          {errors.map((e, i) => <p key={i}>{e}</p>)}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*,video/*"
        multiple
        className="hidden"
        onChange={(e) => e.target.files && handleFiles(e.target.files)}
      />
    </div>
  );
}
