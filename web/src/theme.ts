import { alpha, createTheme, type PaletteMode } from "@mui/material/styles";

// "Luminescent Telemetry" design system (Google Stitch). The dark palette is
// the source design; the light palette mirrors its roles at accessible contrast.

interface SurfacePalette {
  base: string;
  card: string;
  glass: string;
  lowest: string;
  low: string;
  container: string;
  high: string;
  highest: string;
  border: string;
}

interface AccentPalette {
  // Text/icon tint on dark surfaces
  primary: string;
  tertiary: string;
  // Filled control (active tab, primary button) and its foreground
  container: string;
  onContainer: string;
}

interface StatePalette {
  positive: string;
  positiveSubtle: string;
  negative: string;
  negativeSubtle: string;
  warning: string;
  warningSubtle: string;
}

declare module "@mui/material/styles" {
  interface Palette {
    surface: SurfacePalette;
    accent: AccentPalette;
    state: StatePalette;
  }
  interface PaletteOptions {
    surface?: SurfacePalette;
    accent?: AccentPalette;
    state?: StatePalette;
  }
  interface TypeText {
    muted: string;
  }
}

export const SANS = '"Plus Jakarta Sans", "Helvetica Neue", Arial, sans-serif';
export const MONO = '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace';

export const BRAND_GRADIENT = "linear-gradient(135deg, #8B5CF6, #EC4899)";

const tokens = {
  dark: {
    surface: {
      base: "#0B0F19",
      card: "#111827",
      glass: "#171F33",
      lowest: "#0A0E18",
      low: "#171B26",
      container: "#1C1F2A",
      high: "#262A35",
      highest: "#313540",
      border: "rgba(255, 255, 255, 0.08)",
    },
    accent: {
      primary: "#D0BCFF",
      tertiary: "#C0C1FF",
      container: "#A078FF",
      onContainer: "#340080",
    },
    state: {
      positive: "#10B981",
      positiveSubtle: "#064E3B",
      negative: "#F43F5E",
      negativeSubtle: "#4C0519",
      warning: "#F59E0B",
      warningSubtle: "#451A03",
    },
    text: { primary: "#F9FAFB", secondary: "#9CA3AF", muted: "#64748B" },
    primary: "#8B5CF6",
    secondary: "#EC4899",
  },
  light: {
    surface: {
      base: "#F7F6FB",
      card: "#FFFFFF",
      glass: "#F4F0FF",
      lowest: "#ECE9F4",
      low: "#F3F1F9",
      container: "#EDEAF5",
      high: "#E4E0EF",
      highest: "#D9D4E8",
      border: "rgba(15, 23, 42, 0.09)",
    },
    accent: {
      primary: "#6D28D9",
      tertiary: "#4F46E5",
      container: "#E9DDFF",
      onContainer: "#4C1D95",
    },
    state: {
      positive: "#047857",
      positiveSubtle: "#D1FAE5",
      negative: "#BE123C",
      negativeSubtle: "#FFE4E6",
      warning: "#B45309",
      warningSubtle: "#FEF3C7",
    },
    text: { primary: "#111827", secondary: "#4B5563", muted: "#6B7280" },
    primary: "#7C3AED",
    secondary: "#DB2777",
  },
} as const;

export const createAppTheme = (mode: PaletteMode) => {
  const t = tokens[mode];
  const dark = mode === "dark";

  return createTheme({
    palette: {
      mode,
      primary: { main: t.primary },
      secondary: { main: t.secondary },
      success: { main: t.state.positive },
      warning: { main: t.state.warning },
      error: { main: t.state.negative },
      background: { default: t.surface.base, paper: t.surface.card },
      text: t.text,
      divider: t.surface.border,
      surface: t.surface,
      accent: t.accent,
      state: t.state,
    },
    typography: {
      fontFamily: SANS,
      h1: { fontWeight: 800, letterSpacing: "-0.03em" },
      h2: { fontWeight: 700, letterSpacing: "-0.02em" },
      h3: { fontWeight: 600, fontSize: "1.125rem", lineHeight: 1.33 },
      button: { textTransform: "none", fontWeight: 600 },
    },
    shape: { borderRadius: 8 },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            backgroundColor: t.surface.base,
            backgroundImage: `radial-gradient(ellipse 80% 50% at 50% -20%, ${alpha(
              t.primary,
              dark ? 0.15 : 0.1,
            )}, transparent 70%)`,
            backgroundRepeat: "no-repeat",
          },
          "code, kbd": { fontFamily: MONO },
        },
      },
      // <button> elements don't inherit the page font by default
      MuiButtonBase: {
        styleOverrides: { root: { fontFamily: "inherit" } },
      },
      MuiButton: {
        defaultProps: { disableElevation: true },
        styleOverrides: { root: { borderRadius: 8 } },
      },
      MuiPaper: {
        styleOverrides: { root: { backgroundImage: "none" } },
      },
      MuiTooltip: {
        styleOverrides: {
          tooltip: { fontFamily: MONO, fontSize: 11, backgroundColor: t.surface.highest, color: t.text.primary },
        },
      },
    },
  });
};
