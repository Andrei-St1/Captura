"use client";

import { useState, useRef, useCallback } from "react";
import Link from "next/link";

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

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export function UploadClient({ albumId, albumTitle, token }: { albumId: string; albumTitle: string; token: string }) {
  const [uploaderName, setUploaderName] = useState("");
  const [files, setFiles] = useState<FileItem[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [allDone, setAllDone] = useState(false);
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

  async function handleUpload() {
    const pending = files.filter((f) => f.status === "pending");
    if (!pending.length) return;

    for (const item of pending) {
      setFiles((prev) => prev.map((f) => f.id === item.id ? { ...f, status: "uploading", progress: 50 } : f));
      try {
        const fd = new FormData();
        fd.append("file", item.file);
        fd.append("albumId", albumId);
        if (uploaderName.trim()) fd.append("uploaderName", uploaderName.trim());

        const res = await fetch("/api/upload", { method: "POST", body: fd });
        const result = await res.json();

        if (!res.ok || result.error) {
          setFiles((prev) => prev.map((f) => f.id === item.id ? { ...f, status: "error", error: result.error ?? "Upload failed.", progress: 0 } : f));
        } else {
          setFiles((prev) => prev.map((f) => f.id === item.id ? { ...f, status: "done", progress: 100 } : f));
        }
      } catch {
        setFiles((prev) => prev.map((f) => f.id === item.id ? { ...f, status: "error", error: "Unexpected error.", progress: 0 } : f));
      }
    }
    setAllDone(true);
  }

  const pendingCount = files.filter((f) => f.status === "pending").length;
  const doneCount = files.filter((f) => f.status === "done").length;

  // ── Success ────────────────────────────────────────────────────────────────

  if (allDone && doneCount > 0 && pendingCount === 0) {
    return (
      <div className="rounded-2xl bg-surface-container-lowest border border-outline-variant/20 p-8 text-center shadow-sm">
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
            style={{ background: "linear-gradient(to right, #7d5070, #b784a7)" }}
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
    <div className="space-y-4">

      {/* Name */}
      <div>
        <label className="mb-1.5 block text-xs uppercase tracking-widest text-on-surface-variant">
          Your name <span className="normal-case tracking-normal text-outline">(optional)</span>
        </label>
        <input
          type="text"
          value={uploaderName}
          onChange={(e) => setUploaderName(e.target.value)}
          placeholder="e.g. John Smith"
          className="w-full rounded-xl border border-outline-variant/40 bg-surface-container-lowest px-4 py-3 text-on-surface placeholder-outline text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15 transition shadow-sm"
        />
      </div>

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
                  color: item.status === "done" ? "#059669" : item.status === "error" ? "#dc2626" : "#7d5070"
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
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7d5070" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-spin">
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
          className="w-full rounded-xl py-3.5 text-sm font-semibold text-white transition hover:opacity-90 shadow-sm"
          style={{ background: "linear-gradient(to right, #7d5070, #b784a7)" }}
        >
          Share {pendingCount} {pendingCount === 1 ? "file" : "files"}
        </button>
      )}
    </div>
  );
}
