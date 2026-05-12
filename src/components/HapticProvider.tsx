"use client";

import { useEffect } from "react";

export function HapticProvider() {
  useEffect(() => {
    if (!navigator.vibrate) return;
    function onTouch(e: TouchEvent) {
      const target = e.target as Element;
      if (target.closest('button:not(:disabled), a[href], [role="button"]')) {
        navigator.vibrate(8);
      }
    }
    document.addEventListener("touchstart", onTouch, { passive: true });
    return () => document.removeEventListener("touchstart", onTouch);
  }, []);
  return null;
}
