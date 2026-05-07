"use client";

import { useRef, useState } from "react";
import { verifyAlbumPin } from "./actions";

interface Props {
  token: string;
  albumId: string;
  albumTitle: string;
  pinHash: string;
  hasError: boolean;
}

export function PinClient({ token, albumId, albumTitle, pinHash, hasError }: Props) {
  const [digits, setDigits] = useState(["", "", "", ""]);
  const [shake, setShake]   = useState(false);
  const inputRefs = useRef<Array<HTMLInputElement | null>>([null, null, null, null]);
  const formRef   = useRef<HTMLFormElement>(null);

  function triggerShake() {
    setShake(true);
    setTimeout(() => setShake(false), 500);
  }

  function update(i: number, val: string) {
    const d = val.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[i] = d;
    setDigits(next);
    if (d && i < 3) inputRefs.current[i + 1]?.focus();
    if (next.every(Boolean)) setTimeout(() => formRef.current?.requestSubmit(), 30);
  }

  function onKeyDown(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !digits[i] && i > 0) {
      inputRefs.current[i - 1]?.focus();
    }
  }

  function onPaste(e: React.ClipboardEvent) {
    e.preventDefault();
    const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 4);
    if (text.length === 4) {
      setDigits(text.split(""));
      inputRefs.current[3]?.focus();
      setTimeout(() => formRef.current?.requestSubmit(), 30);
    }
  }

  return (
    <>
      <style>{CSS}</style>
      <div className="pin-root">
        <div className="pin-card">

          {/* Lock icon */}
          <div className="pin-icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>

          <h1 className="pin-title">Protected album</h1>
          <p className="pin-sub">
            <em>{albumTitle}</em> requires a PIN to access.
          </p>

          <form ref={formRef} action={verifyAlbumPin} className={`pin-form${shake ? " shake" : ""}`}>
            <input type="hidden" name="pin"     value={digits.join("")} />
            <input type="hidden" name="token"   value={token} />
            <input type="hidden" name="albumId" value={albumId} />
            <input type="hidden" name="pinHash" value={pinHash} />

            <div className="pin-boxes" onPaste={onPaste}>
              {digits.map((d, i) => (
                <input
                  key={i}
                  ref={(el) => { inputRefs.current[i] = el; }}
                  className={`pin-box${hasError || shake ? " error" : ""}`}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={d}
                  autoFocus={i === 0}
                  onChange={(e) => update(i, e.target.value)}
                  onKeyDown={(e) => onKeyDown(i, e)}
                />
              ))}
            </div>

            {(hasError || shake) && (
              <p className="pin-error">Incorrect PIN. Try again.</p>
            )}

            <button type="submit" className="pin-btn" disabled={digits.filter(Boolean).length < 4}>
              Continue →
            </button>
          </form>

          <p className="pin-powered">Powered by Captura</p>
        </div>
      </div>
    </>
  );
}

const CSS = `
  @keyframes pin-shake {
    0%,100% { transform: translateX(0); }
    20%     { transform: translateX(-8px); }
    40%     { transform: translateX(8px); }
    60%     { transform: translateX(-6px); }
    80%     { transform: translateX(6px); }
  }
  @keyframes pin-fade {
    from { opacity: 0; transform: translateY(12px); }
    to   { opacity: 1; transform: none; }
  }

  .pin-root {
    min-height: 100vh;
    background: oklch(97% 0.008 80);
    display: flex; align-items: center; justify-content: center;
    padding: 24px;
    font-family: 'DM Sans', system-ui, sans-serif;
  }

  .pin-card {
    width: 100%; max-width: 380px;
    background: oklch(93% 0.010 80);
    border: 1px solid oklch(80% 0.010 80);
    border-radius: 20px;
    padding: 48px 36px 36px;
    display: flex; flex-direction: column; align-items: center;
    gap: 0;
    animation: pin-fade .3s ease;
  }

  .pin-icon {
    width: 64px; height: 64px;
    border-radius: 18px;
    background: oklch(97% 0.008 80);
    border: 1px solid oklch(80% 0.010 80);
    display: flex; align-items: center; justify-content: center;
    color: oklch(44% 0.16 72);
    margin-bottom: 20px;
  }

  .pin-title {
    font-family: 'Cormorant Garamond', Georgia, serif;
    font-size: 28px; font-weight: 400;
    color: oklch(18% 0.015 265);
    margin-bottom: 8px;
    text-align: center;
  }

  .pin-sub {
    font-size: 14px; color: oklch(46% 0.010 265);
    text-align: center; line-height: 1.5;
    margin-bottom: 32px;
  }
  .pin-sub em { font-style: normal; color: oklch(18% 0.015 265); font-weight: 500; }

  .pin-form { width: 100%; display: flex; flex-direction: column; align-items: center; gap: 16px; }
  .pin-form.shake { animation: pin-shake .45s ease; }

  .pin-boxes {
    display: flex; gap: 12px; justify-content: center;
  }

  .pin-box {
    width: 56px; height: 64px;
    border-radius: 12px;
    border: 1.5px solid oklch(80% 0.010 80);
    background: oklch(97% 0.008 80);
    font-size: 24px; font-weight: 600;
    color: oklch(18% 0.015 265);
    text-align: center;
    outline: none;
    transition: border-color .15s, box-shadow .15s;
    caret-color: transparent;
  }
  .pin-box:focus {
    border-color: oklch(44% 0.16 72);
    box-shadow: 0 0 0 3px oklch(44% 0.16 72 / 0.12);
  }
  .pin-box.error {
    border-color: oklch(52% 0.20 25 / 0.6);
    box-shadow: 0 0 0 3px oklch(52% 0.20 25 / 0.08);
  }

  .pin-error {
    font-size: 13px; color: oklch(52% 0.20 25);
    text-align: center;
  }

  .pin-btn {
    width: 100%; padding: 13px;
    border-radius: 10px;
    background: oklch(44% 0.16 72);
    color: #fff; font-size: 14px; font-weight: 600;
    font-family: 'DM Sans', system-ui, sans-serif;
    border: none; cursor: pointer;
    transition: opacity .15s;
    margin-top: 4px;
  }
  .pin-btn:hover:not(:disabled) { opacity: .88; }
  .pin-btn:disabled { opacity: .4; cursor: not-allowed; }

  .pin-powered {
    margin-top: 28px;
    font-size: 10px; letter-spacing: 0.12em;
    text-transform: uppercase;
    color: oklch(65% 0.010 265);
  }
`;
