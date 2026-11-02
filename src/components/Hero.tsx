import type { ReactNode } from "react";
import { Box, Typography } from "@mui/material";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import NoAccountsOutlinedIcon from "@mui/icons-material/NoAccountsOutlined";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import PersonAddAltOutlinedIcon from "@mui/icons-material/PersonAddAltOutlined";
import GroupOutlinedIcon from "@mui/icons-material/GroupOutlined";
import PersonRemoveOutlinedIcon from "@mui/icons-material/PersonRemoveOutlined";
import OutgoingMailIcon from "@mui/icons-material/OutgoingMail";
import VerifiedOutlinedIcon from "@mui/icons-material/VerifiedOutlined";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import { Badge, FileTag, IconTile, Micro, Panel, toneColor, type Tone } from "./ui";
import type { AnalysisResult } from "../types";

// The three privacy promises shown above the hero and the archive card
export const PrivacyBadges = () => (
  <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
    <Badge tone="positive" icon={<LockOutlinedIcon />}>
      100% private — processed locally
    </Badge>
    <Badge icon={<NoAccountsOutlinedIcon />}>No password needed</Badge>
    <Badge icon={<CheckCircleOutlineIcon />}>Data stays on device</Badge>
  </Box>
);

// Intro card shown before an export has been analyzed
export const HeroShell = ({ children, id }: { children: ReactNode; id?: string }) => (
  <Panel
    id={id}
    component="section"
    sx={{
      position: "relative",
      overflow: "hidden",
      p: { xs: 2.5, md: 4 },
      bgcolor: "surface.low",
      scrollMarginTop: 128,
    }}
  >
    <Box
      aria-hidden
      sx={(t) => ({
        display: t.palette.mode === "dark" ? "block" : "none",
        position: "absolute",
        right: -80,
        top: -80,
        width: 288,
        height: 288,
        borderRadius: "50%",
        bgcolor: "rgba(0, 112, 243, 0.1)",
        filter: "blur(64px)",
        pointerEvents: "none",
      })}
    />
    <Box sx={{ position: "relative", display: "flex", flexDirection: "column", gap: 2 }}>{children}</Box>
  </Panel>
);

interface HeroIntroProps {
  title: string;
  children: ReactNode;
}

export const HeroIntro = ({ title, children }: HeroIntroProps) => (
  <Box sx={{ maxWidth: 760, display: "flex", flexDirection: "column", gap: 1.5 }}>
    <PrivacyBadges />
    <Typography
      variant="h1"
      sx={{
        fontSize: { xs: 32, md: 48 },
        lineHeight: { xs: "36px", md: "52px" },
        letterSpacing: { xs: "-0.03em", md: "-0.04em" },
        color: "text.primary",
      }}
    >
      {title}
    </Typography>
    <Typography sx={{ fontSize: 16, lineHeight: "24px", color: "text.secondary" }}>{children}</Typography>
  </Box>
);

export const IntroCopy = () => (
  <>
    Analyses <FileTag>followers</FileTag> and <FileTag>following</FileTag> from your official Meta export. Your
    file is processed in your browser and never uploaded.
  </>
);

interface StatCardProps {
  label: ReactNode;
  icon: ReactNode;
  iconTone?: Tone;
  value: string;
  valueTone?: Tone;
  footer: ReactNode;
}

const StatCard = ({ label, icon, iconTone, value, valueTone, footer }: StatCardProps) => (
  <Panel
    sx={{
      p: 2.5,
      display: "flex",
      flexDirection: "column",
      justifyContent: "space-between",
      gap: 2,
      transition: "background-color .2s",
      "&:hover": { bgcolor: "surface.low" },
    }}
  >
    <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 1 }}>
      <Box sx={{ minWidth: 0 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, color: "text.muted" }}>{label}</Box>
        <Typography
          sx={{
            mt: 0.5,
            fontSize: 32,
            fontWeight: 600,
            lineHeight: "38px",
            letterSpacing: "-0.03em",
            color: valueTone ? (t) => toneColor(t, valueTone).fg : "text.primary",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {value}
        </Typography>
      </Box>
      <IconTile tone={iconTone}>{icon}</IconTile>
    </Box>
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 1,
        flexWrap: "wrap",
        fontSize: 12,
        lineHeight: "16px",
        color: "text.secondary",
      }}
    >
      {footer}
    </Box>
  </Panel>
);

const CountChip = ({ tone, children }: { tone: Tone; children: ReactNode }) => (
  <Box
    component="span"
    sx={(t) => ({
      px: 0.75,
      py: 0.125,
      borderRadius: "6px",
      fontSize: 12,
      fontWeight: 500,
      bgcolor: toneColor(t, tone).bg,
      color: toneColor(t, tone).fg,
    })}
  >
    {children}
  </Box>
);

const fmt = (n: number) => n.toLocaleString();

export const StatCards = ({ result }: { result: AnalysisResult }) => {
  const activity = result.recent_activity;
  const accepted = activity?.follow_requests.filter((r) => r.status === "accepted").length ?? 0;
  const notAccepted = activity?.follow_requests.filter((r) => r.status === "not_accepted").length ?? 0;
  const pending = activity?.pending_requests.length ?? 0;
  const mutual = Math.max(result.total_following - result.count, 0);
  const share = result.total_following > 0 ? (result.count / result.total_following) * 100 : 0;

  return (
    <Box id="overview" sx={{ display: "flex", flexDirection: "column", gap: 2, scrollMarginTop: 128 }}>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", lg: "repeat(4, 1fr)" },
          gap: 2,
        }}
      >
        <StatCard
          label={<Micro>Following</Micro>}
          icon={<PersonAddAltOutlinedIcon />}
          iconTone="accent"
          value={fmt(result.total_following)}
          footer={
            <>
              <span>People you follow</span>
              <Box component="span" sx={{ color: "text.muted" }}>
                Your account
              </Box>
            </>
          }
        />
        <StatCard
          label={<Micro>Followers</Micro>}
          icon={<GroupOutlinedIcon />}
          iconTone="positive"
          value={fmt(result.total_followers)}
          footer={
            <>
              <span>People following you</span>
              <Box component="span" sx={{ display: "inline-flex", alignItems: "center", gap: 0.5, color: "state.positive" }}>
                <VerifiedOutlinedIcon sx={{ fontSize: 14 }} />
                {fmt(mutual)} mutual
              </Box>
            </>
          }
        />
        <StatCard
          label={
            <>
              <Micro>Don't follow back</Micro>
              <CountChip tone="negative">{fmt(result.count)}</CountChip>
            </>
          }
          icon={<PersonRemoveOutlinedIcon />}
          iconTone="negative"
          value={fmt(result.count)}
          valueTone="negative"
          footer={
            <>
              <Box component="span" sx={{ color: "state.negative" }}>
                Not following you back
              </Box>
              <span>{share.toFixed(1)}% of following</span>
            </>
          }
        />
        <StatCard
          label={<Micro>Recent requests</Micro>}
          icon={<OutgoingMailIcon />}
          iconTone="warning"
          value={activity ? fmt(accepted + notAccepted + pending) : "—"}
          footer={
            activity ? (
              <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 1 }}>
                <Box component="span" sx={{ color: "state.positive", fontWeight: 500 }}>
                  {accepted} accepted
                </Box>
                <span aria-hidden>•</span>
                <Box component="span" sx={{ color: "state.warning", fontWeight: 500 }}>
                  {pending} pending
                </Box>
                <span aria-hidden>•</span>
                <Box component="span" sx={{ color: "state.negative", fontWeight: 500 }}>
                  {notAccepted} not accepted
                </Box>
              </Box>
            ) : (
              <Box component="span" sx={{ color: "text.muted" }}>
                Upload a new export to see
              </Box>
            )
          }
        />
      </Box>
      <Panel
        sx={{
          px: 2.5,
          py: 2,
          display: "flex",
          alignItems: "flex-start",
          gap: 1.5,
          bgcolor: "surface.low",
        }}
      >
        <InfoOutlinedIcon sx={{ fontSize: 18, mt: "1px", color: "state.warning" }} />
        <Box>
          <Typography sx={{ fontSize: 13, fontWeight: 600 }}>Deactivated accounts are counted</Typography>
          <Typography sx={{ fontSize: 12, lineHeight: "18px", color: "text.secondary" }}>
            Following, follower and don't-follow-back counts may be higher than what the Instagram app shows,
            because the export also includes deactivated accounts.
          </Typography>
        </Box>
      </Panel>
    </Box>
  );
};
