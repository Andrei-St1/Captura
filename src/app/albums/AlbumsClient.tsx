"use client";

import { useState, useMemo } from "react";
import Link from "next/link";

const gradients = [
  "from-violet-400 via-purple-400 to-pink-400",
  "from-amber-400 via-orange-400 to-rose-400",
  "from-sky-400 via-blue-400 to-indigo-400",
  "from-emerald-400 via-teal-400 to-cyan-400",
  "from-rose-400 via-pink-400 to-fuchsia-400",
  "from-orange-400 via-amber-400 to-yellow-400",
];

type SortKey = "created_desc" | "created_asc" | "name_asc" | "name_desc" | "date_asc" | "date_desc";
type FilterKey = "all" | "active" | "archived";

interface Album {
  id: string;
  title: string;
  status: string;
  open_date: string | null;
  close_date: string | null;
  allocated_gb: number;
  used_bytes: number | null;
  created_at: string;
  thumbnail_url: string | null;
  media?: { count: number }[];
}

function formatDate(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function formatBytes(bytes: number) {
  if (bytes === 0) return "0 B";
  const gb = bytes / 1024 ** 3;
  if (gb >= 1) return `${gb.toFixed(2)} GB`;
  const mb = bytes / 1024 ** 2;
  if (mb >= 1) return `${mb.toFixed(1)} MB`;
  return `${Math.round(bytes / 1024)} KB`;
}

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "created_desc", label: "Newest first" },
  { value: "created_asc",  label: "Oldest first" },
  { value: "name_asc",     label: "Name A–Z" },
  { value: "name_desc",    label: "Name Z–A" },
  { value: "date_desc",    label: "Event date ↓" },
  { value: "date_asc",     label: "Event date ↑" },
];

const FILTER_OPTIONS: { value: FilterKey; label: string }[] = [
  { value: "all",      label: "All" },
  { value: "active",   label: "Active" },
  { value: "archived", label: "Archived" },
];

export function AlbumsClient({ albums: initial }: { albums: Album[] }) {
  const [sort, setSort] = useState<SortKey>("created_desc");
  const [filter, setFilter] = useState<FilterKey>("all");

  const albums = useMemo(() => {
    let list = filter === "all" ? initial : initial.filter((a) => a.status === filter);

    list = [...list].sort((a, b) => {
      switch (sort) {
        case "created_asc":  return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case "created_desc": return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case "name_asc":     return a.title.localeCompare(b.title);
        case "name_desc":    return b.title.localeCompare(a.title);
        case "date_asc": {
          const aT = a.open_date ? new Date(a.open_date).getTime() : Infinity;
          const bT = b.open_date ? new Date(b.open_date).getTime() : Infinity;
          return aT - bT;
        }
        case "date_desc": {
          const aT = a.open_date ? new Date(a.open_date).getTime() : -Infinity;
          const bT = b.open_date ? new Date(b.open_date).getTime() : -Infinity;
          return bT - aT;
        }
      }
    });

    return list;
  }, [initial, sort, filter]);

  return (
    <>
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3 mb-8">
        {/* Filter pills */}
        <div className="flex items-center gap-1.5 bg-surface-container-low rounded-xl p-1">
          {FILTER_OPTIONS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setFilter(value)}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all ${
                filter === value
                  ? "bg-primary text-white shadow-sm"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Sort select */}
        <div className="relative">
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className="appearance-none bg-surface-container-low border border-outline-variant/30 rounded-xl pl-4 pr-9 py-2 text-xs font-medium text-on-surface-variant hover:border-primary focus:border-primary focus:outline-none transition cursor-pointer"
          >
            {SORT_OPTIONS.map(({ value, label }) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
          <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 material-symbols-outlined text-on-surface-variant" style={{ fontSize: "16px" }}>
            unfold_more
          </span>
        </div>

        <span className="text-xs text-on-surface-variant ml-auto">
          {albums.length} {albums.length === 1 ? "album" : "albums"}
        </span>
      </div>

      {/* Grid */}
      {albums.length === 0 ? (
        <div className="text-center py-24">
          <span className="material-symbols-outlined text-outline-variant block mb-4" style={{ fontSize: "48px" }}>
            filter_list_off
          </span>
          <p className="font-noto-serif text-xl font-light text-on-surface">No {filter !== "all" ? filter : ""} albums</p>
          <button
            onClick={() => setFilter("all")}
            className="mt-4 text-sm text-primary hover:underline underline-offset-2"
          >
            Clear filter
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {albums.map((album, i) => {
            const gradient = gradients[i % gradients.length];
            const mediaCount = album.media?.[0]?.count ?? 0;
            const percent = album.allocated_gb > 0
              ? Math.min(100, Math.round(((album.used_bytes ?? 0) / (album.allocated_gb * 1024 ** 3)) * 100))
              : 0;

            return (
              <Link
                key={album.id}
                href={`/albums/${album.id}`}
                className={`group relative bg-surface-container-lowest rounded-2xl overflow-hidden shadow-[0_12px_40px_rgba(78,68,74,0.06)] transition-all duration-500 hover:-translate-y-2 hover:shadow-xl ${
                  album.status === "archived" ? "opacity-70 hover:opacity-100" : ""
                }`}
              >
                {/* Cover */}
                <div className={`aspect-[4/3] relative overflow-hidden bg-gradient-to-br ${gradient} ${
                  album.status === "archived" ? "grayscale group-hover:grayscale-0 transition-all duration-700" : ""
                }`}>
                  {album.thumbnail_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={album.thumbnail_url} alt={album.title} className="absolute inset-0 h-full w-full object-cover" />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="material-symbols-outlined text-white/30" style={{ fontSize: "56px" }}>photo_library</span>
                    </div>
                  )}
                  <div className="absolute top-3 left-3 z-10">
                    <span className={`px-2.5 py-1 backdrop-blur-md text-[10px] font-bold tracking-widest uppercase rounded-full ${
                      album.status === "active"
                        ? "bg-white/80 text-primary"
                        : "bg-on-surface-variant/80 text-surface"
                    }`}>
                      {album.status}
                    </span>
                  </div>
                  <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>

                {/* Info */}
                <div className="p-5">
                  {album.open_date && (
                    <p className="text-[10px] tracking-[0.2em] text-secondary uppercase font-semibold mb-1">
                      {formatDate(album.open_date)}
                    </p>
                  )}
                  <h3 className="font-noto-serif text-lg text-on-surface group-hover:text-primary transition-colors truncate">
                    {album.title}
                  </h3>
                  <div className="mt-3">
                    <div className="flex justify-between mb-1">
                      <span className="text-[10px] text-on-surface-variant">Storage</span>
                      <span className="text-[10px] text-on-surface-variant">
                        {formatBytes(album.used_bytes ?? 0)} / {album.allocated_gb} GB
                      </span>
                    </div>
                    <div className="w-full bg-outline-variant/20 h-1 rounded-full">
                      <div
                        className={`h-1 rounded-full transition-all ${percent >= 90 ? "bg-red-400" : "bg-primary-container"}`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-outline-variant/10 flex items-center gap-1.5 text-[10px] text-on-surface-variant">
                    <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>photo_library</span>
                    {mediaCount.toLocaleString()} {mediaCount === 1 ? "item" : "items"}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
