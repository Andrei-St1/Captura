import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

type AlbumStatus = "not_open" | "open" | "closed" | "archived" | "qr_disabled";

function getStatus(
  qr: { enabled: boolean; expires_at: string | null },
  album: { status: string; open_date: string | null; close_date: string | null }
): AlbumStatus {
  if (!qr.enabled) return "qr_disabled";
  if (qr.expires_at && new Date(qr.expires_at) < new Date()) return "qr_disabled";
  if (album.status !== "active") return "archived";
  const now = new Date();
  if (album.open_date && new Date(album.open_date) > now) return "not_open";
  if (album.close_date && new Date(album.close_date) < now) return "closed";
  return "open";
}

function fmtDate(iso: string | null, opts?: Intl.DateTimeFormatOptions) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("en-GB", opts ?? { day: "numeric", month: "long", year: "numeric" });
}

const PARTICLE_SCRIPT = `
  var c = document.getElementById('gw-particles');
  if (c) {
    for (var i = 0; i < 28; i++) {
      var p = document.createElement('div');
      p.className = 'gw-particle';
      var s = 1.5 + Math.random() * 2.5;
      p.style.left = (Math.random() * 100) + '%';
      p.style.top  = (20 + Math.random() * 80) + '%';
      p.style.width = s + 'px';
      p.style.height = s + 'px';
      p.style.setProperty('--dx', ((Math.random() - 0.5) * 60) + 'px');
      p.style.animationDuration = (6 + Math.random() * 10) + 's';
      p.style.animationDelay = (-Math.random() * 12) + 's';
      p.style.opacity = (0.3 + Math.random() * 0.5).toString();
      c.appendChild(p);
    }
  }
`;

export default async function JoinPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const supabase = await createClient();

  const { data: qr } = await supabase
    .from("qr_codes")
    .select("id, token, enabled, expires_at, albums(id, title, description, location, cover_url, open_date, close_date, status, show_gallery)")
    .eq("token", token)
    .single();

  if (!qr) notFound();
  const album = qr.albums as any;
  if (!album || album.status === "deleted") notFound();

  const { count: mediaCount } = await supabase
    .from("media")
    .select("*", { count: "exact", head: true })
    .eq("album_id", album.id);

  const status = getStatus(qr, album);
  const eventDate = fmtDate(album.open_date);

  return (
    <>
      <style>{CSS}</style>
      <div className="gw-page">

        {/* ── LEFT PANEL ── */}
        <div className="gw-left">
          {album.cover_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={album.cover_url} alt={album.title} className="gw-cover-img" />
          ) : (
            <>
              <div className="gw-forest-layer" />
              <svg className="gw-trees" viewBox="0 0 800 600" preserveAspectRatio="xMidYMax slice" xmlns="http://www.w3.org/2000/svg">
                <ellipse cx="100" cy="420" rx="55" ry="200" fill="oklch(22% 0.05 65)" />
                <ellipse cx="220" cy="380" rx="65" ry="240" fill="oklch(20% 0.06 60)" />
                <ellipse cx="680" cy="400" rx="60" ry="220" fill="oklch(22% 0.05 55)" />
                <ellipse cx="780" cy="440" rx="50" ry="180" fill="oklch(21% 0.04 65)" />
                <ellipse cx="360" cy="350" rx="72" ry="280" fill="oklch(18% 0.07 58)" />
                <ellipse cx="500" cy="370" rx="68" ry="260" fill="oklch(17% 0.06 62)" />
                <rect x="92"  y="420" width="16" height="180" fill="oklch(14% 0.04 55)" />
                <rect x="212" y="380" width="16" height="220" fill="oklch(13% 0.04 60)" />
                <rect x="352" y="350" width="18" height="250" fill="oklch(12% 0.04 58)" />
                <rect x="492" y="370" width="18" height="230" fill="oklch(13% 0.05 62)" />
                <rect x="672" y="400" width="16" height="200" fill="oklch(14% 0.04 55)" />
                <ellipse cx="0"   cy="480" rx="80"  ry="160" fill="oklch(14% 0.05 55)" />
                <ellipse cx="160" cy="500" rx="60"  ry="130" fill="oklch(15% 0.05 58)" />
                <ellipse cx="640" cy="490" rx="65"  ry="140" fill="oklch(14% 0.05 60)" />
                <ellipse cx="820" cy="470" rx="90"  ry="170" fill="oklch(13% 0.04 55)" />
                <ellipse cx="400" cy="610" rx="500" ry="100" fill="oklch(72% 0.008 80 / 0.14)" />
                <ellipse cx="400" cy="620" rx="420" ry="80"  fill="oklch(78% 0.005 80 / 0.10)" />
              </svg>
              <div id="gw-particles" className="gw-particles" />
            </>
          )}

          <div className="gw-left-fade" />
          <div className="gw-left-bottom-fade" />

          <div className="gw-pills">
            {eventDate && (
              <div className="gw-pill">
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" />
                </svg>
                {eventDate}
              </div>
            )}
            {album.location && (
              <div className="gw-pill">
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M12 21c-4-4-7-7.5-7-11a7 7 0 0 1 14 0c0 3.5-3 7-7 11z" /><circle cx="12" cy="10" r="2.5" />
                </svg>
                {album.location}
              </div>
            )}
          </div>

          {eventDate && <div className="gw-caption">{eventDate}</div>}
        </div>

        {/* ── RIGHT PANEL ── */}
        <div className="gw-right">
          <Link href="/" className="gw-wordmark">Captura</Link>

          <div className="gw-tag">You are invited to contribute</div>

          <h1 className="gw-heading">{album.title}</h1>

          {album.description && (
            <p className="gw-sub">{album.description}</p>
          )}

          <div className="gw-chips">
            {eventDate && (
              <div className="gw-chip">
                <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.7">
                  <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" />
                </svg>
                <div className="gw-chip-info">
                  <span className="gw-chip-label">Date</span>
                  <span className="gw-chip-value">{eventDate}</span>
                </div>
              </div>
            )}
            {album.location && (
              <div className="gw-chip">
                <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.7">
                  <path d="M12 21c-4-4-7-7.5-7-11a7 7 0 0 1 14 0c0 3.5-3 7-7 11z" /><circle cx="12" cy="10" r="2.5" />
                </svg>
                <div className="gw-chip-info">
                  <span className="gw-chip-label">Venue</span>
                  <span className="gw-chip-value">{album.location}</span>
                </div>
              </div>
            )}
            {(mediaCount ?? 0) > 0 && (
              <div className="gw-chip">
                <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.7">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                  <circle cx="12" cy="13" r="4" />
                </svg>
                <div className="gw-chip-info">
                  <span className="gw-chip-label">Shared so far</span>
                  <span className="gw-chip-value">{mediaCount} {mediaCount === 1 ? "photo" : "photos"}</span>
                </div>
              </div>
            )}
          </div>

          <div className="gw-ctas">
            {status === "open" && (
              <>
                <Link href={`/join/${token}/upload`} className="gw-btn-primary">
                  <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                    <circle cx="12" cy="13" r="4" />
                  </svg>
                  Add your photos
                </Link>
                {album.show_gallery && (
                  <Link href={`/join/${token}/gallery`} className="gw-btn-secondary">
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
                      <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
                    </svg>
                    View gallery
                  </Link>
                )}
              </>
            )}

            {(status === "qr_disabled" || status === "archived") && (
              <div className="gw-status-box">
                <p className="gw-status-title">This link is no longer active</p>
                <p className="gw-status-body">Contact the organizer for a new invite link.</p>
              </div>
            )}

            {status === "not_open" && (
              <div className="gw-status-box gw-status-amber">
                <p className="gw-status-title">Not open yet</p>
                <p className="gw-status-body">
                  Opens on {fmtDate(album.open_date, { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            )}

            {status === "closed" && (
              <>
                <div className="gw-status-box">
                  <p className="gw-status-title">Album is closed</p>
                  <p className="gw-status-body">
                    Stopped accepting uploads on {fmtDate(album.close_date)}
                  </p>
                </div>
                {album.show_gallery && (
                  <Link href={`/join/${token}/gallery`} className="gw-btn-secondary">
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
                      <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
                    </svg>
                    View gallery
                  </Link>
                )}
              </>
            )}
          </div>

          <div className="gw-footer">
            <p className="gw-powered">Powered by <Link href="/">Captura</Link></p>
          </div>
        </div>
      </div>

      <script dangerouslySetInnerHTML={{ __html: PARTICLE_SCRIPT }} />
    </>
  );
}

const CSS = `
  @keyframes gw-float {
    from { transform: translateY(0) translateX(0); opacity: 0; }
    10%  { opacity: 1; }
    90%  { opacity: 0.6; }
    to   { transform: translateY(-100vh) translateX(var(--dx, 0px)); opacity: 0; }
  }
  @keyframes gw-fadeUp {
    from { opacity: 0; transform: translateY(16px); }
    to   { opacity: 1; transform: none; }
  }

  .gw-page {
    display: grid;
    grid-template-columns: 1fr 1fr;
    min-height: 100vh;
    font-family: 'DM Sans', system-ui, sans-serif;
    font-size: 14px;
    line-height: 1.5;
    background: oklch(97% 0.008 80);
    color: oklch(18% 0.015 265);
  }

  /* ── LEFT ── */
  .gw-left {
    position: sticky;
    top: 0;
    height: 100vh;
    overflow: hidden;
    background: linear-gradient(160deg,
      oklch(12% 0.04 60) 0%,
      oklch(18% 0.08 72) 40%,
      oklch(24% 0.06 80) 100%);
  }

  .gw-cover-img {
    position: absolute; inset: 0;
    width: 100%; height: 100%;
    object-fit: cover;
  }

  .gw-forest-layer {
    position: absolute; inset: 0;
    background-image:
      radial-gradient(ellipse 140% 35% at 50% 108%, oklch(80% 0.006 80 / 0.22) 0%, transparent 60%),
      radial-gradient(ellipse 80% 60% at 20% 40%, oklch(44% 0.16 72 / 0.15) 0%, transparent 55%),
      radial-gradient(ellipse 60% 50% at 80% 20%, oklch(22% 0.05 60 / 0.4) 0%, transparent 50%);
  }

  .gw-trees {
    position: absolute;
    bottom: 0; left: 0; right: 0;
    width: 100%; height: 80%;
  }

  .gw-particles { position: absolute; inset: 0; pointer-events: none; }

  .gw-particle {
    position: absolute;
    border-radius: 50%;
    background: oklch(80% 0.12 72 / 0.6);
    animation: gw-float linear infinite;
  }

  .gw-left-fade {
    position: absolute; inset: 0;
    background: linear-gradient(to right, transparent 65%, oklch(97% 0.008 80) 100%);
  }

  .gw-left-bottom-fade {
    position: absolute; bottom: 0; left: 0; right: 0; height: 30%;
    background: linear-gradient(to top, oklch(12% 0.04 60 / 0.5) 0%, transparent 100%);
  }

  .gw-pills {
    position: absolute; top: 36px; left: 36px;
    display: flex; flex-direction: column; gap: 8px;
    animation: gw-fadeUp .6s cubic-bezier(.22,1,.36,1) .3s both;
  }

  .gw-pill {
    display: inline-flex; align-items: center; gap: 8px;
    background: oklch(100% 0 0 / 0.10);
    backdrop-filter: blur(16px);
    border: 1px solid oklch(100% 0 0 / 0.16);
    border-radius: 100px;
    padding: 7px 14px;
    color: oklch(94% 0.005 80);
    font-size: 12px; letter-spacing: 0.06em;
    width: fit-content;
  }

  .gw-caption {
    position: absolute; bottom: 28px; left: 36px;
    color: oklch(90% 0.006 80 / 0.7);
    font-size: 11px; letter-spacing: 0.14em;
    text-transform: uppercase;
    animation: gw-fadeUp .6s cubic-bezier(.22,1,.36,1) .4s both;
  }

  /* ── RIGHT ── */
  .gw-right {
    display: flex;
    flex-direction: column;
    justify-content: center;
    padding: 60px 72px 60px 64px;
    position: relative;
    background: oklch(97% 0.008 80);
    min-height: 100vh;
    overflow-y: auto;
  }

  .gw-wordmark {
    position: absolute; top: 32px; right: 36px;
    font-family: 'Cormorant Garamond', Georgia, serif;
    font-size: 15px; font-weight: 500;
    letter-spacing: 0.10em;
    color: oklch(46% 0.010 265);
    text-decoration: none; opacity: 0.7;
    transition: opacity .15s;
  }
  .gw-wordmark:hover { opacity: 1; }

  .gw-tag {
    display: inline-flex; align-items: center; gap: 6px;
    font-size: 10px; font-weight: 500; letter-spacing: 0.14em;
    text-transform: uppercase;
    color: oklch(44% 0.16 72);
    background: oklch(44% 0.16 72 / 0.09);
    border: 1px solid oklch(44% 0.16 72 / 0.28);
    border-radius: 100px; padding: 5px 12px;
    margin-bottom: 24px; width: fit-content;
    animation: gw-fadeUp .6s cubic-bezier(.22,1,.36,1) .05s both;
  }
  .gw-tag::before {
    content: '';
    width: 6px; height: 6px; border-radius: 50%;
    background: oklch(44% 0.16 72);
    display: block;
  }

  .gw-heading {
    font-family: 'Cormorant Garamond', Georgia, serif;
    font-size: clamp(40px, 4.8vw, 72px);
    font-weight: 400; line-height: 1.0;
    color: oklch(18% 0.015 265);
    letter-spacing: -0.01em;
    margin-bottom: 12px;
    animation: gw-fadeUp .6s cubic-bezier(.22,1,.36,1) .10s both;
  }

  .gw-sub {
    font-family: 'Cormorant Garamond', Georgia, serif;
    font-size: clamp(15px, 1.5vw, 20px);
    font-weight: 300; font-style: italic;
    color: oklch(46% 0.010 265);
    margin-bottom: 32px; line-height: 1.45;
    animation: gw-fadeUp .6s cubic-bezier(.22,1,.36,1) .14s both;
  }

  .gw-chips {
    display: flex; gap: 10px; flex-wrap: wrap;
    margin-bottom: 36px;
    animation: gw-fadeUp .6s cubic-bezier(.22,1,.36,1) .18s both;
  }

  .gw-chip {
    display: flex; align-items: center; gap: 10px;
    background: oklch(93% 0.010 80);
    border: 1px solid oklch(80% 0.010 80);
    border-radius: 10px; padding: 10px 16px;
  }
  .gw-chip svg { stroke: oklch(44% 0.16 72); flex-shrink: 0; }
  .gw-chip-info { display: flex; flex-direction: column; gap: 1px; }
  .gw-chip-label {
    font-size: 9px; font-weight: 500;
    letter-spacing: 0.1em; text-transform: uppercase;
    color: oklch(46% 0.010 265);
  }
  .gw-chip-value { font-size: 14px; color: oklch(18% 0.015 265); line-height: 1.2; }

  .gw-ctas {
    display: flex; gap: 12px; align-items: center; flex-wrap: wrap;
    animation: gw-fadeUp .6s cubic-bezier(.22,1,.36,1) .22s both;
  }

  .gw-btn-primary {
    display: inline-flex; align-items: center; gap: 9px;
    background: oklch(44% 0.16 72);
    color: oklch(97% 0.008 80);
    border: none; border-radius: 12px;
    padding: 15px 28px;
    font-family: 'DM Sans', system-ui, sans-serif;
    font-size: 15px; font-weight: 500;
    cursor: pointer; text-decoration: none;
    letter-spacing: 0.01em; white-space: nowrap;
    transition: opacity .2s, transform .15s;
  }
  .gw-btn-primary:hover { opacity: .88; transform: translateY(-1px); }

  .gw-btn-secondary {
    display: inline-flex; align-items: center; gap: 9px;
    background: transparent;
    color: oklch(18% 0.015 265);
    border: 1px solid oklch(80% 0.010 80);
    border-radius: 12px; padding: 14px 28px;
    font-family: 'DM Sans', system-ui, sans-serif;
    font-size: 15px; font-weight: 400;
    cursor: pointer; text-decoration: none;
    white-space: nowrap;
    transition: background .15s, border-color .15s;
  }
  .gw-btn-secondary:hover {
    background: oklch(93% 0.010 80);
    border-color: oklch(44% 0.16 72 / 0.3);
  }

  .gw-status-box {
    padding: 16px 20px;
    border-radius: 12px;
    background: oklch(93% 0.010 80);
    border: 1px solid oklch(80% 0.010 80);
  }
  .gw-status-amber {
    background: oklch(58% 0.17 75 / 0.08);
    border-color: oklch(58% 0.17 75 / 0.25);
  }
  .gw-status-title {
    font-size: 14px; font-weight: 600;
    color: oklch(18% 0.015 265); margin-bottom: 4px;
  }
  .gw-status-body { font-size: 12px; color: oklch(46% 0.010 265); }
  .gw-status-amber .gw-status-title { color: oklch(40% 0.12 75); }
  .gw-status-amber .gw-status-body  { color: oklch(46% 0.10 75); }

  .gw-footer {
    margin-top: 40px;
    padding-top: 24px;
    border-top: 1px solid oklch(80% 0.010 80);
    animation: gw-fadeUp .6s cubic-bezier(.22,1,.36,1) .26s both;
  }
  .gw-powered {
    font-size: 10px; letter-spacing: 0.12em; text-transform: uppercase;
    color: oklch(58% 0.010 265);
  }
  .gw-powered a { color: oklch(44% 0.16 72); text-decoration: none; }
  .gw-powered a:hover { text-decoration: underline; }

  /* ── RESPONSIVE ── */
  @media (max-width: 768px) {
    .gw-page {
      grid-template-columns: 1fr;
      grid-template-rows: 260px auto;
    }
    .gw-left {
      position: relative;
      height: 260px;
    }
    .gw-left-fade {
      background: linear-gradient(to bottom, transparent 40%, oklch(97% 0.008 80) 100%);
    }
    .gw-caption { display: none; }
    .gw-pills { top: 16px; left: 16px; }
    .gw-right {
      padding: 36px 24px 48px;
      justify-content: flex-start;
      min-height: unset;
    }
    .gw-wordmark { top: 16px; right: 16px; font-size: 13px; }
    .gw-heading { font-size: clamp(34px, 9vw, 52px); }
    .gw-btn-primary, .gw-btn-secondary { padding: 13px 20px; font-size: 14px; }
  }
`;
