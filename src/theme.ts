import { alpha, createTheme, type PaletteMode } from "@mui/material/styles";

// "Consumer Clean" design (Google Stitch, Follower Watch project). Light uses
// the zinc neutrals of the light screen, dark the tonal surfaces of the dark
// screen. Cards are borderless and separated by a hairline ring shadow.

interface SurfacePalette {
  // Page background
  base: string;
  // Raised card
  card: string;
  // Recessed tracks (segmented controls, sub-bars)
  lowest: string;
  low: string;
  container: string;
  high: string;
  highest: string;
  border: string;
  // Fill of buttons, inputs and selects, and their hover
  control: string;
  controlHover: string;
}

interface AccentPalette {
  // Text/icon tint
  primary: string;
  // Filled primary action and its foreground
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

export const SANS = '"Geist", "Helvetica Neue", Arial, sans-serif';
export const MONO = '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace';

const tokens = {
  light: {
    surface: {
      base: "#FFFFFF",
      card: "#FFFFFF",
      lowest: "#F4F4F5",
      low: "#FAFAFA",
      container: "#F4F4F5",
      high: "#E4E4E7",
      highest: "#D4D4D8",
      border: "rgba(9, 9, 11, 0.08)",
      control: "#FFFFFF",
      controlHover: "#F4F4F5",
    },
    accent: {
      primary: "#0059C5",
      container: "#09090B",
      onContainer: "#FAFAFA",
    },
    state: {
      positive: "#059669",
      positiveSubtle: "#ECFDF5",
      negative: "#DC2626",
      negativeSubtle: "#FEF2F2",
      warning: "#B45309",
      warningSubtle: "#FEF3C7",
    },
    text: { primary: "#09090B", secondary: "#52525B", muted: "#71717A" },
    primary: "#0070F3",
    shadow: "0 0 0 1px rgba(9, 9, 11, 0.06), 0 1px 2px rgba(9, 9, 11, 0.05)",
  },
  dark: {
    surface: {
      base: "#12131A",
      card: "#1A1B22",
      lowest: "#0D0E15",
      low: "#1A1B22",
      container: "#1E1F26",
      high: "#292931",
      highest: "#33343C",
      border: "rgba(255, 255, 255, 0.06)",
      control: "#1E1F26",
      controlHover: "#292931",
    },
    accent: {
      primary: "#AEC6FF",
      container: "#AEC6FF",
      onContainer: "#002E6B",
    },
    state: {
      positive: "#4EDEA3",
      positiveSubtle: "#00311F",
      negative: "#FFB4AB",
      negativeSubtle: "#93000A",
      warning: "#FFB955",
      warningSubtle: "#452B00",
    },
    text: { primary: "#E3E1EC", secondary: "#C1C6D7", muted: "#8B90A0" },
    primary: "#AEC6FF",
    shadow: "0 0 0 1px rgba(255, 255, 255, 0.04), 0 1px 2px rgba(0, 0, 0, 0.3)",
  },
} as const;

export const createAppTheme = (mode: PaletteMode) => {
  const t = tokens[mode];

  return createTheme({
    palette: {
      mode,
      primary: { main: t.primary },
      secondary: { main: t.state.positive },
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
      h1: { fontWeight: 600, letterSpacing: "-0.04em" },
      h2: { fontWeight: 600, letterSpacing: "-0.02em" },
      h3: { fontWeight: 600, fontSize: "1.125rem", lineHeight: 1.33, letterSpacing: "-0.015em" },
      button: { textTransform: "none", fontWeight: 500 },
    },
    shape: { borderRadius: 8 },
    shadows: [
      "none",
      t.shadow,
      ...Array(23).fill(mode === "dark" ? "0 12px 32px -8px rgba(0,0,0,0.6)" : "0 12px 32px -8px rgba(9,9,11,0.16)"),
    ] as ReturnType<typeof createTheme>["shadows"],
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            backgroundColor: t.surface.base,
            WebkitFontSmoothing: "antialiased",
            MozOsxFontSmoothing: "grayscale",
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
      MuiMenu: {
        styleOverrides: {
          paper: { border: `1px solid ${t.surface.border}`, boxShadow: t.shadow },
        },
      },
      MuiSnackbarContent: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 500,
            backgroundColor: mode === "dark" ? t.surface.highest : "#09090B",
            color: mode === "dark" ? t.text.primary : "#FAFAFA",
          },
        },
      },
      MuiTooltip: {
        styleOverrides: {
          tooltip: {
            fontFamily: MONO,
            fontSize: 11,
            backgroundColor: mode === "dark" ? t.surface.highest : "#09090B",
            color: mode === "dark" ? t.text.primary : "#FAFAFA",
          },
        },
      },
      MuiLinearProgress: {
        styleOverrides: {
          root: { backgroundColor: alpha(t.text.primary, 0.08) },
        },
      },
    },
  });
};
