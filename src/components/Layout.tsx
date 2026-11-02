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
import AnalyticsIcon from "@mui/icons-material/Analytics";
import CodeIcon from "@mui/icons-material/Code";
import DarkModeOutlinedIcon from "@mui/icons-material/DarkModeOutlined";
import LightModeOutlinedIcon from "@mui/icons-material/LightModeOutlined";
import { BRAND_GRADIENT } from "../theme";
import { Dot, Micro, Mono } from "./ui";

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

export const Layout = ({ children, nav, themeMode, onToggleTheme }: LayoutProps) => {
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
          backdropFilter: "blur(20px)",
          borderBottom: 1,
          borderColor: "divider",
        })}
      >
        <Box
          sx={{
            height: 72,
            px: { xs: 2, md: 3 },
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 2,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 2, flexShrink: 0 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Box
                sx={{
                  width: 32,
                  height: 32,
                  borderRadius: "8px",
                  background: BRAND_GRADIENT,
                  display: "grid",
                  placeItems: "center",
                  color: "#fff",
                }}
              >
                <AnalyticsIcon sx={{ fontSize: 20 }} />
              </Box>
              <Typography sx={{ fontWeight: 700, fontSize: 18, letterSpacing: "-0.01em" }}>
                FollowerWatch
              </Typography>
            </Box>
            <Box
              sx={(t) => ({
                display: { xs: "none", xl: "inline-flex" },
                alignItems: "center",
                gap: 0.75,
                px: 1,
                py: 0.5,
                borderRadius: 999,
                bgcolor: alpha(t.palette.state.positive, 0.12),
                color: "state.positive",
              })}
            >
              <Dot animate />
              <Micro>Privacy-first / On-device</Micro>
            </Box>
          </Box>

          {nav && nav.length > 0 && (
            <Box component="nav" sx={{ display: { xs: "none", lg: "flex" }, gap: 0.5 }}>
              {nav.map((item) => (
                <ButtonBase
                  key={item.label}
                  onClick={item.onClick}
                  sx={{
                    px: 1.25,
                    py: 0.75,
                    borderRadius: "8px",
                    fontSize: 14,
                    fontWeight: item.active ? 600 : 500,
                    color: item.active ? "text.primary" : "text.secondary",
                    bgcolor: item.active ? "surface.high" : "transparent",
                    transition: "background-color .15s, color .15s",
                    "&:hover": { bgcolor: "surface.high", color: "text.primary" },
                  }}
                >
                  {item.label}
                </ButtonBase>
              ))}
            </Box>
          )}

          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flexShrink: 0 }}>
            <Tooltip title={themeMode === "dark" ? "Switch to light theme" : "Switch to dark theme"}>
              <IconButton
                onClick={onToggleTheme}
                aria-label={themeMode === "dark" ? "Switch to light theme" : "Switch to dark theme"}
                sx={{
                  width: 36,
                  height: 36,
                  borderRadius: "8px",
                  bgcolor: "surface.high",
                  color: "text.secondary",
                  "&:hover": { bgcolor: "surface.highest", color: "text.primary" },
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
        </Box>
      </Box>

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flex: 1,
          width: "100%",
          maxWidth: 1440,
          mx: "auto",
          px: { xs: 2, md: 4, lg: 6 },
          py: { xs: 3, md: 4 },
          display: "flex",
          flexDirection: "column",
          gap: { xs: 3, md: 4 },
        }}
      >
        {children}
      </Box>

      {/* Footer */}
      <Box component="footer" sx={{ bgcolor: "surface.lowest", py: 3, mt: 4 }}>
        <Box
          sx={{
            px: { xs: 2, md: 3 },
            display: "flex",
            flexDirection: { xs: "column", md: "row" },
            alignItems: "center",
            justifyContent: "space-between",
            gap: 2,
            textAlign: { xs: "center", md: "left" },
          }}
        >
          <Box
            sx={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              justifyContent: { xs: "center", md: "flex-start" },
              gap: 2,
            }}
          >
            <Box
              sx={{
                display: "inline-flex",
                alignItems: "center",
                gap: 1,
                px: 1.25,
                py: 0.5,
                borderRadius: 999,
                bgcolor: "surface.high",
                color: "text.secondary",
              }}
            >
              <Dot />
              <Mono>Processed in your browser • Never uploaded</Mono>
            </Box>
            <Typography variant="body2" sx={{ color: "text.muted", fontSize: 12 }}>
              Not affiliated with Instagram or Meta.
            </Typography>
          </Box>

          <Box sx={{ display: "flex", alignItems: "center", gap: 3, color: "text.muted", fontSize: 12 }}>
            <span>MIT License</span>
            <Link
              href="/privacy.html"
              underline="none"
              sx={{ color: "inherit", "&:hover": { color: "accent.primary" } }}
            >
              Privacy
            </Link>
            <Link
              href={REPO_URL}
              target="_blank"
              rel="noopener noreferrer"
              underline="none"
              sx={{ display: "inline-flex", alignItems: "center", gap: 0.5, color: "inherit", "&:hover": { color: "accent.primary" } }}
            >
              <CodeIcon sx={{ fontSize: 16 }} />
              GitHub Repo
            </Link>
            <Link
              href={AUTHOR_GITHUB}
              target="_blank"
              rel="noopener noreferrer"
              underline="none"
              aria-label="Made by Afaaf Hariri, view GitHub profile"
              sx={{ display: "inline-flex", alignItems: "center", gap: 1, color: "inherit", "&:hover": { color: "accent.primary" } }}
            >
              Made by
              <Avatar src={`${AUTHOR_GITHUB}.png`} alt="Afaaf Hariri" sx={{ width: 24, height: 24 }} />
            </Link>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};
