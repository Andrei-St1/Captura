import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { UploadClient } from "./UploadClient";
import { JoinNav } from "../JoinNav";

export default async function UploadPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const supabase = await createClient();

  const { data: qr } = await supabase
    .from("qr_codes")
    .select("id, enabled, expires_at, albums(id, title, status, open_date, close_date, show_gallery)")
    .eq("token", token)
    .single();

  if (!qr) notFound();

  const album = qr.albums as any;
  if (!album || album.status === "deleted") notFound();

  const now = new Date();
  const qrDisabled = !qr.enabled || (qr.expires_at && new Date(qr.expires_at) < now);
  const notOpen    = album.open_date  && new Date(album.open_date)  > now;
  const closed     = album.close_date && new Date(album.close_date) < now;
  const isOpen     = !qrDisabled && album.status === "active" && !notOpen && !closed;

  return (
    <>
      <style>{CSS}</style>
      <div className="up-root">

        {/* ── Header ── */}
        <header className="up-header">
          {/* 3-column grid: left | center | right */}
          <Link href={`/join/${token}`} className="up-back">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m12 19-7-7 7-7" /><path d="M19 12H5" />
            </svg>
            Back
          </Link>

          <JoinNav token={token} showGallery={album.show_gallery} />

          <Link href="/" className="up-wordmark">Captura</Link>
        </header>

        {/* ── Main ── */}
        <main className="up-main">
          <div className="up-card-wrap">
            <div className="up-heading">
              <span className="up-label">Contributing to</span>
              <h1 className="up-title">{album.title}</h1>
              <div className="up-rule" />
            </div>

            {isOpen ? (
              <UploadClient albumId={album.id} albumTitle={album.title} token={token} />
            ) : (
              <div className="up-status-box">
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" style={{ color: "oklch(58% 0.010 265)" }}>
                  {qrDisabled ? (
                    <><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/><line x1="2" y1="2" x2="22" y2="22"/></>
                  ) : notOpen ? (
                    <><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></>
                  ) : (
                    <><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></>
                  )}
                </svg>
                <p className="up-status-title">
                  {qrDisabled ? "Link is inactive" : notOpen ? "Not open yet" : "Album is closed"}
                </p>
                <p className="up-status-body">
                  {qrDisabled
                    ? "Contact the organizer for a new invite link."
                    : notOpen
                    ? "Check back when the event starts."
                    : "This album no longer accepts uploads."}
                </p>
              </div>
            )}

            <p className="up-footer-text">Powered by Captura</p>
          </div>
        </main>
      </div>
    </>
  );
}

const CSS = `
  .up-root {
    min-height: 100vh;
    background: oklch(97% 0.008 80);
    color: oklch(18% 0.015 265);
    font-family: 'DM Sans', system-ui, sans-serif;
    display: flex;
    flex-direction: column;
  }

  /* ── Header ── */
  .up-header {
    position: sticky; top: 0; z-index: 40;
    background: oklch(97% 0.008 80 / 0.88);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    border-bottom: 1px solid oklch(80% 0.010 80);
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    align-items: center;
    padding: 0 24px;
    height: 60px;
  }

  .up-back {
    display: flex; align-items: center; gap: 6px;
    font-size: 13px; color: oklch(46% 0.010 265);
    text-decoration: none; transition: color .15s;
  }
  .up-back:hover { color: oklch(18% 0.015 265); }

  .up-wordmark {
    font-family: 'Cormorant Garamond', Georgia, serif;
    font-size: 18px; font-weight: 500;
    letter-spacing: 0.06em;
    color: oklch(44% 0.16 72);
    text-decoration: none;
    display: flex; justify-content: flex-end;
  }

  /* ── Main ── */
  .up-main {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 48px 24px 96px;   /* 96px bottom = room for mobile nav */
  }

  .up-card-wrap {
    width: 100%;
    max-width: 440px;
  }

  .up-heading {
    text-align: center;
    margin-bottom: 32px;
  }

  .up-label {
    display: block;
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.28em;
    color: oklch(46% 0.010 265);
    margin-bottom: 10px;
  }

  .up-title {
    font-family: 'Cormorant Garamond', Georgia, serif;
    font-size: 32px;
    font-weight: 400;
    color: oklch(44% 0.16 72);
    line-height: 1.15;
  }

  .up-rule {
    width: 40px; height: 1px;
    background: oklch(80% 0.010 80);
    margin: 18px auto 0;
  }

  /* ── Status box ── */
  .up-status-box {
    background: oklch(93% 0.010 80);
    border: 1px solid oklch(80% 0.010 80);
    border-radius: 16px;
    padding: 40px 24px;
    text-align: center;
    display: flex; flex-direction: column; align-items: center; gap: 12px;
  }
  .up-status-title {
    font-family: 'Cormorant Garamond', Georgia, serif;
    font-size: 22px; font-weight: 400;
    color: oklch(18% 0.015 265);
  }
  .up-status-body {
    font-size: 13px;
    color: oklch(46% 0.010 265);
    line-height: 1.6;
  }

  .up-footer-text {
    margin-top: 28px;
    text-align: center;
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.14em;
    color: oklch(65% 0.010 265);
  }

  @media (max-width: 768px) {
    .up-main { padding-bottom: 96px; }
  }
`;
