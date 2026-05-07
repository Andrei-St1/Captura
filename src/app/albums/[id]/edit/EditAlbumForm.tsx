"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { updateAlbum } from "@/app/albums/actions";

interface Album {
  id: string;
  title: string;
  open_date: string | null;
  close_date: string | null;
  allocated_gb: number;
  show_gallery: boolean;
  thumbnail_url: string | null;
  pin_required: boolean;
}

interface Props {
  album: Album;
  planStorageGb: number;
  allocatedGbOthers: number;
}

function toDatetimeLocal(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toISOString().slice(0, 16);
}

export function EditAlbumForm({ album, planStorageGb, allocatedGbOthers }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showGallery, setShowGallery] = useState(album.show_gallery);
  const [pinRequired, setPinRequired] = useState(album.pin_required);
  const [pin, setPin]                 = useState("");
  const [inputGb, setInputGb] = useState(album.allocated_gb);
  const [coverPreview, setCoverPreview] = useState<string | null>(album.thumbnail_url ?? null);
  const [coverUploading, setCoverUploading] = useState(false);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const remaining = planStorageGb - allocatedGbOthers;
  const usedByOthersPercent = Math.round((allocatedGbOthers / planStorageGb) * 100);
  const thisPercent = Math.min(100 - usedByOthersPercent, Math.round((inputGb / planStorageGb) * 100));

  async function handleCoverChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setCoverPreview(URL.createObjectURL(file));
    setCoverUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("albumId", album.id);
    await fetch("/api/upload-thumbnail", { method: "POST", body: fd });
    setCoverUploading(false);
  }

  function removeCover() {
    setCoverPreview(null);
    if (coverInputRef.current) coverInputRef.current.value = "";
  }

  async function handleSubmit(formData: FormData) {
    setError(null);
    setLoading(true);
    formData.set("show_gallery", showGallery ? "true" : "false");
    formData.set("pin_required", pinRequired ? "true" : "false");
    if (pin) formData.set("pin", pin);
    const result = await updateAlbum(formData);
    if (result?.error) {
      setError(result.error);
      setLoading(false);
    }
  }

  return (
    <>
      <style>{CSS}</style>
      <div className="ea-root">

        {/* Navbar */}
        <nav className="ea-nav">
          <div className="ea-nav-inner">
            <Link href="/" className="ea-logo">Captura</Link>
            <Link href={`/albums/${album.id}`} className="ea-back">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <path d="M10 3L5 8l5 5" />
              </svg>
              Back to album
            </Link>
          </div>
        </nav>

        <main className="ea-main">
          <div className="ea-container">

            <div className="ea-header">
              <h1 className="ea-title">Edit <em>{album.title}</em></h1>
              <p className="ea-subtitle">Update your album details. The QR code and join link stay the same.</p>
            </div>

            {error && <div className="ea-error-banner">{error}</div>}

            <form action={handleSubmit} className="ea-form">
              <input type="hidden" name="id" value={album.id} />

              {/* Basic info */}
              <section className="ea-section">
                <div className="ea-section-head">
                  <h2 className="ea-section-title">Basic info</h2>
                </div>
                <div className="ea-section-body">
                  <div className="ea-field">
                    <label htmlFor="title" className="ea-label">
                      Album title <span className="ea-req">*</span>
                    </label>
                    <input
                      id="title" name="title" type="text" required
                      defaultValue={album.title}
                      className="ea-input"
                    />
                  </div>
                  <div className="ea-hint-box">
                    Personalize the guest welcome page (cover photo, description, location) from the album detail page.
                  </div>
                </div>
              </section>

              {/* Card thumbnail */}
              <section className="ea-section">
                <div className="ea-section-head">
                  <h2 className="ea-section-title">Card thumbnail</h2>
                  <p className="ea-section-sub">Shown on the dashboard album card. Different from the guest welcome page cover.</p>
                </div>
                <div className="ea-section-body">
                  {coverPreview ? (
                    <div className="ea-thumb-wrap">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={coverPreview} alt="Thumbnail" className="ea-thumb-img" />
                      {coverUploading && (
                        <div className="ea-thumb-overlay">
                          <span className="ea-thumb-uploading">Uploading…</span>
                        </div>
                      )}
                      {!coverUploading && (
                        <div className="ea-thumb-hover">
                          <label className="ea-thumb-btn">
                            Change
                            <input ref={coverInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleCoverChange} />
                          </label>
                          <button type="button" className="ea-thumb-btn ea-thumb-btn-remove" onClick={removeCover}>
                            Remove
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <label className="ea-upload-area">
                      <svg width="40" height="40" viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round">
                        <rect x="4" y="4" width="32" height="32" rx="4" />
                        <circle cx="20" cy="17" r="5" />
                        <path d="M4 30l8-8 6 6 6-8 12 10" />
                      </svg>
                      <div>
                        <p className="ea-upload-label">Click to upload a thumbnail</p>
                        <p className="ea-upload-sub">JPG, PNG or WebP — shown on album cards</p>
                      </div>
                      <input ref={coverInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleCoverChange} />
                    </label>
                  )}
                </div>
              </section>

              {/* Dates */}
              <section className="ea-section">
                <div className="ea-section-head">
                  <h2 className="ea-section-title">Dates</h2>
                </div>
                <div className="ea-section-body">
                  <div className="ea-date-grid">
                    <div className="ea-field">
                      <label htmlFor="open_date" className="ea-label">Open date</label>
                      <input
                        id="open_date" name="open_date" type="datetime-local"
                        defaultValue={toDatetimeLocal(album.open_date)}
                        className="ea-input"
                      />
                    </div>
                    <div className="ea-field">
                      <label htmlFor="close_date" className="ea-label">Close date</label>
                      <input
                        id="close_date" name="close_date" type="datetime-local"
                        defaultValue={toDatetimeLocal(album.close_date)}
                        className="ea-input"
                      />
                    </div>
                  </div>
                </div>
              </section>

              {/* Storage */}
              <section className="ea-section">
                <div className="ea-section-head">
                  <h2 className="ea-section-title">Storage allocation</h2>
                </div>
                <div className="ea-section-body">

                  <div className="ea-storage-pool">
                    <div className="ea-storage-pool-row">
                      <span className="ea-storage-pool-label">Your storage pool</span>
                      <span className="ea-storage-pool-total">{planStorageGb} GB total</span>
                    </div>
                    <div className="ea-pool-track">
                      <div className="ea-pool-fill-others" style={{ width: `${usedByOthersPercent}%` }} />
                      <div className="ea-pool-fill-this" style={{ width: `${thisPercent}%` }} />
                    </div>
                    <div className="ea-pool-legend">
                      <span className="ea-legend-item">
                        <span className="ea-legend-dot ea-legend-dot-others" />
                        Other albums — {allocatedGbOthers} GB
                      </span>
                      <span className="ea-legend-item">
                        <span className="ea-legend-dot ea-legend-dot-this" />
                        This album — {inputGb} GB
                      </span>
                      <span className="ea-legend-item">
                        <span className="ea-legend-dot ea-legend-dot-free" />
                        Free — {Math.max(0, remaining - inputGb)} GB
                      </span>
                    </div>
                  </div>

                  <div className="ea-field">
                    <div className="ea-storage-label-row">
                      <label htmlFor="allocated_gb" className="ea-label">
                        Allocate to this album (GB) <span className="ea-req">*</span>
                      </label>
                      <span className="ea-storage-avail">{remaining} GB available</span>
                    </div>
                    <input
                      id="allocated_gb" name="allocated_gb" type="number"
                      min={1} max={remaining} required
                      value={inputGb}
                      onChange={(e) => setInputGb(Math.max(1, Math.min(remaining, parseInt(e.target.value) || 1)))}
                      className="ea-input"
                    />
                    <p className="ea-field-hint">Enter between 1 and {remaining} GB.</p>
                  </div>
                </div>
              </section>

              {/* Settings */}
              <section className="ea-section">
                <div className="ea-section-head">
                  <h2 className="ea-section-title">Settings</h2>
                </div>
                <div className="ea-section-body">
                  <div className="ea-toggle-field">
                    <div>
                      <p className="ea-toggle-label">Gallery visibility</p>
                      <p className="ea-toggle-desc">
                        When enabled, guests can browse all uploads. When disabled, guests only see their own.
                      </p>
                    </div>
                    <button
                      type="button"
                      className={`ea-toggle${showGallery ? " on" : ""}`}
                      onClick={() => setShowGallery((v) => !v)}
                    >
                      <span className="ea-toggle-knob" />
                    </button>
                  </div>

                  <div className="ea-toggle-field">
                    <div>
                      <p className="ea-toggle-label">Require PIN</p>
                      <p className="ea-toggle-desc">
                        Guests must enter a 4-digit PIN before accessing the album.
                      </p>
                    </div>
                    <button
                      type="button"
                      className={`ea-toggle${pinRequired ? " on" : ""}`}
                      onClick={() => { setPinRequired((v) => !v); setPin(""); }}
                    >
                      <span className="ea-toggle-knob" />
                    </button>
                  </div>

                  {pinRequired && (
                    <div className="ea-field">
                      <label className="ea-label">
                        {album.pin_required ? "Change PIN" : "Set PIN"} <span className="ea-req">*</span>
                      </label>
                      <input
                        className="ea-input"
                        type="text"
                        inputMode="numeric"
                        maxLength={4}
                        placeholder={album.pin_required ? "Enter new PIN to change" : "4-digit PIN"}
                        value={pin}
                        onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                      />
                      {album.pin_required && (
                        <p className="ea-field-hint">Leave empty to keep the current PIN.</p>
                      )}
                    </div>
                  )}
                </div>
              </section>

              {/* Submit */}
              <div className="ea-footer">
                <Link href={`/albums/${album.id}`} className="ea-btn-cancel">Cancel</Link>
                <button type="submit" disabled={loading} className="ea-btn-save">
                  {loading ? "Saving…" : "Save changes"}
                </button>
              </div>
            </form>

          </div>
        </main>
      </div>
    </>
  );
}

const CSS = `
  .ea-root {
    min-height: 100vh;
    background: oklch(97% 0.008 80);
    color: oklch(18% 0.015 265);
    font-family: 'DM Sans', system-ui, sans-serif;
    font-size: 14px;
    line-height: 1.5;
  }

  /* ── Nav ── */
  .ea-nav {
    position: sticky;
    top: 0;
    z-index: 50;
    background: oklch(97% 0.008 80 / 0.88);
    backdrop-filter: blur(20px);
    border-bottom: 1px solid oklch(80% 0.010 80);
  }
  .ea-nav-inner {
    max-width: 720px;
    margin: 0 auto;
    padding: 0 24px;
    height: 60px;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .ea-logo {
    font-family: 'Cormorant Garamond', Georgia, serif;
    font-size: 20px;
    font-weight: 500;
    letter-spacing: 0.06em;
    color: oklch(44% 0.16 72);
    text-decoration: none;
  }
  .ea-back {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    color: oklch(46% 0.010 265);
    text-decoration: none;
    transition: color .15s;
  }
  .ea-back:hover { color: oklch(18% 0.015 265); }

  /* ── Main ── */
  .ea-main {
    padding: 48px 24px 80px;
  }
  .ea-container {
    max-width: 680px;
    margin: 0 auto;
  }

  /* ── Header ── */
  .ea-header { margin-bottom: 36px; }
  .ea-title {
    font-family: 'Cormorant Garamond', Georgia, serif;
    font-size: 36px;
    font-weight: 400;
    line-height: 1.15;
    margin-bottom: 10px;
  }
  .ea-title em { font-style: italic; color: oklch(44% 0.16 72); }
  .ea-subtitle { font-size: 14px; color: oklch(46% 0.010 265); line-height: 1.65; }

  /* ── Error banner ── */
  .ea-error-banner {
    margin-bottom: 24px;
    padding: 12px 16px;
    border-radius: 10px;
    background: oklch(62% 0.20 25 / 0.08);
    border: 1px solid oklch(62% 0.20 25 / 0.25);
    color: oklch(52% 0.20 25);
    font-size: 13px;
  }

  /* ── Form ── */
  .ea-form { display: flex; flex-direction: column; gap: 20px; }

  /* ── Section ── */
  .ea-section {
    background: oklch(93% 0.010 80);
    border: 1px solid oklch(80% 0.010 80);
    border-radius: 16px;
    overflow: hidden;
  }
  .ea-section-head {
    padding: 18px 24px;
    border-bottom: 1px solid oklch(80% 0.010 80);
    background: oklch(89% 0.012 80);
  }
  .ea-section-title {
    font-family: 'Cormorant Garamond', Georgia, serif;
    font-size: 18px;
    font-weight: 400;
    color: oklch(18% 0.015 265);
  }
  .ea-section-sub {
    font-size: 12px;
    color: oklch(46% 0.010 265);
    margin-top: 3px;
    line-height: 1.5;
  }
  .ea-section-body { padding: 24px; display: flex; flex-direction: column; gap: 18px; }

  /* ── Fields ── */
  .ea-field { display: flex; flex-direction: column; gap: 7px; }
  .ea-label {
    font-size: 11px;
    font-weight: 600;
    letter-spacing: .09em;
    text-transform: uppercase;
    color: oklch(46% 0.010 265);
  }
  .ea-req { color: oklch(52% 0.20 25); }
  .ea-input {
    width: 100%;
    background: oklch(97% 0.008 80);
    border: 1px solid oklch(80% 0.010 80);
    border-radius: 10px;
    padding: 12px 14px;
    font-family: 'DM Sans', system-ui, sans-serif;
    font-size: 14px;
    color: oklch(18% 0.015 265);
    outline: none;
    transition: border-color .2s, box-shadow .2s;
    -webkit-appearance: none;
    color-scheme: light;
    box-sizing: border-box;
  }
  .ea-input:focus {
    border-color: oklch(65% 0.012 80);
    box-shadow: 0 0 0 3px oklch(44% 0.16 72 / 0.10);
  }
  .ea-field-hint { font-size: 12px; color: oklch(58% 0.010 265); }

  .ea-hint-box {
    padding: 12px 14px;
    background: oklch(89% 0.012 80);
    border: 1px solid oklch(80% 0.010 80);
    border-radius: 10px;
    font-size: 12px;
    color: oklch(46% 0.010 265);
    line-height: 1.55;
  }

  .ea-date-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }

  /* ── Thumbnail ── */
  .ea-thumb-wrap {
    position: relative;
    width: 100%;
    aspect-ratio: 4 / 3;
    border-radius: 12px;
    overflow: hidden;
  }
  .ea-thumb-img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .ea-thumb-overlay {
    position: absolute; inset: 0;
    background: oklch(0% 0 0 / 0.5);
    display: flex; align-items: center; justify-content: center;
  }
  .ea-thumb-uploading { color: #fff; font-size: 13px; font-weight: 600; }
  .ea-thumb-hover {
    position: absolute; inset: 0;
    background: oklch(0% 0 0 / 0.4);
    display: flex; align-items: center; justify-content: center; gap: 10px;
    opacity: 0;
    transition: opacity .2s;
  }
  .ea-thumb-wrap:hover .ea-thumb-hover { opacity: 1; }
  .ea-thumb-btn {
    display: flex; align-items: center;
    padding: 8px 16px;
    border-radius: 8px;
    background: oklch(100% 0 0 / 0.2);
    backdrop-filter: blur(8px);
    color: #fff;
    font-size: 13px;
    font-weight: 600;
    border: none;
    cursor: pointer;
    font-family: 'DM Sans', system-ui, sans-serif;
    transition: background .15s;
  }
  .ea-thumb-btn:hover { background: oklch(100% 0 0 / 0.3); }
  .ea-thumb-btn-remove:hover { background: oklch(52% 0.20 25 / 0.7); }

  .ea-upload-area {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
    width: 100%;
    aspect-ratio: 4 / 3;
    border-radius: 12px;
    border: 2px dashed oklch(80% 0.010 80);
    cursor: pointer;
    text-align: center;
    padding: 24px;
    color: oklch(58% 0.010 265);
    transition: border-color .2s, background .2s;
    box-sizing: border-box;
  }
  .ea-upload-area:hover {
    border-color: oklch(44% 0.16 72);
    background: oklch(44% 0.16 72 / 0.04);
  }
  .ea-upload-label { font-size: 13px; font-weight: 500; color: oklch(46% 0.010 265); }
  .ea-upload-sub { font-size: 12px; color: oklch(58% 0.010 265); margin-top: 3px; }

  /* ── Storage pool ── */
  .ea-storage-pool {
    background: oklch(89% 0.012 80);
    border: 1px solid oklch(80% 0.010 80);
    border-radius: 12px;
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .ea-storage-pool-row { display: flex; justify-content: space-between; align-items: center; }
  .ea-storage-pool-label { font-size: 13px; font-weight: 500; color: oklch(18% 0.015 265); }
  .ea-storage-pool-total { font-size: 12px; color: oklch(46% 0.010 265); }
  .ea-pool-track {
    height: 10px;
    background: oklch(80% 0.010 80);
    border-radius: 99px;
    overflow: hidden;
    display: flex;
  }
  .ea-pool-fill-others {
    height: 100%;
    background: oklch(44% 0.16 72 / 0.4);
    transition: width .4s;
  }
  .ea-pool-fill-this {
    height: 100%;
    background: oklch(44% 0.16 72);
    transition: width .4s;
  }
  .ea-pool-legend { display: flex; flex-wrap: wrap; gap: 12px; }
  .ea-legend-item { display: flex; align-items: center; gap: 6px; font-size: 12px; color: oklch(46% 0.010 265); }
  .ea-legend-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
  .ea-legend-dot-others { background: oklch(44% 0.16 72 / 0.4); }
  .ea-legend-dot-this { background: oklch(44% 0.16 72); }
  .ea-legend-dot-free { background: oklch(80% 0.010 80); }

  .ea-storage-label-row { display: flex; justify-content: space-between; align-items: center; }
  .ea-storage-avail { font-size: 12px; font-weight: 600; color: oklch(44% 0.16 72); }

  /* ── Toggle ── */
  .ea-toggle-field {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 20px;
  }
  .ea-toggle-label { font-size: 14px; font-weight: 500; margin-bottom: 4px; }
  .ea-toggle-desc { font-size: 12px; color: oklch(46% 0.010 265); line-height: 1.5; }
  .ea-toggle {
    flex-shrink: 0;
    width: 44px; height: 24px;
    border-radius: 12px;
    background: oklch(80% 0.010 80);
    border: none; cursor: pointer;
    position: relative;
    transition: background .25s;
    margin-top: 2px;
  }
  .ea-toggle.on { background: oklch(50% 0.16 155); }
  .ea-toggle-knob {
    position: absolute; top: 3px; left: 3px;
    width: 18px; height: 18px;
    border-radius: 50%;
    background: white;
    transition: transform .25s;
    box-shadow: 0 1px 4px oklch(0% 0 0 / 0.25);
    display: block;
  }
  .ea-toggle.on .ea-toggle-knob { transform: translateX(20px); }

  /* ── Footer ── */
  .ea-footer {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 12px;
    padding-top: 8px;
  }
  .ea-btn-cancel {
    padding: 10px 20px;
    border-radius: 10px;
    font-size: 13px;
    font-weight: 500;
    color: oklch(46% 0.010 265);
    text-decoration: none;
    transition: color .15s;
  }
  .ea-btn-cancel:hover { color: oklch(18% 0.015 265); }
  .ea-btn-save {
    display: inline-flex; align-items: center; gap: 7px;
    padding: 10px 28px;
    background: oklch(44% 0.16 72);
    color: #fff;
    border-radius: 10px;
    font-size: 13px;
    font-weight: 600;
    border: none; cursor: pointer;
    font-family: 'DM Sans', system-ui, sans-serif;
    transition: opacity .2s, transform .15s;
  }
  .ea-btn-save:hover:not(:disabled) { opacity: .88; transform: translateY(-1px); }
  .ea-btn-save:disabled { opacity: .55; cursor: not-allowed; transform: none; }

  /* ── Responsive ── */
  @media (max-width: 640px) {
    .ea-main { padding: 32px 16px 60px; }
    .ea-title { font-size: 28px; }
    .ea-section-body { padding: 18px 16px; }
    .ea-section-head { padding: 14px 16px; }
    .ea-date-grid { grid-template-columns: 1fr; }
    .ea-footer { flex-direction: column-reverse; align-items: stretch; }
    .ea-btn-save { justify-content: center; }
    .ea-btn-cancel { text-align: center; }
  }
`;
