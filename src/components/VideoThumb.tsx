"use client";

import { useState, useEffect, useRef } from "react";

async function extractFrame(src: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const v = document.createElement("video");
    v.crossOrigin = "anonymous";
    v.muted      = true;
    v.playsInline = true;
    v.preload    = "metadata";

    v.addEventListener("loadedmetadata", () => {
      // Seek to 5% of duration, capped at 2s — avoids black opening frames
      v.currentTime = Math.min(2, (v.duration || 0) * 0.05);
    }, { once: true });

    v.addEventListener("seeked", () => {
      try {
        const MAX = 720;
        const w = v.videoWidth  || 320;
        const h = v.videoHeight || 240;
        const scale = Math.min(1, MAX / Math.max(w, h));
        const canvas = document.createElement("canvas");
        canvas.width  = Math.round(w * scale);
        canvas.height = Math.round(h * scale);
        canvas.getContext("2d")!.drawImage(v, 0, 0, canvas.width, canvas.height);
        v.src = "";
        resolve(canvas.toDataURL("image/jpeg", 0.82));
      } catch (e) {
        v.src = "";
        reject(e);
      }
    }, { once: true });

    v.addEventListener("error", () => { v.src = ""; reject(new Error("load failed")); }, { once: true });

    v.src = src;
  });
}

interface Props {
  src: string;
  imgClassName?: string;
  imgStyle?: React.CSSProperties;
  placeholder: React.ReactNode;
}

export function VideoThumb({ src, imgClassName, imgStyle, placeholder }: Props) {
  const [thumb, setThumb] = useState<string | null>(null);
  const wrapRef   = useRef<HTMLDivElement>(null);
  const attempted = useRef(false);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;

    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !attempted.current) {
        attempted.current = true;
        obs.disconnect();
        extractFrame(src)
          .then(setThumb)
          .catch(() => {}); // silently keep placeholder on CORS / load failure
      }
    }, { rootMargin: "400px" }); // start 400px before entering viewport

    obs.observe(el);
    return () => obs.disconnect();
  }, [src]);

  return (
    <div ref={wrapRef}>
      {thumb
        ? <img src={thumb} className={imgClassName} style={imgStyle} alt="" />
        : placeholder}
    </div>
  );
}
