"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  albumId: string;
}

export function OwnerUploadButton({ albumId }: Props) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [errors, setErrors] = useState<string[]>([]);

  async function handleFiles(files: FileList) {
    if (!files.length) return;
    setUploading(true);
    setErrors([]);
    setProgress({ done: 0, total: files.length });

    const errs: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const fd = new FormData();
      fd.append("file", file);
      fd.append("albumId", albumId);

      try {
        const res = await fetch("/api/upload-owner", { method: "POST", body: fd });
        const data = await res.json();
        if (!res.ok) errs.push(`${file.name}: ${data.error ?? "failed"}`);
      } catch {
        errs.push(`${file.name}: network error`);
      }

      setProgress({ done: i + 1, total: files.length });
    }

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
        className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-primary to-primary-container px-5 py-2.5 text-sm font-semibold text-white shadow-md hover:scale-[1.02] transition-all disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100"
      >
        {uploading ? (
          <>
            <svg className="animate-spin" xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
            </svg>
            {progress ? `Uploading ${progress.done}/${progress.total}…` : "Uploading…"}
          </>
        ) : (
          <>
            <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>upload</span>
            Upload photos
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
