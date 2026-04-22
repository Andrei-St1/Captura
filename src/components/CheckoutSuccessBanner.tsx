"use client";

import { useState } from "react";
import Link from "next/link";

export default function CheckoutSuccessBanner({ planName }: { planName: string | null }) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  return (
    <div className="mb-10 rounded-xl bg-emerald-50 border border-emerald-200 px-6 py-5 flex items-center justify-between gap-4">
      <div className="flex items-center gap-4">
        <span className="material-symbols-outlined text-emerald-500 shrink-0">check_circle</span>
        <div>
          <p className="font-semibold text-emerald-800">
            {planName ? `Welcome to the ${planName} plan!` : "Subscription activated!"}
          </p>
          <p className="text-sm text-emerald-700 mt-0.5">
            Your plan is now active. Create your first album and start collecting memories.
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <Link
          href="/albums/create"
          className="rounded-lg bg-emerald-500 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-400 transition"
        >
          Create album →
        </Link>
        <button
          onClick={() => setDismissed(true)}
          className="text-emerald-600 hover:text-emerald-800 transition"
          aria-label="Dismiss"
        >
          <span className="material-symbols-outlined">close</span>
        </button>
      </div>
    </div>
  );
}
