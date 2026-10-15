import type { ReactNode } from "react";
import { Box, keyframes, type SxProps, type Theme } from "@mui/material";
import { alpha } from "@mui/material/styles";
import { MONO } from "../theme";

export type Tone = "positive" | "negative" | "warning" | "accent" | "neutral";

export const toneColor = (theme: Theme, tone: Tone) => {
  const { state, accent, text, surface } = theme.palette;
  switch (tone) {
    case "positive":
      return { fg: state.positive, bg: alpha(state.positive, 0.14), border: alpha(state.positive, 0.3) };
    case "negative":
      return { fg: state.negative, bg: alpha(state.negative, 0.14), border: alpha(state.negative, 0.3) };
    case "warning":
      return { fg: state.warning, bg: alpha(state.warning, 0.14), border: alpha(state.warning, 0.3) };
    case "accent":
      return { fg: accent.primary, bg: alpha(theme.palette.primary.main, 0.14), border: alpha(theme.palette.primary.main, 0.3) };
    default:
      return { fg: text.secondary, bg: surface.container, border: surface.border };
  }
};

const pulse = keyframes`
  50% { opacity: 0.35; }
`;

export const Dot = ({ tone = "positive", animate = false }: { tone?: Tone; animate?: boolean }) => (
  <Box
    component="span"
    sx={(t) => ({
      width: 6,
      height: 6,
      borderRadius: "50%",
      flexShrink: 0,
      bgcolor: toneColor(t, tone).fg,
      ...(animate && {
        animation: `${pulse} 2s ease-in-out infinite`,
        "@media (prefers-reduced-motion: reduce)": { animation: "none" },
      }),
    })}
  />
);

// Uppercase monospace caption ("label-micro" in the design system)
export const Micro = ({ children, sx }: { children: ReactNode; sx?: SxProps<Theme> }) => (
  <Box
    component="span"
    sx={[
      {
        fontFamily: MONO,
        fontSize: 10,
        fontWeight: 600,
        lineHeight: "12px",
        letterSpacing: "0.08em",
        textTransform: "uppercase",
      },
      ...(Array.isArray(sx) ? sx : [sx]),
    ]}
  >
    {children}
  </Box>
);

// Monospace metadata text ("label-code")
export const Mono = ({ children, sx }: { children: ReactNode; sx?: SxProps<Theme> }) => (
  <Box
    component="span"
    sx={[
      { fontFamily: MONO, fontSize: 11, fontWeight: 500, letterSpacing: "0.02em" },
      ...(Array.isArray(sx) ? sx : [sx]),
    ]}
  >
    {children}
  </Box>
);

export const FileTag = ({ children }: { children: ReactNode }) => (
  <Box
    component="code"
    sx={{
      fontFamily: MONO,
      fontSize: 11,
      px: 0.75,
      py: 0.25,
      borderRadius: "4px",
      bgcolor: "surface.high",
      color: "accent.primary",
      whiteSpace: "nowrap",
    }}
  >
    {children}
  </Box>
);

export const Pill = ({
  tone,
  children,
  icon,
  sx,
}: {
  tone: Tone;
  children: ReactNode;
  icon?: ReactNode;
  sx?: SxProps<Theme>;
}) => (
  <Box
    component="span"
    sx={[
      (t) => {
        const c = toneColor(t, tone);
        return {
          display: "inline-flex",
          alignItems: "center",
          gap: 0.75,
          px: 1.25,
          py: 0.375,
          borderRadius: 999,
          bgcolor: c.bg,
          color: c.fg,
          border: `1px solid ${c.border}`,
          fontFamily: MONO,
          fontSize: 10,
          fontWeight: 700,
          lineHeight: "14px",
          letterSpacing: "0.04em",
          whiteSpace: "nowrap",
          "& svg": { fontSize: 14 },
        };
      },
      ...(Array.isArray(sx) ? sx : [sx]),
    ]}
  >
    {icon}
    {children}
  </Box>
);

export const Panel = ({
  children,
  sx,
  id,
  component = "div",
}: {
  children: ReactNode;
  sx?: SxProps<Theme>;
  id?: string;
  component?: React.ElementType;
}) => (
  <Box
    id={id}
    component={component}
    sx={[
      (t) => ({
        borderRadius: "12px",
        bgcolor: "surface.card",
        border: `1px solid ${t.palette.surface.border}`,
        boxShadow: t.palette.mode === "dark" ? "0 4px 16px -6px rgba(0,0,0,0.5)" : "0 2px 10px -4px rgba(15,23,42,0.08)",
      }),
      ...(Array.isArray(sx) ? sx : [sx]),
    ]}
  >
    {children}
  </Box>
);

// Shared button looks. Never arrays, so they can be combined in an sx array.
type SxStyle = Exclude<SxProps<Theme>, ReadonlyArray<unknown>>;

export const ghostButtonSx: SxStyle = {
  bgcolor: "surface.high",
  color: "text.primary",
  px: 1.5,
  "&:hover": { bgcolor: "surface.highest" },
  "&.Mui-disabled": { color: "text.muted" },
};

export const gradientButtonSx: SxStyle = {
  background: "linear-gradient(135deg, #8B5CF6, #EC4899)",
  color: "#fff",
  px: 3,
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.3)",
  "&:hover": {
    background: "linear-gradient(135deg, #8B5CF6, #EC4899)",
    filter: "brightness(1.1)",
    boxShadow: `inset 0 1px 0 rgba(255,255,255,0.3), 0 0 20px ${alpha("#8B5CF6", 0.4)}`,
  },
};
