"use client";

import { useState, useMemo } from "react";
import Link from "next/link";

interface Album {
  id: string;
  title: string;
  description: string | null;
  status: string;
  open_date: string | null;
  close_date: string | null;
  allocated_gb: number;
  used_bytes: number | null;
  created_at: string;
  thumbnail_url: string | null;
  media?: { count: number }[];
}

interface Props {
  albums: Album[];
  totalCount: number;
  activeCount: number;
}

type Filter = "all" | "active" | "scheduled" | "archived";
type Sort = "recent" | "name" | "media" | "storage";
type View = "grid" | "list";

const COVER_GRADIENTS = [
  ["oklch(78% 0.08 30)", "oklch(70% 0.06 330)"],
  ["oklch(72% 0.08 280)", "oklch(68% 0.06 260)"],
  ["oklch(74% 0.09 155)", "oklch(66% 0.07 135)"],
  ["oklch(70% 0.07 210)", "oklch(64% 0.05 190)"],
  ["oklch(76% 0.08 50)", "oklch(68% 0.06 30)"],
  ["oklch(72% 0.08 320)", "oklch(66% 0.06 300)"],
];

function getStatus(album: Album): "active" | "scheduled" | "archived" {
  if (album.status === "archived") return "archived";
  const now = new Date();
  if (album.open_date && new Date(album.open_date) > now) return "scheduled";
  return "active";
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const gb = bytes / 1024 ** 3;
  if (gb >= 1) return `${gb.toFixed(2)} GB`;
  const mb = bytes / 1024 ** 2;
  if (mb >= 1) return `${mb.toFixed(1)} MB`;
  return `${Math.round(bytes / 1024)} KB`;
}

/* ── SVG ICONS ── */
function IconCamera() {
  return (
    <svg viewBox="0 0 12 12" width={12} height={12} stroke="currentColor" fill="none" strokeWidth={1.5}>
      <rect x="1" y="2" width="10" height="8" rx="1" />
      <circle cx="6" cy="6" r="2" />
    </svg>
  );
}

function IconCalendar() {
  return (
    <svg viewBox="0 0 12 12" width={12} height={12} stroke="currentColor" fill="none" strokeWidth={1.5}>
      <rect x="1" y="1" width="10" height="10" rx="1" />
      <path d="M1 5h10M4 1v4" />
    </svg>
  );
}

function IconSearch() {
  return (
    <svg viewBox="0 0 16 16" width={13} height={13} stroke="currentColor" fill="none" strokeWidth={1.5}>
      <circle cx="7" cy="7" r="4" />
      <path d="M11 11l3 3" />
    </svg>
  );
}

function IconGrid() {
  return (
    <svg viewBox="0 0 14 14" width={14} height={14} stroke="currentColor" fill="none" strokeWidth={1.5}>
      <rect x="1" y="1" width="5" height="5" rx="1" />
      <rect x="8" y="1" width="5" height="5" rx="1" />
      <rect x="1" y="8" width="5" height="5" rx="1" />
      <rect x="8" y="8" width="5" height="5" rx="1" />
    </svg>
  );
}

function IconList() {
  return (
    <svg viewBox="0 0 14 14" width={14} height={14} stroke="currentColor" fill="none" strokeWidth={1.5}>
      <rect x="1" y="2" width="12" height="3" rx="1" />
      <rect x="1" y="6.5" width="12" height="3" rx="1" />
      <rect x="1" y="11" width="12" height="3" rx="1" />
    </svg>
  );
}

function IconChevron() {
  return (
    <svg viewBox="0 0 12 12" width={12} height={12} stroke="currentColor" fill="none" strokeWidth={2}>
      <path d="M2 4l4 4 4-4" />
    </svg>
  );
}

function IconPlus() {
  return (
    <svg viewBox="0 0 14 14" width={13} height={13} stroke="currentColor" fill="none" strokeWidth={2.5}>
      <path d="M7 1v12M1 7h12" />
    </svg>
  );
}

function IconPhoto() {
  return (
    <svg viewBox="0 0 32 32" width={32} height={32} stroke="currentColor" fill="none" strokeWidth={1.2}>
      <rect x="4" y="4" width="24" height="24" rx="4" />
      <circle cx="16" cy="16" r="5" />
      <circle cx="24" cy="8" r="2" />
    </svg>
  );
}

function IconNoResults() {
  return (
    <svg viewBox="0 0 32 32" width={32} height={32} stroke="currentColor" fill="none" strokeWidth={1.2}>
      <circle cx="14" cy="14" r="9" />
      <path d="M22 22l7 7" />
      <path d="M10 14h8M14 10v8" />
    </svg>
  );
}

/* ── STORAGE BAR ── */
interface StorageBarProps {
  usedBytes: number;
  allocatedGb: number;
  className?: string;
  trackClass?: string;
  fillClass?: string;
  labelClass?: string;
}

function StorageBar({
  usedBytes,
  allocatedGb,
  trackClass = "al-storage-track",
  fillClass = "al-storage-fill",
  labelClass = "al-storage-row",
}: StorageBarProps) {
  const pct =
    allocatedGb > 0
      ? Math.min(100, (usedBytes / (allocatedGb * 1024 ** 3)) * 100)
      : 0;
  const fillMod = pct > 90 ? " crit" : pct > 70 ? " warn" : "";

  return (
    <>
      <div className={labelClass}>
        <span>{formatBytes(usedBytes)} used</span>
        <span>{allocatedGb} GB</span>
      </div>
      <div className={trackClass}>
        <div
          className={fillClass + fillMod}
          style={{ width: `${Math.min(100, pct)}%` }}
        />
      </div>
    </>
  );
}

/* ── STATUS BADGE ── */
function StatusBadge({ status }: { status: "active" | "scheduled" | "archived" }) {
  const labels: Record<string, string> = {
    active: "Active",
    scheduled: "Scheduled",
    archived: "Archived",
  };
  return (
    <span className={`al-status-badge ${status}`}>{labels[status]}</span>
  );
}

/* ── GRID CARD ── */
function GridCard({ album, index }: { album: Album; index: number }) {
  const [c1, c2] = COVER_GRADIENTS[index % COVER_GRADIENTS.length];
  const status = getStatus(album);
  const mediaCount = album.media?.[0]?.count ?? 0;

  const coverStyle = album.thumbnail_url
    ? { backgroundImage: `url(${album.thumbnail_url})` }
    : { background: `linear-gradient(135deg, ${c1}, ${c2})` };

  return (
    <div className="al-album-card">
      <div className="al-album-cover">
        <div className="al-cover-fill" style={coverStyle} />
        <div className="al-cover-grad" />
        <div className="al-cover-top">
          <StatusBadge status={status} />
        </div>
      </div>

      <div className="al-album-body">
        <div className="al-album-name">{album.title}</div>
        <div className="al-album-desc">{album.description ?? " "}</div>

        <div className="al-album-meta-row">
          <div className="al-album-meta">
            <IconCamera />
            <strong>{mediaCount.toLocaleString()}</strong> photos
          </div>
          <div className="al-album-meta">
            <IconCalendar />
            {formatDate(album.open_date)} – {formatDate(album.close_date)}
          </div>
        </div>

        <StorageBar
          usedBytes={album.used_bytes ?? 0}
          allocatedGb={album.allocated_gb}
          labelClass="al-storage-row"
          trackClass="al-storage-track"
          fillClass="al-storage-fill"
        />
      </div>

      <div className="al-album-footer">
        <Link href={`/albums/${album.id}`} className="al-af-btn gold">
          Manage
        </Link>
        <Link href={`/albums/${album.id}`} className="al-af-btn">
          QR code
        </Link>
        <Link href={`/albums/${album.id}/gallery`} className="al-af-btn">
          Gallery
        </Link>
      </div>
    </div>
  );
}

/* ── LIST CARD ── */
function ListCard({ album, index }: { album: Album; index: number }) {
  const [c1, c2] = COVER_GRADIENTS[index % COVER_GRADIENTS.length];
  const status = getStatus(album);
  const mediaCount = album.media?.[0]?.count ?? 0;
  const pct =
    album.allocated_gb > 0
      ? Math.min(
          100,
          ((album.used_bytes ?? 0) / (album.allocated_gb * 1024 ** 3)) * 100
        )
      : 0;
  const fillMod = pct > 90 ? " crit" : pct > 70 ? " warn" : "";

  const coverStyle = album.thumbnail_url
    ? { backgroundImage: `url(${album.thumbnail_url})`, backgroundSize: "cover", backgroundPosition: "center" }
    : { background: `linear-gradient(160deg, ${c1}, ${c2})` };

  return (
    <div className="al-list-card">
      <div className="al-list-cover">
        <div className="al-list-cover-fill" style={coverStyle} />
      </div>

      <div className="al-list-body">
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2, minWidth: 0 }}>
          <div className="al-list-name">{album.title}</div>
          <StatusBadge status={status} />
        </div>
        <div className="al-list-desc">{album.description ?? " "}</div>
        <div className="al-list-meta">
          <div className="al-album-meta">
            <IconCamera />
            <strong>{mediaCount.toLocaleString()}</strong> photos
          </div>
          <div className="al-album-meta">
            <IconCalendar />
            {formatDate(album.open_date)} – {formatDate(album.close_date)}
          </div>
        </div>
      </div>

      <div className="al-list-right">
        <div className="al-list-storage">
          <div className="al-list-storage-label">
            <span>{formatBytes(album.used_bytes ?? 0)}</span>
            <span>{album.allocated_gb} GB</span>
          </div>
          <div className="al-list-storage-track">
            <div
              className={"al-list-storage-fill" + fillMod}
              style={{ width: `${Math.min(100, pct)}%` }}
            />
          </div>
        </div>
        <div className="al-list-actions">
          <Link href={`/albums/${album.id}`} className="al-list-action gold">
            Manage
          </Link>
          <Link href={`/albums/${album.id}/gallery`} className="al-list-action">
            Gallery
          </Link>
        </div>
      </div>
    </div>
  );
}

/* ── MAIN CLIENT COMPONENT ── */
export function AlbumsClient({ albums, totalCount, activeCount }: Props) {
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<Sort>("recent");
  const [view, setView] = useState<View>("grid");

  const counts = useMemo(
    () => ({
      all: albums.length,
      active: albums.filter((a) => getStatus(a) === "active").length,
      scheduled: albums.filter((a) => getStatus(a) === "scheduled").length,
      archived: albums.filter((a) => getStatus(a) === "archived").length,
    }),
    [albums]
  );

  const displayed = useMemo(() => {
    let list =
      filter === "all"
        ? [...albums]
        : albums.filter((a) => getStatus(a) === filter);

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (a) =>
          a.title.toLowerCase().includes(q) ||
          (a.description ?? "").toLowerCase().includes(q)
      );
    }

    list.sort((a, b) => {
      switch (sort) {
        case "name":
          return a.title.localeCompare(b.title);
        case "media": {
          const am = a.media?.[0]?.count ?? 0;
          const bm = b.media?.[0]?.count ?? 0;
          return bm - am;
        }
        case "storage":
          return (b.used_bytes ?? 0) - (a.used_bytes ?? 0);
        case "recent":
        default:
          return (
            new Date(b.created_at).getTime() -
            new Date(a.created_at).getTime()
          );
      }
    });

    return list;
  }, [albums, filter, search, sort]);

  const pills: { key: Filter; label: string }[] = [
    { key: "all", label: "All" },
    { key: "active", label: "Active" },
    { key: "scheduled", label: "Scheduled" },
    { key: "archived", label: "Archived" },
  ];

  return (
    <>
      {/* TOPBAR */}
      <div className="al-topbar">
        <div>
          <div className="al-page-title">Albums</div>
          <div className="al-page-sub">
            {totalCount} album{totalCount !== 1 ? "s" : ""} &middot; {activeCount} active
          </div>
        </div>
        <div>
          <Link href="/albums/create" className="al-btn-primary">
            <IconPlus />
            Create album
          </Link>
        </div>
      </div>

      {/* TOOLBAR */}
      <div className="al-toolbar">
        <div className="al-filter-pills">
          {pills.map(({ key, label }) => (
            <button
              key={key}
              className={`al-pill${filter === key ? " active" : ""}`}
              onClick={() => setFilter(key)}
            >
              {label}
              <span className="al-pill-count">{counts[key]}</span>
            </button>
          ))}
        </div>

        <div className="al-toolbar-right">
          {/* Search */}
          <div className="al-search-wrap">
            <div className="al-search-icon">
              <IconSearch />
            </div>
            <input
              className="al-search-input"
              type="text"
              placeholder="Search albums…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Sort */}
          <div className="al-sort-wrap">
            <select
              className="al-sort-select"
              value={sort}
              onChange={(e) => setSort(e.target.value as Sort)}
            >
              <option value="recent">Most recent</option>
              <option value="name">Name A–Z</option>
              <option value="media">Most photos</option>
              <option value="storage">Storage used</option>
            </select>
            <div className="al-sort-chev">
              <IconChevron />
            </div>
          </div>

          {/* View toggle */}
          <div className="al-view-toggle">
            <button
              className={`al-view-btn${view === "grid" ? " active" : ""}`}
              onClick={() => setView("grid")}
              title="Grid"
            >
              <IconGrid />
            </button>
            <button
              className={`al-view-btn${view === "list" ? " active" : ""}`}
              onClick={() => setView("list")}
              title="List"
            >
              <IconList />
            </button>
          </div>
        </div>
      </div>

      {/* CONTENT */}
      <div className="al-content">
        {/* Empty state — no albums at all */}
        {albums.length === 0 ? (
          <div className="al-empty">
            <div className="al-empty-icon">
              <IconPhoto />
            </div>
            <div className="al-empty-title">No albums yet.</div>
            <div className="al-empty-sub">
              Create your first album and share a QR code with your guests.
              They upload — you collect everything.
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
              <Link href="/albums/create" className="al-btn-primary">
                <IconPlus />
                Create your first album
              </Link>
              <div className="al-empty-hint">
                Free on all plans &middot; No app for guests
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="al-results-bar">
              <div className="al-results-count">
                <strong>{displayed.length}</strong>{" "}
                {displayed.length === 1 ? "album" : "albums"}
              </div>
            </div>

            {/* No results from filter/search */}
            {displayed.length === 0 ? (
              <div className="al-empty">
                <div className="al-empty-icon">
                  <IconNoResults />
                </div>
                <div className="al-empty-title">No results</div>
                <div className="al-empty-sub">
                  No albums match your current search or filter. Try adjusting
                  your query.
                </div>
                <button
                  className="al-btn-primary"
                  onClick={() => {
                    setFilter("all");
                    setSearch("");
                  }}
                >
                  Clear filter
                </button>
              </div>
            ) : view === "grid" ? (
              <div className="al-albums-grid">
                {displayed.map((album, i) => (
                  <GridCard key={album.id} album={album} index={i} />
                ))}
              </div>
            ) : (
              <div className="al-albums-list">
                {displayed.map((album, i) => (
                  <ListCard key={album.id} album={album} index={i} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
