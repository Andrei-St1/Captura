"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

const PHOTO_COLORS = [
  "oklch(28% 0.06 30)", "oklch(25% 0.05 200)", "oklch(30% 0.04 280)",
  "oklch(26% 0.06 60)", "oklch(22% 0.03 150)", "oklch(29% 0.05 320)",
  "oklch(27% 0.06 10)", "oklch(24% 0.04 240)",
];

const STEPS = [
  { num: "01", title: "Create your album", desc: "Set a title, upload window, and welcome message. Takes under a minute." },
  { num: "02", title: "Share the QR code", desc: "Print it, project it, or link it. Each album gets multiple codes you can enable or disable." },
  { num: "03", title: "Guests upload, instantly", desc: "No account needed. They scan, add their name, and drop photos or videos." },
  { num: "04", title: "Download everything", desc: "Browse your gallery, filter by face, and export a ZIP of every upload." },
];

const FEATURES = [
  { title: "Multiple QR codes", desc: "Create several codes per album — one for the ceremony, one for the reception. Enable or disable each independently.", icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><circle cx="17.5" cy="17.5" r="2.5"/></svg> },
  { title: "Face detection", desc: "Filter your gallery by detected faces. Find every photo of a specific person in seconds — visible to hosts only.", icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/><circle cx="19" cy="10" r="3"/><path d="M22 18c0-2-1.3-3.5-3-4"/></svg> },
  { title: "Time-gated uploads", desc: "Albums open and close on the dates you choose. No late submissions, no manual closing.", icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18M8 4v5M16 4v5"/></svg> },
  { title: "ZIP bulk download", desc: "Export every photo and video in one click. Original quality, full resolution, organized by upload time.", icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 3v12M8 11l4 4 4-4"/><rect x="4" y="17" width="16" height="4" rx="1"/></svg> },
  { title: "Welcome card", desc: "A branded landing page with your event title, message, cover photo, and location — the first thing guests see.", icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 2C8.1 2 5 5.1 5 9c0 5.2 7 13 7 13s7-7.8 7-13c0-3.9-3.1-7-7-7z"/><circle cx="12" cy="9" r="2.5"/></svg> },
  { title: "Guest gallery toggle", desc: "Choose whether guests can browse all uploads together, or keep everything private until you share it.", icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M1 12S5 5 12 5s11 7 11 7-4 7-11 7S1 12 1 12z"/><circle cx="12" cy="12" r="3"/></svg> },
];

const PLANS = [
  { name: "Starter", price: "0", period: "/ mo", desc: "Everything you need to try Captura for a single event.", featured: false, cta: "Get started free", features: ["1 active album", "5 GB storage", "Unlimited guest uploads", "QR code sharing", "ZIP download", "Welcome card"] },
  { name: "Pro", price: "19", period: "/ mo", desc: "For photographers and regular event hosts who want full control.", featured: true, cta: "Start Pro trial", features: ["10 active albums", "100 GB storage", "Multiple QR codes per album", "Face detection filtering", "Guest gallery toggle", "Time-gated upload windows", "Priority support"] },
  { name: "Business", price: "79", period: "/ mo", desc: "For agencies and studios running dozens of events a year.", featured: false, cta: "Contact sales", features: ["Unlimited albums", "1 TB storage", "Custom branding on welcome card", "Team member access", "Advanced analytics", "Dedicated account manager", "SLA & invoice billing"] },
];

function useReveal() {
  useEffect(() => {
    const obs = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          const el = e.target as HTMLElement;
          const delay = el.dataset.delay ?? "0";
          setTimeout(() => el.classList.add("hp-visible"), Number(delay));
        }
      });
    }, { threshold: 0.15 });
    document.querySelectorAll(".hp-reveal").forEach((el, i) => {
      (el as HTMLElement).dataset.delay = String((i % 4) * 80);
      obs.observe(el);
    });
    return () => obs.disconnect();
  }, []);
}

function CameraAnimation() {
  const stageRef = useRef<HTMLDivElement>(null);
  const counterRef = useRef<HTMLDivElement>(null);
  const checkRef = useRef<SVGPathElement>(null);
  const cameraRef = useRef<HTMLDivElement>(null);
  const ledRef = useRef<HTMLDivElement>(null);
  const particlesRef = useRef<HTMLDivElement>(null);
  const photoCount = useRef(0);
  const running = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function launchPhoto() {
    const stage = stageRef.current;
    const particles = particlesRef.current;
    const camera = cameraRef.current;
    const led = ledRef.current;
    const counter = counterRef.current;
    const check = checkRef.current;
    if (!stage || !particles || !camera || !led || !counter) return;

    camera.style.boxShadow = "0 0 0 12px oklch(76% 0.13 82 / 0.18), 0 0 40px 8px oklch(76% 0.13 82 / 0.18)";
    led.style.background = "oklch(76% 0.13 82)";
    led.style.boxShadow = "0 0 8px oklch(76% 0.13 82)";
    setTimeout(() => {
      camera.style.boxShadow = "";
      led.style.background = "oklch(60% 0.10 82)";
      led.style.boxShadow = "";
    }, 300);

    const stageW = stage.offsetWidth;
    const stageH = stage.offsetHeight;
    const startX = stageW * 0.13 + 30;
    const startY = stageH * 0.5 - 20;
    const endX = stageW * 0.76;
    const endY = stageH * 0.5 - 20;

    const p = document.createElement("div");
    p.style.cssText = `position:absolute;width:52px;height:40px;border-radius:6px;overflow:hidden;opacity:0;z-index:3;left:${startX}px;top:${startY}px;background:${PHOTO_COLORS[photoCount.current % PHOTO_COLORS.length]};border:1px solid oklch(40% 0.02 265);`;
    const dx = endX - startX;
    const dy = (photoCount.current % 2 === 0 ? -1 : 1) * -60 + (endY - startY);
    const rot = (Math.random() - 0.5) * 24;
    p.style.animation = "none";
    particles.appendChild(p);

    // Manual keyframe via requestAnimationFrame
    const duration = 1100;
    const start = performance.now();
    function frame(now: number) {
      const t = Math.min((now - start) / duration, 1);
      const ease = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
      const x = dx * ease;
      const y = dy * ease;
      const scale = 0.6 + ease * 0.3;
      const opacity = t < 0.1 ? t * 10 : t > 0.85 ? (1 - t) / 0.15 : 1;
      p.style.opacity = String(opacity);
      p.style.transform = `translate(${x}px,${y}px) scale(${scale}) rotate(${rot * ease}deg)`;
      if (t < 1) requestAnimationFrame(frame);
      else {
        p.remove();
        photoCount.current++;
        counter.textContent = String(photoCount.current);
        counter.style.transform = "scale(1.3)";
        setTimeout(() => { counter.style.transform = ""; }, 200);
        if (check) { check.style.opacity = "1"; setTimeout(() => { check.style.opacity = "0"; }, 400); }
      }
    }
    requestAnimationFrame(frame);
  }

  function loop() {
    if (!running.current) return;
    launchPhoto();
    timerRef.current = setTimeout(loop, 1200 + Math.random() * 800);
  }

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const obs = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting && !running.current) {
          running.current = true;
          loop();
        } else if (!e.isIntersecting) {
          running.current = false;
          if (timerRef.current) clearTimeout(timerRef.current);
        }
      });
    }, { threshold: 0.3 });
    obs.observe(stage);
    return () => { obs.disconnect(); running.current = false; if (timerRef.current) clearTimeout(timerRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div ref={stageRef} style={{ width: "100%", maxWidth: 900, height: 420, position: "relative", background: "oklch(15% 0.012 265)", border: "1px solid oklch(28% 0.012 265)", borderRadius: 24, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 80px" }}>
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 50% 50%, oklch(76% 0.13 82 / 0.04) 0%, transparent 70%)", pointerEvents: "none" }} />

      {/* Camera */}
      <div style={{ position: "relative", zIndex: 2, display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}>
        <div ref={cameraRef} style={{ width: 110, height: 80, background: "oklch(19% 0.012 265)", border: "2px solid oklch(28% 0.012 265)", borderRadius: 14, position: "relative", display: "flex", alignItems: "center", justifyContent: "center", transition: "box-shadow 0.4s" }}>
          <div style={{ position: "absolute", top: -14, left: 20, width: 24, height: 14, background: "oklch(19% 0.012 265)", border: "2px solid oklch(28% 0.012 265)", borderBottom: "none", borderRadius: "4px 4px 0 0" }} />
          <div style={{ width: 40, height: 40, borderRadius: "50%", background: "oklch(8% 0.02 265)", border: "3px solid oklch(32% 0.02 265)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ width: 16, height: 16, borderRadius: "50%", background: "radial-gradient(circle at 35% 35%, oklch(30% 0.04 265), oklch(8% 0.02 265))" }} />
          </div>
          <div ref={ledRef} style={{ position: "absolute", top: 10, right: 12, width: 8, height: 8, borderRadius: "50%", background: "oklch(60% 0.10 82)", transition: "background 0.1s" }} />
        </div>
        <div style={{ fontSize: 11, color: "oklch(58% 0.008 265)", letterSpacing: "0.1em", textTransform: "uppercase" }}>Guest&apos;s phone</div>
      </div>

      {/* Dotted paths */}
      <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 1 }} viewBox="0 0 900 420" preserveAspectRatio="xMidYMid meet">
        <path d="M230 210 Q450 130 670 210" stroke="oklch(35% 0.01 265)" strokeWidth="1" strokeDasharray="6 6" fill="none"/>
        <path d="M230 210 Q450 290 670 210" stroke="oklch(35% 0.01 265)" strokeWidth="1" strokeDasharray="6 6" fill="none"/>
      </svg>

      {/* Cloud */}
      <div style={{ position: "relative", zIndex: 2, display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}>
        <div style={{ width: 130, height: 90, position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg viewBox="0 0 130 90" fill="none" style={{ width: "100%", height: "100%" }}>
            <path d="M104 68H34C22.95 68 14 59.05 14 48c0-9.93 7.25-18.16 16.82-19.62C32.97 17.41 43.08 10 55 10c10.5 0 19.7 5.6 24.9 14.04C82.2 23.38 84.55 23 87 23c12.15 0 22 9.85 22 22 0 .36-.01.72-.02 1.08C114.93 47.2 119 52.65 119 59c0 4.97-4.03 9-9 9h-6z" fill="oklch(22% 0.015 265)" stroke="oklch(76% 0.13 82 / 0.5)" strokeWidth="1.5"/>
            <path ref={checkRef} d="M57 45l8 8 16-16" stroke="oklch(76% 0.13 82)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0, transition: "opacity 0.2s" }}/>
          </svg>
          <div ref={counterRef} style={{ position: "absolute", top: 8, right: -8, background: "oklch(76% 0.13 82)", color: "oklch(11% 0.012 265)", fontSize: 11, fontWeight: 500, padding: "2px 8px", borderRadius: 100, minWidth: 28, textAlign: "center", transition: "transform 0.15s" }}>0</div>
        </div>
        <div style={{ fontSize: 11, color: "oklch(58% 0.008 265)", letterSpacing: "0.1em", textTransform: "uppercase" }}>Your album</div>
      </div>

      <div ref={particlesRef} style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 3, overflow: "hidden", borderRadius: 24 }} />
    </div>
  );
}

export function HomeClient({ isLoggedIn }: { isLoggedIn: boolean }) {
  const [scrolled, setScrolled] = useState(false);
  useReveal();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div style={{ fontFamily: "'DM Sans', system-ui, sans-serif", fontWeight: 300, background: "oklch(11% 0.012 265)", color: "oklch(93% 0.008 80)", minHeight: "100vh", overflowX: "hidden" }}>
      <style>{`
        .hp-serif { font-family: 'Cormorant Garamond', Georgia, serif; }
        .hp-reveal { opacity: 0; transform: translateY(24px); transition: opacity 0.5s ease, transform 0.5s ease; }
        .hp-visible { opacity: 1 !important; transform: none !important; }
        @keyframes hp-fadeUp { from { opacity:0; transform:translateY(24px); } to { opacity:1; transform:none; } }
        @keyframes hp-thumbPop { from { opacity:0; transform:scale(0.7); } to { opacity:1; transform:scale(1); } }
        @keyframes hp-scrollPulse { 0%,100%{opacity:.3} 50%{opacity:1} }
        .hp-hero-badge { animation: hp-fadeUp 0.8s ease both; }
        .hp-hero-title { animation: hp-fadeUp 0.8s ease 0.1s both; }
        .hp-hero-sub   { animation: hp-fadeUp 0.8s ease 0.2s both; }
        .hp-hero-cta   { animation: hp-fadeUp 0.8s ease 0.3s both; }
        .hp-hero-card  { animation: hp-fadeUp 0.8s ease 0.4s both; }
        .hp-scroll-ind { animation: hp-fadeUp 0.8s ease 0.6s both; }
        .hp-thumb:nth-child(1){animation:hp-thumbPop 0.4s ease 0.8s both}
        .hp-thumb:nth-child(2){animation:hp-thumbPop 0.4s ease 1.0s both}
        .hp-thumb:nth-child(3){animation:hp-thumbPop 0.4s ease 1.2s both}
        .hp-thumb:nth-child(4){animation:hp-thumbPop 0.4s ease 1.4s both}
        .hp-thumb:nth-child(5){animation:hp-thumbPop 0.4s ease 1.6s both}
        .hp-thumb:nth-child(6){animation:hp-thumbPop 0.4s ease 1.8s both}
        .hp-scroll-line { width:1px; height:40px; background: linear-gradient(to bottom, oklch(60% 0.10 82), transparent); animation: hp-scrollPulse 2s ease-in-out infinite; }
      `}</style>

      {/* NAV */}
      <nav style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 100, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 48px", backdropFilter: "blur(16px)", background: "oklch(11% 0.012 265 / 0.8)", borderBottom: scrolled ? "1px solid oklch(28% 0.012 265)" : "1px solid transparent", transition: "border-color 0.3s" }}>
        <Link href="/" style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 22, fontWeight: 500, letterSpacing: "0.08em", color: "oklch(76% 0.13 82)", textDecoration: "none" }}>Captura</Link>
        <ul style={{ display: "flex", gap: 32, listStyle: "none" }}>
          {[["#how", "How it works"], ["#pricing", "Pricing"]].map(([href, label]) => (
            <li key={href}><a href={href} style={{ color: "oklch(58% 0.008 265)", fontSize: 14, textDecoration: "none", letterSpacing: "0.04em", transition: "color 0.2s" }} onMouseEnter={e => (e.currentTarget.style.color = "oklch(93% 0.008 80)")} onMouseLeave={e => (e.currentTarget.style.color = "oklch(58% 0.008 265)")}>{label}</a></li>
          ))}
          {!isLoggedIn && <li><Link href="/login" style={{ color: "oklch(58% 0.008 265)", fontSize: 14, textDecoration: "none", letterSpacing: "0.04em" }}>Sign in</Link></li>}
        </ul>
        {isLoggedIn ? (
          <Link href="/dashboard" style={{ background: "oklch(76% 0.13 82)", color: "oklch(11% 0.012 265)", padding: "9px 22px", borderRadius: 6, fontSize: 13, fontWeight: 500, textDecoration: "none", letterSpacing: "0.04em" }}>Dashboard</Link>
        ) : (
          <Link href="/register" style={{ background: "oklch(76% 0.13 82)", color: "oklch(11% 0.012 265)", padding: "9px 22px", borderRadius: 6, fontSize: 13, fontWeight: 500, textDecoration: "none", letterSpacing: "0.04em" }}>Get started free</Link>
        )}
      </nav>

      {/* HERO */}
      <section style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "120px 24px 80px", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -60%)", width: 700, height: 700, background: "radial-gradient(circle, oklch(76% 0.13 82 / 0.08) 0%, transparent 70%)", pointerEvents: "none" }} />

        <div className="hp-hero-badge" style={{ display: "inline-flex", alignItems: "center", gap: 8, border: "1px solid oklch(28% 0.012 265)", borderRadius: 100, padding: "6px 16px", fontSize: 12, letterSpacing: "0.1em", textTransform: "uppercase", color: "oklch(58% 0.008 265)", marginBottom: 32 }}>
          ✦ <span style={{ color: "oklch(76% 0.13 82)" }}>No app download required</span> for guests
        </div>

        <h1 className="hp-serif hp-hero-title" style={{ fontSize: "clamp(52px, 7vw, 96px)", fontWeight: 300, lineHeight: 1.05, letterSpacing: "-0.02em" }}>
          Every shot,<br /><em style={{ fontStyle: "italic", color: "oklch(76% 0.13 82)" }}>from every guest.</em>
        </h1>

        <p className="hp-hero-sub" style={{ marginTop: 24, fontSize: "clamp(15px, 1.8vw, 18px)", color: "oklch(58% 0.008 265)", maxWidth: 520, lineHeight: 1.7 }}>
          Create a shared album, share a QR code. Guests upload photos from their phone — no account, no friction.
        </p>

        <div className="hp-hero-cta" style={{ marginTop: 40, display: "flex", gap: 16, alignItems: "center" }}>
          <Link href="/register" style={{ background: "oklch(76% 0.13 82)", color: "oklch(11% 0.012 265)", padding: "14px 32px", borderRadius: 8, fontSize: 15, fontWeight: 500, letterSpacing: "0.03em", textDecoration: "none", display: "inline-block" }}>
            Create your first album
          </Link>
          <a href="#how" style={{ color: "oklch(58% 0.008 265)", fontSize: 15, textDecoration: "none", display: "flex", alignItems: "center", gap: 8 }}>
            See how it works
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </a>
        </div>

        {/* Hero card */}
        <div className="hp-hero-card" style={{ marginTop: 64, position: "relative", width: "100%", maxWidth: 860 }}>
          <div style={{ background: "oklch(15% 0.012 265)", border: "1px solid oklch(28% 0.012 265)", borderRadius: 18, padding: 32, display: "flex", gap: 20, alignItems: "flex-start", boxShadow: "0 40px 80px -20px oklch(0% 0 0 / 0.5)" }}>
            {/* QR */}
            <div style={{ flexShrink: 0, width: 120, height: 120, background: "white", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", padding: 8 }}>
              <svg viewBox="0 0 80 80" style={{ width: "100%", height: "100%" }}>
                <rect width="80" height="80" fill="white"/>
                <rect x="5" y="5" width="24" height="24" rx="3" fill="#0f0e14"/><rect x="9" y="9" width="16" height="16" rx="2" fill="white"/><rect x="13" y="13" width="8" height="8" rx="1" fill="#0f0e14"/>
                <rect x="51" y="5" width="24" height="24" rx="3" fill="#0f0e14"/><rect x="55" y="9" width="16" height="16" rx="2" fill="white"/><rect x="59" y="13" width="8" height="8" rx="1" fill="#0f0e14"/>
                <rect x="5" y="51" width="24" height="24" rx="3" fill="#0f0e14"/><rect x="9" y="55" width="16" height="16" rx="2" fill="white"/><rect x="13" y="59" width="8" height="8" rx="1" fill="#0f0e14"/>
                <rect x="34" y="5" width="5" height="5" rx="1" fill="#0f0e14"/><rect x="42" y="5" width="5" height="5" rx="1" fill="#0f0e14"/>
                <rect x="34" y="13" width="5" height="5" rx="1" fill="#c9a96e"/><rect x="34" y="21" width="5" height="5" rx="1" fill="#0f0e14"/>
                <rect x="34" y="34" width="5" height="5" rx="1" fill="#0f0e14"/><rect x="42" y="34" width="5" height="5" rx="1" fill="#0f0e14"/>
                <rect x="5" y="42" width="5" height="5" rx="1" fill="#c9a96e"/><rect x="42" y="42" width="5" height="5" rx="1" fill="#0f0e14"/>
                <rect x="34" y="51" width="5" height="5" rx="1" fill="#0f0e14"/><rect x="42" y="51" width="5" height="5" rx="1" fill="#c9a96e"/>
                <rect x="34" y="62" width="5" height="5" rx="1" fill="#0f0e14"/><rect x="42" y="62" width="5" height="5" rx="1" fill="#c9a96e"/>
                <rect x="34" y="70" width="5" height="5" rx="1" fill="#c9a96e"/>
              </svg>
            </div>
            {/* Info */}
            <div style={{ flex: 1, textAlign: "left" }}>
              <div style={{ fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: "oklch(58% 0.008 265)", marginBottom: 8 }}>Wedding · June 2026</div>
              <div className="hp-serif" style={{ fontSize: 28, fontWeight: 400, marginBottom: 8 }}>Sarah &amp; James</div>
              <div style={{ fontSize: 13, color: "oklch(58% 0.008 265)", display: "flex", flexDirection: "column", gap: 4 }}>
                <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M8 2a4 4 0 100 8A4 4 0 008 2zM2 14c0-2.2 2.7-4 6-4s6 1.8 6 4"/></svg>
                  247 uploads
                </span>
                <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="3" width="12" height="11" rx="2"/><path d="M5 3V1M11 3V1M2 7h12"/></svg>
                  Closes Jun 15
                </span>
              </div>
            </div>
            {/* Thumbnails */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 64px)", gap: 6, flexShrink: 0 }}>
              {["oklch(28% 0.06 30)","oklch(25% 0.05 200)","oklch(30% 0.04 280)","oklch(26% 0.06 60)","oklch(22% 0.03 150)","oklch(29% 0.05 320)"].map((bg, i) => (
                <div key={i} className="hp-thumb" style={{ width: 64, height: 64, borderRadius: 6, background: bg, border: "1px solid oklch(28% 0.012 265)" }} />
              ))}
            </div>
          </div>
        </div>

        <div className="hp-scroll-ind" style={{ marginTop: 48, display: "flex", flexDirection: "column", alignItems: "center", gap: 8, color: "oklch(58% 0.008 265)", fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase" }}>
          <div className="hp-scroll-line" />
          <span>scroll</span>
        </div>
      </section>

      {/* ANIMATION SECTION */}
      <section id="how" style={{ padding: "120px 24px", display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div style={{ fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", color: "oklch(60% 0.10 82)", marginBottom: 16 }}>In motion</div>
        <h2 className="hp-serif" style={{ fontSize: "clamp(36px, 4.5vw, 60px)", fontWeight: 300, lineHeight: 1.1, textAlign: "center", marginBottom: 16 }}>Guests snap.<br />You receive.</h2>
        <p style={{ fontSize: 16, color: "oklch(58% 0.008 265)", textAlign: "center", maxWidth: 480, lineHeight: 1.7, marginBottom: 80 }}>
          The moment a guest scans your QR code, their photos fly straight into your album.
        </p>
        <CameraAnimation />

        {/* Steps */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 2, width: "100%", maxWidth: 900, marginTop: 48 }}>
          {STEPS.map((s, i) => (
            <div key={s.num} className="hp-reveal" style={{ background: "oklch(15% 0.012 265)", border: "1px solid oklch(28% 0.012 265)", padding: "28px 24px", display: "flex", flexDirection: "column", gap: 12, borderRadius: i === 0 ? "12px 0 0 12px" : i === 3 ? "0 12px 12px 0" : 0 }}>
              <div className="hp-serif" style={{ fontSize: 36, fontWeight: 300, color: "oklch(76% 0.13 82)", lineHeight: 1 }}>{s.num}</div>
              <div style={{ fontSize: 14, fontWeight: 500, letterSpacing: "0.02em" }}>{s.title}</div>
              <div style={{ fontSize: 13, color: "oklch(58% 0.008 265)", lineHeight: 1.6 }}>{s.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* FEATURES */}
      <section style={{ padding: "120px 24px", display: "flex", flexDirection: "column", alignItems: "center", background: "oklch(15% 0.012 265)" }}>
        <div style={{ fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", color: "oklch(60% 0.10 82)", marginBottom: 16 }}>Features</div>
        <h2 className="hp-serif" style={{ fontSize: "clamp(36px, 4.5vw, 60px)", fontWeight: 300, lineHeight: 1.1, textAlign: "center", marginBottom: 16 }}>Built for real events</h2>
        <p style={{ fontSize: 16, color: "oklch(58% 0.008 265)", textAlign: "center", maxWidth: 480, lineHeight: 1.7, marginBottom: 60 }}>Every detail designed to keep hosts in control and guests happy.</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24, width: "100%", maxWidth: 1000 }}>
          {FEATURES.map((f) => (
            <div key={f.title} className="hp-reveal" style={{ background: "oklch(11% 0.012 265)", border: "1px solid oklch(28% 0.012 265)", borderRadius: 14, padding: "32px 28px", display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ width: 44, height: 44, borderRadius: 10, background: "oklch(76% 0.13 82 / 0.12)", border: "1px solid oklch(76% 0.13 82 / 0.25)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div style={{ width: 20, height: 20, color: "oklch(76% 0.13 82)" }}>{f.icon}</div>
              </div>
              <div style={{ fontSize: 15, fontWeight: 500 }}>{f.title}</div>
              <div style={{ fontSize: 13, color: "oklch(58% 0.008 265)", lineHeight: 1.65 }}>{f.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" style={{ padding: "120px 24px", display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div style={{ fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", color: "oklch(60% 0.10 82)", marginBottom: 16 }}>Pricing</div>
        <h2 className="hp-serif" style={{ fontSize: "clamp(36px, 4.5vw, 60px)", fontWeight: 300, lineHeight: 1.1, textAlign: "center", marginBottom: 16 }}>Simple, honest plans</h2>
        <p style={{ fontSize: 16, color: "oklch(58% 0.008 265)", textAlign: "center", maxWidth: 480, lineHeight: 1.7, marginBottom: 64 }}>Start free. Grow as your events do.</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 320px)", gap: 24 }}>
          {PLANS.map((plan) => (
            <div key={plan.name} className="hp-reveal" style={{ background: plan.featured ? "oklch(17% 0.018 265)" : "oklch(15% 0.012 265)", border: `1px solid ${plan.featured ? "oklch(76% 0.13 82 / 0.4)" : "oklch(28% 0.012 265)"}`, borderRadius: 20, padding: "40px 36px", display: "flex", flexDirection: "column", position: "relative" }}>
              {plan.featured && <div style={{ position: "absolute", top: -12, left: "50%", transform: "translateX(-50%)", background: "oklch(76% 0.13 82)", color: "oklch(11% 0.012 265)", fontSize: 11, fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase", padding: "4px 14px", borderRadius: 100, whiteSpace: "nowrap" }}>Most popular</div>}
              <div style={{ fontSize: 12, letterSpacing: "0.12em", textTransform: "uppercase", color: "oklch(58% 0.008 265)", marginBottom: 16 }}>{plan.name}</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 8 }}>
                <span style={{ fontSize: 20, color: "oklch(58% 0.008 265)", alignSelf: "flex-start", marginTop: 8 }}>$</span>
                <span className="hp-serif" style={{ fontSize: 64, fontWeight: 300, lineHeight: 1 }}>{plan.price}</span>
                <span style={{ fontSize: 14, color: "oklch(58% 0.008 265)" }}>{plan.period}</span>
              </div>
              <div style={{ fontSize: 13, color: "oklch(58% 0.008 265)", marginBottom: 28, lineHeight: 1.6 }}>{plan.desc}</div>
              <div style={{ height: 1, background: "oklch(28% 0.012 265)", marginBottom: 28 }} />
              <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 12, flex: 1 }}>
                {plan.features.map((feat) => (
                  <li key={feat} style={{ fontSize: 13, display: "flex", alignItems: "flex-start", gap: 10 }}>
                    <span style={{ width: 16, height: 16, flexShrink: 0, borderRadius: "50%", background: "oklch(76% 0.13 82 / 0.12)", border: "1px solid oklch(76% 0.13 82 / 0.3)", display: "inline-flex", alignItems: "center", justifyContent: "center", marginTop: 1 }}>
                      <svg viewBox="0 0 16 16" width="10" height="10"><path d="M3.5 8 L6.5 11 L12.5 5" stroke="oklch(76% 0.13 82)" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </span>
                    {feat}
                  </li>
                ))}
              </ul>
              <Link href="/register" style={{ marginTop: 32, display: "block", textAlign: "center", textDecoration: "none", padding: "13px 24px", borderRadius: 8, fontSize: 14, fontWeight: 500, letterSpacing: "0.04em", background: plan.featured ? "oklch(76% 0.13 82)" : "transparent", border: plan.featured ? "1px solid oklch(76% 0.13 82)" : "1px solid oklch(28% 0.012 265)", color: plan.featured ? "oklch(11% 0.012 265)" : "oklch(93% 0.008 80)" }}>
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: "80px 24px 120px", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div className="hp-reveal" style={{ width: "100%", maxWidth: 900, background: "oklch(15% 0.012 265)", border: "1px solid oklch(76% 0.13 82 / 0.2)", borderRadius: 24, padding: "72px 64px", textAlign: "center", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: 600, height: 300, background: "radial-gradient(ellipse, oklch(76% 0.13 82 / 0.07) 0%, transparent 70%)", pointerEvents: "none" }} />
          <h2 className="hp-serif" style={{ fontSize: "clamp(36px, 4vw, 56px)", fontWeight: 300, lineHeight: 1.1, marginBottom: 16, position: "relative" }}>
            Your next event<br />deserves <em style={{ fontStyle: "italic", color: "oklch(76% 0.13 82)" }}>every photo.</em>
          </h2>
          <p style={{ fontSize: 16, color: "oklch(58% 0.008 265)", marginBottom: 40, maxWidth: 400, marginLeft: "auto", marginRight: "auto", position: "relative", lineHeight: 1.7 }}>
            Set up your first album in under two minutes. No credit card required.
          </p>
          <Link href="/register" style={{ background: "oklch(76% 0.13 82)", color: "oklch(11% 0.012 265)", padding: "14px 32px", borderRadius: 8, fontSize: 15, fontWeight: 500, letterSpacing: "0.03em", textDecoration: "none", display: "inline-block", position: "relative" }}>
            Create a free album
          </Link>
          <p style={{ fontSize: 12, color: "oklch(58% 0.008 265)", marginTop: 16, position: "relative" }}>Free forever · No app download for guests · Cancel anytime</p>
        </div>
      </section>

      {/* FAQ — indexed by search engines and AI crawlers */}
      <section style={{ padding: "80px 48px", maxWidth: 900, margin: "0 auto" }}>
        <h2 className="hp-serif" style={{ fontSize: "clamp(28px, 3vw, 42px)", fontWeight: 300, textAlign: "center", marginBottom: 48, color: "oklch(93% 0.008 80)" }}>
          Frequently asked questions
        </h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          {[
            { q: "What is Captura?", a: "Captura is a web app for collecting photos and videos from event guests. Create a shared album, generate a QR code, and guests scan it to upload directly from their phone — no app download or account required." },
            { q: "Do guests need to download an app to upload photos?", a: "No. Guests scan a QR code which opens a page in their phone's browser. They enter their name and upload photos or videos. Zero friction, zero downloads." },
            { q: "What events is Captura good for?", a: "Weddings, birthday parties, corporate events, reunions, graduations, baby showers, sports events, conferences — any occasion where you want to crowdsource photos from attendees." },
            { q: "Can I collect photos from wedding guests without an app?", a: "Yes. Captura is designed exactly for this. Print or display a QR code at your venue. Guests scan and upload from any phone browser. You download everything as a ZIP after the event." },
            { q: "How does the face detection work?", a: "After guests upload photos, Captura automatically detects and groups faces. As the album owner, you can filter your gallery to see every photo that features a specific person — useful for finding all photos of the bride, the birthday person, or any guest." },
            { q: "Can I limit when guests can upload photos?", a: "Yes. Each album can have an open date and a close date. Uploads are automatically restricted to that window — no manual closing needed." },
            { q: "How do I download all the event photos?", a: "You can download all photos and videos as a single ZIP file from your gallery with one click. You can also select specific photos to download." },
            { q: "Is there a free plan?", a: "Yes. The Starter plan is free and includes 1 album and 5 GB of storage — enough to try Captura for a single event." },
          ].map(({ q, a }, i) => (
            <div key={i} style={{ borderTop: "1px solid oklch(28% 0.012 265)", padding: "24px 0" }}>
              <h3 style={{ fontSize: 15, fontWeight: 500, color: "oklch(93% 0.008 80)", marginBottom: 10 }}>{q}</h3>
              <p style={{ fontSize: 14, color: "oklch(58% 0.008 265)", lineHeight: 1.7 }}>{a}</p>
            </div>
          ))}
          <div style={{ borderTop: "1px solid oklch(28% 0.012 265)" }} />
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ borderTop: "1px solid oklch(28% 0.012 265)", padding: 48, display: "grid", gridTemplateColumns: "1fr auto auto auto", gap: 48, alignItems: "start" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div className="hp-serif" style={{ fontSize: 20, color: "oklch(76% 0.13 82)", letterSpacing: "0.08em" }}>Captura</div>
          <div style={{ fontSize: 13, color: "oklch(58% 0.008 265)", maxWidth: 220, lineHeight: 1.6 }}>Crowd-sourced event photos, without the friction.</div>
        </div>
        {[["Product", [["How it works", "#how"], ["Pricing", "#pricing"], ["Face detection", "#"], ["Guest uploads", "#"]]],
          ["Company", [["About", "#"], ["Blog", "#"], ["Careers", "#"], ["Press", "#"]]],
          ["Legal", [["Privacy", "#"], ["Terms", "#"], ["Security", "#"], ["GDPR", "#"]]]].map(([title, links]) => (
          <div key={title as string} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: "oklch(58% 0.008 265)", marginBottom: 4 }}>{title as string}</div>
            {(links as [string, string][]).map(([label, href]) => (
              <a key={label} href={href} style={{ fontSize: 13, color: "oklch(55% 0.008 265)", textDecoration: "none" }}>{label}</a>
            ))}
          </div>
        ))}
      </footer>
      <div style={{ borderTop: "1px solid oklch(28% 0.012 265)", padding: "20px 48px", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12, color: "oklch(58% 0.008 265)" }}>
        <span>© 2026 Captura. All rights reserved.</span>
        <span>Made for moments worth keeping.</span>
      </div>
    </div>
  );
}
