import type { ReactNode } from "react";
import { Box, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import ShieldOutlinedIcon from "@mui/icons-material/ShieldOutlined";
import PersonAddAltOutlinedIcon from "@mui/icons-material/PersonAddAltOutlined";
import GroupOutlinedIcon from "@mui/icons-material/GroupOutlined";
import PersonOffOutlinedIcon from "@mui/icons-material/PersonOffOutlined";
import ScheduleSendOutlinedIcon from "@mui/icons-material/ScheduleSendOutlined";
import SyncAltIcon from "@mui/icons-material/SyncAlt";
import EventAvailableOutlinedIcon from "@mui/icons-material/EventAvailableOutlined";
import MemoryIcon from "@mui/icons-material/Memory";
import { Dot, FileTag, Micro, Mono, toneColor, type Tone } from "./ui";
import type { AnalysisResult } from "../types";

const CACHE_TTL_DAYS = 30;

// Gradient hero card with soft background glows
export const HeroShell = ({
  children,
  id,
}: {
  children: ReactNode;
  id?: string;
}) => (
  <Box
    id={id}
    component="section"
    sx={(t) => ({
      position: "relative",
      overflow: "hidden",
      borderRadius: "12px",
      p: { xs: 2.5, md: 5 },
      border: `1px solid ${t.palette.surface.border}`,
      background: `linear-gradient(135deg, ${t.palette.surface.card}, ${t.palette.surface.low} 50%, ${t.palette.surface.base})`,
      boxShadow:
        t.palette.mode === "dark"
          ? "0 20px 40px -16px rgba(0,0,0,0.6)"
          : "0 8px 24px -12px rgba(15,23,42,0.12)",
      scrollMarginTop: 88,
    })}
  >
    <Box
      aria-hidden
      sx={(t) => ({
        position: "absolute",
        right: -96,
        top: -96,
        width: 384,
        height: 384,
        borderRadius: "50%",
        bgcolor: alpha(t.palette.primary.main, 0.12),
        filter: "blur(64px)",
        pointerEvents: "none",
      })}
    />
    <Box
      aria-hidden
      sx={(t) => ({
        position: "absolute",
        left: -80,
        bottom: -80,
        width: 320,
        height: 320,
        borderRadius: "50%",
        bgcolor: alpha(t.palette.secondary.main, 0.12),
        filter: "blur(64px)",
        pointerEvents: "none",
      })}
    />
    <Box
      sx={{
        position: "relative",
        display: "flex",
        flexDirection: "column",
        gap: 3,
      }}
    >
      {children}
    </Box>
  </Box>
);

interface HeroIntroProps {
  title: string;
  children: ReactNode;
  aside?: ReactNode;
}

export const HeroIntro = ({ title, children, aside }: HeroIntroProps) => (
  <Box
    sx={{
      display: "flex",
      flexDirection: { xs: "column", lg: "row" },
      alignItems: { lg: "center" },
      justifyContent: "space-between",
      gap: 2,
    }}
  >
    <Box
      sx={{
        maxWidth: 720,
        display: "flex",
        flexDirection: "column",
        gap: 1.25,
      }}
    >
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
        <Box
          sx={(t) => ({
            display: "inline-flex",
            alignItems: "center",
            gap: 0.75,
            px: 1.25,
            py: 0.5,
            borderRadius: 999,
            bgcolor: alpha(t.palette.primary.main, 0.12),
            color: "accent.primary",
          })}
        >
          <Dot tone="accent" animate />
          <Micro>In-memory diff</Micro>
        </Box>
        <Box
          sx={{
            display: "inline-flex",
            alignItems: "center",
            gap: 0.5,
            px: 1.25,
            py: 0.5,
            borderRadius: 999,
            bgcolor: "surface.container",
            color: "text.secondary",
          }}
        >
          <ShieldOutlinedIcon sx={{ fontSize: 14, color: "state.positive" }} />
          <Mono sx={{ fontSize: 10 }}>No Instagram password • No scraping</Mono>
        </Box>
      </Box>
      <Typography
        variant="h1"
        sx={{
          fontSize: { xs: 30, md: 40 },
          lineHeight: { xs: "38px", md: "48px" },
          color: "text.primary",
        }}
      >
        {title}
      </Typography>
      <Typography
        sx={{ fontSize: 14, lineHeight: 1.7, color: "text.secondary" }}
      >
        {children}
      </Typography>
    </Box>
    {aside}
  </Box>
);

export const IntroCopy = () => (
  <>
    Analyses <FileTag>followers</FileTag> and <FileTag>following</FileTag> from
    your official Meta export. Your file is processed in memory and never
    stored.
  </>
);

// Shown when the result was loaded from the Redis cache
export const CacheCapsule = ({ cachedAt }: { cachedAt: number }) => {
  const ageDays = Math.floor((Date.now() / 1000 - cachedAt) / 86400);
  const remaining = Math.max(CACHE_TTL_DAYS - ageDays, 0);

  return (
    <Box
      sx={(t) => ({
        flexShrink: 0,
        alignSelf: { xs: "flex-start", lg: "center" },
        display: "flex",
        alignItems: "center",
        gap: 1,
        p: 1,
        pr: 1.5,
        borderRadius: "12px",
        bgcolor: alpha(t.palette.surface.glass, 0.8),
        border: `1px solid ${t.palette.surface.border}`,
        backdropFilter: "blur(12px)",
      })}
    >
      <Box
        sx={(t) => ({
          width: 36,
          height: 36,
          borderRadius: "8px",
          display: "grid",
          placeItems: "center",
          bgcolor: alpha(t.palette.state.positive, 0.15),
          color: "state.positive",
        })}
      >
        <MemoryIcon sx={{ fontSize: 20 }} />
      </Box>
      <Box sx={{ display: "flex", flexDirection: "column" }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
          <Typography sx={{ fontSize: 12, fontWeight: 600 }}>
            Saved result
          </Typography>
          <Dot />
        </Box>
        <Mono sx={{ fontSize: 10, color: "text.muted" }}>
          Expires in {remaining} {remaining === 1 ? "day" : "days"} • SHA-256
          key
        </Mono>
      </Box>
    </Box>
  );
};

interface StatCardProps {
  label: string;
  icon: ReactNode;
  value: string;
  unit: string;
  footer: ReactNode;
  highlight?: Tone;
}

const StatCard = ({
  label,
  icon,
  value,
  unit,
  footer,
  highlight,
}: StatCardProps) => (
  <Box
    sx={(t) => ({
      position: "relative",
      p: 2,
      borderRadius: "12px",
      bgcolor: alpha(t.palette.surface.card, 0.9),
      border: `1px solid ${t.palette.surface.border}`,
      transition: "background-color .2s",
      "&:hover": { bgcolor: t.palette.surface.glass },
      ...(highlight && {
        borderTop: `2px solid ${toneColor(t, highlight).fg}`,
      }),
    })}
  >
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        pb: 0.5,
        color: highlight ? (t) => toneColor(t, highlight).fg : "text.secondary",
      }}
    >
      <Micro>{label}</Micro>
      {icon}
    </Box>
    <Box sx={{ display: "flex", alignItems: "baseline", gap: 0.75, pt: 0.5 }}>
      <Typography
        sx={{
          fontSize: 28,
          fontWeight: 800,
          lineHeight: "32px",
          letterSpacing: "-0.02em",
          color: highlight ? (t) => toneColor(t, highlight).fg : "text.primary",
        }}
      >
        {value}
      </Typography>
      <Typography sx={{ fontSize: 12, color: "text.muted" }}>{unit}</Typography>
    </Box>
    <Box
      sx={{
        mt: 1.25,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 1,
        flexWrap: "wrap",
        color: "text.secondary",
      }}
    >
      {footer}
    </Box>
  </Box>
);

const MiniChip = ({ tone, children }: { tone: Tone; children: ReactNode }) => (
  <Mono
    sx={(t) => ({
      px: 0.75,
      py: 0.25,
      borderRadius: "4px",
      fontSize: 10,
      fontWeight: 700,
      bgcolor: toneColor(t, tone).bg,
      color: toneColor(t, tone).fg,
    })}
  >
    {children}
  </Mono>
);

const fmt = (n: number) => n.toLocaleString();

interface StatCardsProps {
  result: AnalysisResult;
  analyzedAt: Date;
}

export const StatCards = ({ result, analyzedAt }: StatCardsProps) => {
  const activity = result.recent_activity;
  const accepted =
    activity?.follow_requests.filter((r) => r.status === "accepted").length ??
    0;
  const notAccepted =
    activity?.follow_requests.filter((r) => r.status === "not_accepted")
      .length ?? 0;
  const pending = activity?.pending_requests.length ?? 0;
  const mutual = Math.max(result.total_following - result.count, 0);
  const share =
    result.total_following > 0
      ? (result.count / result.total_following) * 100
      : 0;

  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: {
          xs: "1fr",
          sm: "repeat(2, 1fr)",
          lg: "repeat(4, 1fr)",
        },
        gap: 2,
      }}
    >
      <StatCard
        label="Total following"
        icon={
          <PersonAddAltOutlinedIcon
            sx={{ fontSize: 20, color: "accent.primary" }}
          />
        }
        value={fmt(result.total_following)}
        unit="accounts"
        footer={
          <>
            <Mono
              sx={{
                display: "inline-flex",
                alignItems: "center",
                gap: 0.5,
                fontSize: 10,
              }}
            >
              <EventAvailableOutlinedIcon
                sx={{ fontSize: 13, color: "state.positive" }}
              />
              {analyzedAt.toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </Mono>
            <Mono sx={{ fontSize: 10, color: "text.muted" }}>
              following.json
            </Mono>
          </>
        }
      />
      <StatCard
        label="Total followers"
        icon={
          <GroupOutlinedIcon sx={{ fontSize: 20, color: "accent.tertiary" }} />
        }
        value={fmt(result.total_followers)}
        unit="accounts"
        footer={
          <>
            <Mono
              sx={{
                display: "inline-flex",
                alignItems: "center",
                gap: 0.5,
                fontSize: 10,
                color: "accent.tertiary",
              }}
            >
              <SyncAltIcon sx={{ fontSize: 13 }} />
              {fmt(mutual)} mutual
            </Mono>
            <Mono sx={{ fontSize: 10, color: "text.muted" }}>
              followers_*.json
            </Mono>
          </>
        }
      />
      <StatCard
        label="Don't follow back"
        icon={<PersonOffOutlinedIcon sx={{ fontSize: 20 }} />}
        value={fmt(result.count)}
        unit="accounts"
        highlight="negative"
        footer={
          <Mono sx={{ fontSize: 10 }}>
            {share.toFixed(1)}% of the accounts you follow
          </Mono>
        }
      />
      <StatCard
        label="Recent requests"
        icon={
          <ScheduleSendOutlinedIcon
            sx={{ fontSize: 20, color: "state.warning" }}
          />
        }
        value={activity ? fmt(accepted + notAccepted + pending) : "—"}
        unit="sent, last ~90 days"
        footer={
          activity ? (
            <Box sx={{ display: "flex", gap: 0.75, flexWrap: "wrap" }}>
              <MiniChip tone="positive">{accepted} acc</MiniChip>
              <MiniChip tone="warning">{pending} pnd</MiniChip>
              <MiniChip tone="negative">{notAccepted} not acc</MiniChip>
            </Box>
          ) : (
            <Mono sx={{ fontSize: 10, color: "text.muted" }}>
              Re-upload to see
            </Mono>
          )
        }
      />
    </Box>
  );
};
