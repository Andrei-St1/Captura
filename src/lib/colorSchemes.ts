export type SchemeKey = "amber" | "rose" | "sage" | "slate" | "violet";

export interface ColorScheme {
  label: string;
  accent: string;
  accentFaint: string;
  accentSubtle: string;
  accentDim: string;
  particle: string;
  bg: string;
  bgAlt: string;
  bgGlass: string;
  bgNav: string;
  border: string;
  text: string;
  muted: string;
  dim: string;
  leftG1: string;
  leftG2: string;
  leftG3: string;
}

export const SCHEMES: Record<SchemeKey, ColorScheme> = {
  amber: {
    label:        "Amber",
    accent:       "oklch(44% 0.16 72)",
    accentFaint:  "oklch(44% 0.16 72 / 0.09)",
    accentSubtle: "oklch(44% 0.16 72 / 0.28)",
    accentDim:    "oklch(44% 0.16 72 / 0.15)",
    particle:     "oklch(80% 0.12 72 / 0.6)",
    bg:           "oklch(97% 0.008 80)",
    bgAlt:        "oklch(93% 0.010 80)",
    bgGlass:      "oklch(97% 0.008 80 / 0.88)",
    bgNav:        "oklch(97% 0.008 80 / 0.95)",
    border:       "oklch(80% 0.010 80)",
    text:         "oklch(18% 0.015 265)",
    muted:        "oklch(46% 0.010 265)",
    dim:          "oklch(58% 0.010 265)",
    leftG1:       "oklch(12% 0.04 60)",
    leftG2:       "oklch(18% 0.08 72)",
    leftG3:       "oklch(24% 0.06 80)",
  },
  rose: {
    label:        "Rose",
    accent:       "oklch(50% 0.14 0)",
    accentFaint:  "oklch(50% 0.14 0 / 0.09)",
    accentSubtle: "oklch(50% 0.14 0 / 0.28)",
    accentDim:    "oklch(50% 0.14 0 / 0.15)",
    particle:     "oklch(78% 0.12 5 / 0.6)",
    bg:           "oklch(98% 0.006 10)",
    bgAlt:        "oklch(94% 0.008 10)",
    bgGlass:      "oklch(98% 0.006 10 / 0.88)",
    bgNav:        "oklch(98% 0.006 10 / 0.95)",
    border:       "oklch(84% 0.008 10)",
    text:         "oklch(18% 0.015 265)",
    muted:        "oklch(46% 0.010 265)",
    dim:          "oklch(58% 0.010 265)",
    leftG1:       "oklch(14% 0.04 0)",
    leftG2:       "oklch(20% 0.08 10)",
    leftG3:       "oklch(26% 0.06 20)",
  },
  sage: {
    label:        "Sage",
    accent:       "oklch(45% 0.10 155)",
    accentFaint:  "oklch(45% 0.10 155 / 0.09)",
    accentSubtle: "oklch(45% 0.10 155 / 0.28)",
    accentDim:    "oklch(45% 0.10 155 / 0.15)",
    particle:     "oklch(76% 0.10 148 / 0.6)",
    bg:           "oklch(97% 0.006 145)",
    bgAlt:        "oklch(93% 0.008 145)",
    bgGlass:      "oklch(97% 0.006 145 / 0.88)",
    bgNav:        "oklch(97% 0.006 145 / 0.95)",
    border:       "oklch(82% 0.008 145)",
    text:         "oklch(18% 0.015 265)",
    muted:        "oklch(46% 0.010 265)",
    dim:          "oklch(58% 0.010 265)",
    leftG1:       "oklch(14% 0.05 150)",
    leftG2:       "oklch(20% 0.08 155)",
    leftG3:       "oklch(26% 0.06 145)",
  },
  slate: {
    label:        "Slate",
    accent:       "oklch(50% 0.12 240)",
    accentFaint:  "oklch(50% 0.12 240 / 0.09)",
    accentSubtle: "oklch(50% 0.12 240 / 0.28)",
    accentDim:    "oklch(50% 0.12 240 / 0.15)",
    particle:     "oklch(74% 0.10 240 / 0.6)",
    bg:           "oklch(97% 0.006 240)",
    bgAlt:        "oklch(93% 0.008 240)",
    bgGlass:      "oklch(97% 0.006 240 / 0.88)",
    bgNav:        "oklch(97% 0.006 240 / 0.95)",
    border:       "oklch(82% 0.008 240)",
    text:         "oklch(18% 0.015 265)",
    muted:        "oklch(46% 0.010 265)",
    dim:          "oklch(58% 0.010 265)",
    leftG1:       "oklch(14% 0.04 240)",
    leftG2:       "oklch(20% 0.07 245)",
    leftG3:       "oklch(26% 0.06 235)",
  },
  violet: {
    label:        "Violet",
    accent:       "oklch(50% 0.16 290)",
    accentFaint:  "oklch(50% 0.16 290 / 0.09)",
    accentSubtle: "oklch(50% 0.16 290 / 0.28)",
    accentDim:    "oklch(50% 0.16 290 / 0.15)",
    particle:     "oklch(76% 0.14 290 / 0.6)",
    bg:           "oklch(97% 0.006 290)",
    bgAlt:        "oklch(93% 0.008 290)",
    bgGlass:      "oklch(97% 0.006 290 / 0.88)",
    bgNav:        "oklch(97% 0.006 290 / 0.95)",
    border:       "oklch(82% 0.008 290)",
    text:         "oklch(18% 0.015 265)",
    muted:        "oklch(46% 0.010 265)",
    dim:          "oklch(58% 0.010 265)",
    leftG1:       "oklch(14% 0.05 280)",
    leftG2:       "oklch(20% 0.09 290)",
    leftG3:       "oklch(26% 0.07 295)",
  },
};

export const SCHEME_KEYS: SchemeKey[] = ["amber", "rose", "sage", "slate", "violet"];

export function getScheme(key: string | null | undefined): ColorScheme {
  return SCHEMES[key as SchemeKey] ?? SCHEMES.amber;
}

export function schemeToCss(s: ColorScheme): string {
  return `:root {
  --cs-accent: ${s.accent};
  --cs-accent-faint: ${s.accentFaint};
  --cs-accent-subtle: ${s.accentSubtle};
  --cs-accent-dim: ${s.accentDim};
  --cs-particle: ${s.particle};
  --cs-bg: ${s.bg};
  --cs-bg-alt: ${s.bgAlt};
  --cs-bg-glass: ${s.bgGlass};
  --cs-bg-nav: ${s.bgNav};
  --cs-border: ${s.border};
  --cs-text: ${s.text};
  --cs-muted: ${s.muted};
  --cs-dim: ${s.dim};
  --cs-left-g1: ${s.leftG1};
  --cs-left-g2: ${s.leftG2};
  --cs-left-g3: ${s.leftG3};
}`;
}
