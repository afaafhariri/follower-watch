import type { ReactNode } from "react";
import { Box, keyframes, type SxProps, type Theme } from "@mui/material";
import { alpha } from "@mui/material/styles";
import { MONO } from "../theme";

export type Tone = "positive" | "negative" | "warning" | "accent" | "neutral";

export const toneColor = (theme: Theme, tone: Tone) => {
  const { state, accent, text, surface, mode } = theme.palette;
  const dark = mode === "dark";
  switch (tone) {
    case "positive":
      return { fg: state.positive, bg: dark ? alpha(state.positive, 0.12) : state.positiveSubtle };
    case "negative":
      return { fg: state.negative, bg: dark ? alpha(state.negative, 0.12) : state.negativeSubtle };
    case "warning":
      return { fg: state.warning, bg: dark ? alpha(state.warning, 0.12) : state.warningSubtle };
    case "accent":
      return { fg: accent.primary, bg: alpha(accent.primary, dark ? 0.12 : 0.08) };
    default:
      return { fg: text.secondary, bg: surface.container };
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

// Small uppercase caption ("label-caps" in the design)
export const Micro = ({ children, sx }: { children: ReactNode; sx?: SxProps<Theme> }) => (
  <Box
    component="span"
    sx={[
      {
        fontSize: 11,
        fontWeight: 500,
        lineHeight: "14px",
        letterSpacing: "0.06em",
        textTransform: "uppercase",
      },
      ...(Array.isArray(sx) ? sx : [sx]),
    ]}
  >
    {children}
  </Box>
);

// Monospace metadata text ("code-sm")
export const Mono = ({ children, sx }: { children: ReactNode; sx?: SxProps<Theme> }) => (
  <Box
    component="span"
    sx={[
      { fontFamily: MONO, fontSize: 11, lineHeight: "14px", fontWeight: 400 },
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
      bgcolor: "surface.container",
      color: "text.primary",
      whiteSpace: "nowrap",
    }}
  >
    {children}
  </Box>
);

// Rounded status chip with a leading dot or icon
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
          py: 0.25,
          borderRadius: 999,
          bgcolor: c.bg,
          color: c.fg,
          fontFamily: MONO,
          fontSize: 11,
          fontWeight: 500,
          lineHeight: "18px",
          whiteSpace: "nowrap",
          "& svg": { fontSize: 13 },
        };
      },
      ...(Array.isArray(sx) ? sx : [sx]),
    ]}
  >
    {icon ?? <Dot tone={tone} />}
    {children}
  </Box>
);

// Uppercase pill used for the privacy badges
export const Badge = ({ tone = "neutral", icon, children }: { tone?: Tone; icon?: ReactNode; children: ReactNode }) => (
  <Box
    component="span"
    sx={(t) => ({
      display: "inline-flex",
      alignItems: "center",
      gap: 0.5,
      px: 1.25,
      py: 0.375,
      borderRadius: 999,
      bgcolor: toneColor(t, tone).bg,
      color: toneColor(t, tone).fg,
      fontSize: 11,
      fontWeight: 500,
      lineHeight: "14px",
      letterSpacing: "0.06em",
      textTransform: "uppercase",
      whiteSpace: "nowrap",
      "& svg": { fontSize: 13 },
    })}
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
        boxShadow: t.shadows[1],
      }),
      ...(Array.isArray(sx) ? sx : [sx]),
    ]}
  >
    {children}
  </Box>
);

// Square tile holding a card's icon
export const IconTile = ({ children, tone = "neutral" }: { children: ReactNode; tone?: Tone }) => (
  <Box
    sx={(t) => ({
      width: 32,
      height: 32,
      flexShrink: 0,
      borderRadius: "8px",
      display: "grid",
      placeItems: "center",
      bgcolor: "surface.container",
      color: tone === "neutral" ? "text.muted" : toneColor(t, tone).fg,
      "& svg": { fontSize: 18 },
    })}
  >
    {children}
  </Box>
);

// Shared button looks. Never arrays, so they can be combined in an sx array.
type SxStyle = Exclude<SxProps<Theme>, ReadonlyArray<unknown>>;

export const ghostButtonSx: SxStyle = (t: Theme) => ({
  bgcolor: "surface.control",
  color: "text.primary",
  px: 1.5,
  boxShadow: t.shadows[1],
  whiteSpace: "nowrap",
  "&:hover": { bgcolor: "surface.controlHover" },
  "&.Mui-disabled": { color: "text.muted" },
  "& .MuiButton-startIcon svg": { fontSize: 16 },
});

export const primaryButtonSx: SxStyle = (t: Theme) => ({
  bgcolor: "accent.container",
  color: "accent.onContainer",
  px: 2,
  whiteSpace: "nowrap",
  boxShadow: t.shadows[1],
  "&:hover": { bgcolor: alpha(t.palette.accent.container, 0.88) },
  "& .MuiButton-startIcon svg": { fontSize: 16 },
});
