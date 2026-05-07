"use client";

import { useState, useEffect, useRef } from "react";

async function extractFrame(src: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const v = document.createElement("video");
    v.crossOrigin  = "anonymous";
    v.muted        = true;
    v.playsInline  = true;
    v.preload      = "auto"; // "metadata" alone often isn't enough to render a frame

    let done = false;

    function capture() {
      if (done) return;
      done = true;
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
    }

    // After metadata: seek to first frame
    v.addEventListener("loadedmetadata", () => {
      v.currentTime = 0.001; // non-zero ensures seeked fires on all browsers
    }, { once: true });

    // Primary path: seeked fires → capture
    v.addEventListener("seeked", capture, { once: true });

    // Fallback: some formats (MOV, HEVC) don't fire seeked reliably —
    // capture as soon as the first frame's data is available
    v.addEventListener("loadeddata", () => {
      setTimeout(capture, 200);
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
