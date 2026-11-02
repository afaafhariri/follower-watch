import type { ReactNode } from "react";
import { Box, Typography } from "@mui/material";
import TipsAndUpdatesOutlinedIcon from "@mui/icons-material/TipsAndUpdatesOutlined";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import CheckIcon from "@mui/icons-material/Check";
import PersonOffOutlinedIcon from "@mui/icons-material/PersonOffOutlined";
import HistoryToggleOffIcon from "@mui/icons-material/HistoryToggleOff";
import CancelOutlinedIcon from "@mui/icons-material/CancelOutlined";
import ShieldOutlinedIcon from "@mui/icons-material/ShieldOutlined";
import { FileTag, Micro, Mono, Panel, toneColor, type Tone } from "./ui";
import type { AnalysisResult } from "../types";

const STEPS: ReactNode[] = [
  "Your export is opened right here in your browser. It's never uploaded anywhere.",
  <>
    We read <FileTag>followers</FileTag> and <FileTag>following</FileTag>, plus the recent request and unfollow
    lists when they're included.
  </>,
  <>
    <Mono sx={{ color: "text.primary" }}>following \ followers</Mono> gives every account that doesn't follow you
    back.
  </>,
  "Only the result is kept, in this browser's storage, so it's here next time. Clear it any time.",
];

const TIPS: { title: string; body: ReactNode; tone: Tone; icon: ReactNode }[] = [
  {
    title: "Missing profiles",
    body: (
      <>
        If a profile says <em>"Sorry, this page isn't available"</em>, the account was most likely deactivated or
        deleted. It can also mean they changed their username or blocked you.
      </>
    ),
    tone: "warning",
    icon: <PersonOffOutlinedIcon />,
  },
  {
    title: "~90-day window",
    body: "Recent requests and Unfollowed by you only cover roughly the last 90 days, whatever date range you export.",
    tone: "accent",
    icon: <HistoryToggleOffIcon />,
  },
  {
    title: "JSON only",
    body: "HTML exports can't be analyzed. Request the export again with Format set to JSON.",
    tone: "negative",
    icon: <CancelOutlinedIcon />,
  },
  {
    title: "No password risk",
    body: "You use Instagram's own export, so your account credentials are never shared or at risk.",
    tone: "positive",
    icon: <ShieldOutlinedIcon />,
  },
];

const CardTitle = ({ icon, children }: { icon: ReactNode; children: ReactNode }) => (
  <Box sx={{ display: "flex", alignItems: "center", gap: 1, "& > svg": { fontSize: 20 } }}>
    {icon}
    <Typography variant="h3" component="h2">
      {children}
    </Typography>
  </Box>
);

const FollowRatio = ({ result }: { result: AnalysisResult }) => {
  const mutual = Math.max(result.total_following - result.count, 0);
  const followback = result.total_following > 0 ? (mutual / result.total_following) * 100 : 0;

  return (
    <Panel sx={(t) => ({ p: 2.5, bgcolor: t.palette.mode === "dark" ? "surface.lowest" : "surface.low" })}>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1, mb: 1.5 }}>
        <Micro sx={{ color: "text.muted" }}>Follow ratio</Micro>
        <Typography sx={{ fontSize: 12, fontWeight: 500, color: "state.positive" }}>
          {followback.toFixed(1)}% follow back
        </Typography>
      </Box>
      <Box
        role="img"
        aria-label={`${mutual.toLocaleString()} mutual, ${result.count.toLocaleString()} don't follow back`}
        sx={{ display: "flex", gap: "2px", height: 8, borderRadius: 999, overflow: "hidden", bgcolor: "surface.container" }}
      >
        <Box sx={{ width: `${followback}%`, bgcolor: "state.positive" }} />
        <Box sx={{ flex: 1, bgcolor: result.count > 0 ? "state.negative" : "transparent" }} />
      </Box>
      <Box sx={{ mt: 1.5, display: "flex", justifyContent: "space-between", gap: 1, fontSize: 12, color: "text.secondary" }}>
        <span>{mutual.toLocaleString()} mutual</span>
        <span>{result.count.toLocaleString()} don't follow back</span>
      </Box>
    </Panel>
  );
};

export const InfoSidebar = ({ result }: { result?: AnalysisResult }) => (
  <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
    {result && <FollowRatio result={result} />}

    <Panel id="how-it-works" sx={{ p: 2.5, display: "flex", flexDirection: "column", gap: 1.5, scrollMarginTop: 128 }}>
      <CardTitle icon={<HelpOutlineIcon sx={{ color: "state.positive" }} />}>How it works</CardTitle>
      <Typography sx={{ fontSize: 12, lineHeight: "18px", color: "text.muted" }}>
        Your Instagram export contains two lists: people you follow and people following you.
      </Typography>
      <Box component="ol" sx={{ listStyle: "none", m: 0, p: 0, display: "flex", flexDirection: "column", gap: 1 }}>
        {STEPS.map((step, i) => (
          <Box component="li" key={i} sx={{ display: "flex", alignItems: "flex-start", gap: 1 }}>
            <CheckIcon sx={{ fontSize: 16, mt: "1px", color: "state.positive", flexShrink: 0 }} />
            <Typography sx={{ fontSize: 12, lineHeight: "18px", color: "text.secondary" }}>{step}</Typography>
          </Box>
        ))}
      </Box>
    </Panel>

    <Panel sx={{ p: 2.5, display: "flex", flexDirection: "column", gap: 1.5 }}>
      <CardTitle icon={<TipsAndUpdatesOutlinedIcon sx={{ color: "accent.primary" }} />}>Export caveats &amp; tips</CardTitle>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
        {TIPS.map((tip) => (
          <Box key={tip.title} sx={{ p: 1.5, borderRadius: "8px", bgcolor: "surface.low" }}>
            <Box
              sx={(t) => ({
                display: "flex",
                alignItems: "center",
                gap: 0.75,
                fontSize: 13,
                fontWeight: 500,
                "& svg": { fontSize: 16, color: toneColor(t, tip.tone).fg },
              })}
            >
              {tip.icon}
              {tip.title}
            </Box>
            <Typography sx={{ mt: 0.5, fontSize: 12, lineHeight: "18px", color: "text.secondary" }}>{tip.body}</Typography>
          </Box>
        ))}
      </Box>
    </Panel>
  </Box>
);
