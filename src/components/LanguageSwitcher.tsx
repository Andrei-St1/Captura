"use client";

import { useLocale } from "next-intl";
import { useTransition } from "react";
import { setLocale } from "@/i18n/setLocale";

interface Props {
  className?: string;
}

export function LanguageSwitcher({ className }: Props) {
  const locale = useLocale();
  const [isPending, startTransition] = useTransition();

  function toggle() {
    const next = locale === "ro" ? "en" : "ro";
    startTransition(() => { setLocale(next); });
  }

  return (
    <button
      onClick={toggle}
      disabled={isPending}
      className={className}
      title="Switch language / Schimbă limba"
    >
      {locale === "ro" ? "EN" : "RO"}
    </button>
  );
}
