// Instant loading state for guest pages. Shown while the next page renders on the server,
// and lets Next prefetch the shell for the tab links. Neutral colours: the album's
// colour-scheme variables are only set once the real page has rendered.
type Variant = "welcome" | "upload" | "gallery";

export function JoinSkeleton({ variant }: { variant: Variant }) {
  return (
    <>
      <style>{CSS}</style>
      <div className="jsk-root" aria-busy="true" aria-live="polite">
        <div className="jsk-bar" />
        {variant === "welcome" && (
          <div className="jsk-center">
            <div className="jsk-block" style={{ width: "62%", height: 34 }} />
            <div className="jsk-block" style={{ width: "40%", height: 16 }} />
            <div className="jsk-block" style={{ width: 220, height: 48, borderRadius: 12, marginTop: 12 }} />
          </div>
        )}
        {variant === "upload" && (
          <div className="jsk-col">
            <div className="jsk-block" style={{ width: "50%", height: 28 }} />
            <div className="jsk-block" style={{ width: "100%", height: 180, borderRadius: 16 }} />
          </div>
        )}
        {variant === "gallery" && (
          <div className="jsk-grid">
            {Array.from({ length: 12 }, (_, i) => (
              <div key={i} className="jsk-block" style={{ aspectRatio: i % 3 === 0 ? "3 / 4" : "4 / 3", borderRadius: 10 }} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}

const CSS = `
  .jsk-root { min-height: 100dvh; background: oklch(97% 0.008 80); display: flex; flex-direction: column; }
  .jsk-bar { height: 60px; border-bottom: 1px solid oklch(90% 0.010 80); }
  .jsk-center { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 14px; padding: 24px; }
  .jsk-col { width: 100%; max-width: 560px; margin: 0 auto; padding: 32px 20px; display: flex; flex-direction: column; gap: 20px; }
  .jsk-grid { padding: 16px; display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 10px; }
  .jsk-block {
    background: linear-gradient(90deg, oklch(93% 0.010 80) 25%, oklch(96% 0.008 80) 50%, oklch(93% 0.010 80) 75%);
    background-size: 200% 100%;
    border-radius: 8px;
    animation: jsk-shimmer 1.3s ease-in-out infinite;
  }
  @keyframes jsk-shimmer { from { background-position: 200% 0; } to { background-position: -200% 0; } }
  @media (prefers-reduced-motion: reduce) { .jsk-block { animation: none; } }
`;
