// Theme of the public invitation page. The API sends the colours of the guest's invitation design; they are checked
// again here before they reach CSS, and the text colour on coloured areas is chosen for contrast.

export interface InvitationTheme {
  design?: string;
  background: string;
  primary: string;
  accent: string;
  ink: string;
  heading: "serif" | "sans";
}

// The page's original look, used when an older API does not send a theme
export const DEFAULT_INVITATION_THEME: InvitationTheme = {
  background: "#F6F7F9",
  primary: "#DC320F", // the page's red, darkened a little so its white text reads at 4.5:1 (it was #E3340F at 4.4:1)
  accent: "#123C8F",
  ink: "#15191C",
  heading: "sans",
};

const HEX = /^#[0-9a-fA-F]{6}$/;

export function resolveInvitationTheme(theme?: Partial<InvitationTheme> | null): InvitationTheme {
  const pick = (value: unknown, fallback: string) => (typeof value === "string" && HEX.test(value) ? value : fallback);
  // The page's panels are light whatever the card looks like (a dark card palette has light text), so body text must
  // stay dark enough to read on white: a too-light ink falls back to the default dark ink.
  const ink = pick(theme?.ink, DEFAULT_INVITATION_THEME.ink);
  return {
    design: typeof theme?.design === "string" ? theme.design : undefined,
    background: pick(theme?.background, DEFAULT_INVITATION_THEME.background),
    primary: accessiblePrimary(pick(theme?.primary, DEFAULT_INVITATION_THEME.primary)),
    accent: pick(theme?.accent, DEFAULT_INVITATION_THEME.accent),
    ink: luminance(ink) <= 0.183 ? ink : DEFAULT_INVITATION_THEME.ink,
    heading: theme?.heading === "serif" ? "serif" : "sans",
  };
}

function channel(v: number): number {
  const c = v / 255;
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

export function luminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  return 0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255);
}

/** White or near-black, whichever reads better on `hex`. */
export function readableOn(hex: string): "#FFFFFF" | "#15191C" {
  return luminance(hex) > 0.4 ? "#15191C" : "#FFFFFF";
}

/** WCAG contrast ratio of two #rrggbb colours. */
export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** The theme's primary colour carries the page's buttons and headings: keep it as close as it is, but dark (or light) enough for its text to meet 4.5:1. */
export function accessiblePrimary(hex: string): string {
  const text = readableOn(hex);
  const toward = text === "#FFFFFF" ? "#000000" : "#FFFFFF";
  let out = hex;
  for (let i = 0; i < 25 && contrastRatio(out, readableOn(out)) < 4.5; i++) out = mix(out, toward, 0.03);
  return out;
}

function mix(a: string, b: string, amount: number): string {
  const x = parseInt(a.slice(1), 16);
  const y = parseInt(b.slice(1), 16);
  const ch = (shift: number) => Math.round(((x >> shift) & 255) * (1 - amount) + ((y >> shift) & 255) * amount);
  return `#${((ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).padStart(6, "0")}`;
}

/** Mixes `hex` toward white (amount 0-1); used for soft tints of the theme colours. */
export function tint(hex: string, amount: number): string {
  const n = parseInt(hex.slice(1), 16);
  const mix = (v: number) => Math.round(v + (255 - v) * amount);
  const out = (mix((n >> 16) & 255) << 16) | (mix((n >> 8) & 255) << 8) | mix(n & 255);
  return `#${out.toString(16).padStart(6, "0")}`;
}

/** CSS custom properties for the page wrapper. */
export function themeCssVars(theme: InvitationTheme): Record<string, string> {
  return {
    "--inv-bg": theme.background,
    "--inv-primary": theme.primary,
    "--inv-on-primary": readableOn(theme.primary),
    "--inv-accent": theme.accent,
    // accent used as text/icon colour on the light panels: darkened when the accent itself is too light to read
    "--inv-accent-text": luminance(theme.accent) <= 0.3 ? theme.accent : mix(theme.accent, theme.ink, 0.5),
    "--inv-ink": theme.ink,
    "--inv-soft": tint(theme.accent, 0.9),
    "--inv-line": tint(theme.accent, 0.75),
    "--inv-heading": theme.heading === "serif" ? "Georgia, 'Times New Roman', serif" : "inherit",
  };
}
