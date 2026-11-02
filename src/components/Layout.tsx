import type { ReactNode } from "react";
import {
  Avatar,
  Box,
  ButtonBase,
  IconButton,
  Link,
  Tooltip,
  Typography,
  type PaletteMode,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import AnalyticsOutlinedIcon from "@mui/icons-material/AnalyticsOutlined";
import ShieldOutlinedIcon from "@mui/icons-material/ShieldOutlined";
import CodeIcon from "@mui/icons-material/Code";
import DarkModeOutlinedIcon from "@mui/icons-material/DarkModeOutlined";
import LightModeOutlinedIcon from "@mui/icons-material/LightModeOutlined";
import { Dot, Micro } from "./ui";

const AUTHOR_GITHUB = "https://github.com/afaafhariri";
const REPO_URL = `${AUTHOR_GITHUB}/follower-watch`;

export interface NavItem {
  label: string;
  active?: boolean;
  onClick: () => void;
}

interface LayoutProps {
  children: ReactNode;
  nav?: NavItem[];
  themeMode: PaletteMode;
  onToggleTheme: () => void;
}

const footerLinkSx = {
  display: "inline-flex",
  alignItems: "center",
  gap: 0.5,
  color: "inherit",
  "&:hover": { color: "text.primary" },
} as const;

export const Layout = ({ children, nav, themeMode, onToggleTheme }: LayoutProps) => {
  const toggleLabel = themeMode === "dark" ? "Switch to light theme" : "Switch to dark theme";

  return (
    <Box sx={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <Box
        component="header"
        sx={(t) => ({
          position: "sticky",
          top: 0,
          zIndex: t.zIndex.appBar,
          bgcolor: alpha(t.palette.surface.base, 0.8),
          backdropFilter: "blur(24px)",
          boxShadow: t.palette.mode === "dark" ? "0 1px 0 rgba(255,255,255,0.05)" : "0 1px 8px rgba(0,0,0,0.04)",
        })}
      >
        <Box sx={{ px: { xs: 2, md: 3 } }}>
          <Box
            sx={{
              height: 64,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 2,
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, minWidth: 0 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexShrink: 0 }}>
                <Box
                  sx={{
                    width: 28,
                    height: 28,
                    borderRadius: "8px",
                    display: "grid",
                    placeItems: "center",
                    bgcolor: "accent.container",
                    color: "accent.onContainer",
                  }}
                >
                  <AnalyticsOutlinedIcon sx={{ fontSize: 18 }} />
                </Box>
                <Typography sx={{ fontWeight: 500, fontSize: 18, letterSpacing: "-0.015em" }}>
                  FollowerWatch
                </Typography>
              </Box>
              <Box
                sx={{
                  display: { xs: "none", sm: "flex" },
                  alignItems: "center",
                  gap: 0.75,
                  color: "text.muted",
                  fontSize: 12,
                  minWidth: 0,
                }}
              >
                <Box component="span" aria-hidden>
                  /
                </Box>
                <Box
                  sx={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 0.5,
                    px: 1,
                    py: 0.25,
                    borderRadius: "6px",
                    bgcolor: "surface.container",
                    color: "text.primary",
                    fontWeight: 500,
                    whiteSpace: "nowrap",
                  }}
                >
                  <ShieldOutlinedIcon sx={{ fontSize: 15, color: "state.positive" }} />
                  Instagram Auditor
                </Box>
              </Box>
              <Box
                sx={{
                  display: { xs: "none", xl: "inline-flex" },
                  alignItems: "center",
                  gap: 0.75,
                  px: 1,
                  py: 0.5,
                  borderRadius: "6px",
                  bgcolor: "surface.low",
                  color: "state.positive",
                }}
              >
                <Dot />
                <Micro>Safe &amp; Private</Micro>
              </Box>
            </Box>

            <Tooltip title={toggleLabel}>
              <IconButton
                onClick={onToggleTheme}
                aria-label={toggleLabel}
                sx={{
                  width: 32,
                  height: 32,
                  borderRadius: "8px",
                  bgcolor: "surface.low",
                  color: "text.secondary",
                  "&:hover": { bgcolor: "surface.high", color: "text.primary" },
                }}
              >
                {themeMode === "dark" ? (
                  <LightModeOutlinedIcon sx={{ fontSize: 18 }} />
                ) : (
                  <DarkModeOutlinedIcon sx={{ fontSize: 18 }} />
                )}
              </IconButton>
            </Tooltip>
          </Box>

          {nav && nav.length > 0 && (
            <Box sx={{ height: 48, display: "flex", alignItems: "center", minWidth: 0 }}>
              <Box
                component="nav"
                aria-label="Sections"
                sx={{
                  display: "flex",
                  gap: 0.5,
                  p: 0.25,
                  borderRadius: "10px",
                  bgcolor: "surface.lowest",
                  maxWidth: "100%",
                  overflowX: "auto",
                  scrollbarWidth: "none",
                  "&::-webkit-scrollbar": { display: "none" },
                }}
              >
                {nav.map((item) => (
                  <ButtonBase
                    key={item.label}
                    onClick={item.onClick}
                    aria-current={item.active ? "true" : undefined}
                    sx={(t) => ({
                      flexShrink: 0,
                      px: 1.5,
                      py: 0.5,
                      borderRadius: "8px",
                      fontSize: 13,
                      whiteSpace: "nowrap",
                      fontWeight: item.active ? 500 : 400,
                      color: item.active ? "text.primary" : "text.secondary",
                      bgcolor: item.active ? (t.palette.mode === "dark" ? "surface.high" : "surface.card") : "transparent",
                      boxShadow: item.active && t.palette.mode === "light" ? t.shadows[1] : "none",
                      transition: "background-color .15s, color .15s",
                      "&:hover": { color: "text.primary", bgcolor: item.active ? undefined : "surface.container" },
                    })}
                  >
                    {item.label}
                  </ButtonBase>
                ))}
              </Box>
            </Box>
          )}
        </Box>
      </Box>

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flex: 1,
          width: "100%",
          maxWidth: 1400,
          mx: "auto",
          px: { xs: 2, md: 4 },
          py: { xs: 3, md: 4 },
          display: "flex",
          flexDirection: "column",
          gap: 3,
        }}
      >
        {children}
      </Box>

      {/* Footer */}
      <Box
        component="footer"
        sx={(t) => ({
          mt: 4,
          py: 2,
          bgcolor: alpha(t.palette.surface.base, 0.8),
          boxShadow: t.palette.mode === "dark" ? "0 -1px 0 rgba(255,255,255,0.05)" : "0 -1px 8px rgba(0,0,0,0.04)",
        })}
      >
        <Box
          sx={{
            px: { xs: 2, md: 3 },
            display: "flex",
            flexDirection: { xs: "column", md: "row" },
            alignItems: "center",
            justifyContent: "space-between",
            gap: 1.5,
            fontSize: 12,
            color: "text.secondary",
            textAlign: { xs: "center", md: "left" },
          }}
        >
          <Box
            sx={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              justifyContent: { xs: "center", md: "flex-start" },
              gap: 1.5,
            }}
          >
            <Box sx={{ display: "inline-flex", alignItems: "center", gap: 1 }}>
              <Dot />
              <Box component="span" sx={{ color: "text.primary", fontWeight: 500 }}>
                All data analyzed locally
              </Box>
            </Box>
            <Box component="span" aria-hidden sx={{ color: "text.muted" }}>
              •
            </Box>
            <Box component="span" sx={{ color: "text.muted" }}>
              No login required • Not affiliated with Instagram or Meta
            </Box>
          </Box>

          <Box
            sx={{
              display: "flex",
              flexWrap: "wrap",
              justifyContent: "center",
              alignItems: "center",
              gap: { xs: 2, md: 3 },
            }}
          >
            <span>MIT License</span>
            <Link href="/privacy.html" underline="none" sx={footerLinkSx}>
              Privacy
            </Link>
            <Link href={REPO_URL} target="_blank" rel="noopener noreferrer" underline="none" sx={footerLinkSx}>
              <CodeIcon sx={{ fontSize: 16 }} />
              GitHub Repo
            </Link>
            <Link
              href={AUTHOR_GITHUB}
              target="_blank"
              rel="noopener noreferrer"
              underline="none"
              aria-label="Made by Afaaf Hariri, view GitHub profile"
              sx={[footerLinkSx, { gap: 1 }]}
            >
              Made by
              <Avatar src={`${AUTHOR_GITHUB}.png`} alt="Afaaf Hariri" sx={{ width: 22, height: 22 }} />
            </Link>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};
