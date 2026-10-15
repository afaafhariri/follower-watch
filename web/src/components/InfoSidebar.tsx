import type { ReactNode } from "react";
import { Box, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import AccountTreeOutlinedIcon from "@mui/icons-material/AccountTreeOutlined";
import SouthIcon from "@mui/icons-material/South";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import PersonOffOutlinedIcon from "@mui/icons-material/PersonOffOutlined";
import HistoryToggleOffIcon from "@mui/icons-material/HistoryToggleOff";
import CancelOutlinedIcon from "@mui/icons-material/CancelOutlined";
import { FileTag, Mono, Panel, toneColor, type Tone } from "./ui";

const STEPS: { title: string; body: ReactNode; tone: Tone }[] = [
  {
    title: "ZIP upload",
    body: "Your export goes straight to the Go backend and is read in memory. It's never written to disk.",
    tone: "accent",
  },
  {
    title: "In-memory JSON parse",
    body: (
      <>
        Reads <FileTag>followers</FileTag> and <FileTag>following</FileTag>,
        plus the recent request and unfollow lists when they're included.
      </>
    ),
    tone: "accent",
  },
  {
    title: "Set difference",
    body: (
      <>
        <Mono sx={{ color: "text.primary" }}>following \ followers</Mono> gives
        every account that doesn't follow you back.
      </>
    ),
    tone: "accent",
  },
  {
    title: "Redis result cache",
    body: "Only the result is saved, keyed by a SHA-256 hash of your email, and expires after 30 days. Clear it any time.",
    tone: "positive",
  },
];

const CAVEATS: {
  title: string;
  body: ReactNode;
  tone: Tone;
  icon: ReactNode;
}[] = [
  {
    title: "Missing profiles",
    body: (
      <>
        If a profile says <em>"Sorry, this page isn't available"</em>, the
        account was most likely deactivated or deleted. It can also mean they
        changed their username or blocked you.
      </>
    ),
    tone: "warning",
    icon: <PersonOffOutlinedIcon sx={{ fontSize: 18 }} />,
  },
  {
    title: "~90-day window",
    body: "Recent requests and Unfollowed by you only cover roughly the last 90 days, whatever date range you export.",
    tone: "neutral",
    icon: <HistoryToggleOffIcon sx={{ fontSize: 18 }} />,
  },
  {
    title: "JSON only",
    body: "HTML exports can't be analyzed. Request the export again with Format set to JSON.",
    tone: "negative",
    icon: <CancelOutlinedIcon sx={{ fontSize: 18 }} />,
  },
];

const CardTitle = ({
  icon,
  children,
}: {
  icon: ReactNode;
  children: ReactNode;
}) => (
  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
    {icon}
    <Typography variant="h3" component="h2">
      {children}
    </Typography>
  </Box>
);

export const InfoSidebar = () => (
  <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
    <Panel
      id="how-it-works"
      sx={{
        p: 2,
        display: "flex",
        flexDirection: "column",
        gap: 2,
        scrollMarginTop: 88,
      }}
    >
      <CardTitle
        icon={
          <AccountTreeOutlinedIcon
            sx={{ fontSize: 20, color: "accent.primary" }}
          />
        }
      >
        How it works
      </CardTitle>
      <Box component="ol" sx={{ listStyle: "none", m: 0, p: 0 }}>
        {STEPS.map((step, i) => (
          <Box component="li" key={step.title}>
            {i > 0 && (
              <Box
                aria-hidden
                sx={{ display: "flex", justifyContent: "center", my: 0.25 }}
              >
                <SouthIcon sx={{ fontSize: 16, color: "text.muted" }} />
              </Box>
            )}
            <Box
              sx={{
                p: 1.25,
                borderRadius: "8px",
                bgcolor: "surface.low",
                display: "flex",
                gap: 1.25,
              }}
            >
              <Mono
                sx={(t) => ({
                  width: 24,
                  height: 24,
                  mt: 0.25,
                  flexShrink: 0,
                  borderRadius: "50%",
                  display: "grid",
                  placeItems: "center",
                  fontSize: 10,
                  fontWeight: 700,
                  bgcolor: toneColor(t, step.tone).bg,
                  color: toneColor(t, step.tone).fg,
                })}
              >
                {i + 1}
              </Mono>
              <Box>
                <Typography sx={{ fontSize: 13, fontWeight: 600 }}>
                  {step.title}
                </Typography>
                <Typography
                  sx={{
                    fontSize: 12,
                    lineHeight: "18px",
                    color: "text.secondary",
                  }}
                >
                  {step.body}
                </Typography>
              </Box>
            </Box>
          </Box>
        ))}
      </Box>
    </Panel>

    <Panel sx={{ p: 2, display: "flex", flexDirection: "column", gap: 2 }}>
      <CardTitle
        icon={
          <InfoOutlinedIcon sx={{ fontSize: 20, color: "state.warning" }} />
        }
      >
        Export caveats &amp; tips
      </CardTitle>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
        {CAVEATS.map((c) => (
          <Box
            key={c.title}
            sx={(t) => ({
              p: 1.25,
              borderRadius: "8px",
              display: "flex",
              gap: 1,
              bgcolor:
                c.tone === "warning"
                  ? alpha(t.palette.state.warning, 0.1)
                  : t.palette.surface.low,
            })}
          >
            <Box
              sx={(t) => ({
                color:
                  c.tone === "neutral"
                    ? t.palette.text.muted
                    : toneColor(t, c.tone).fg,
                mt: 0.25,
              })}
            >
              {c.icon}
            </Box>
            <Typography
              sx={{ fontSize: 12, lineHeight: "18px", color: "text.secondary" }}
            >
              <Box component="strong" sx={{ color: "text.primary" }}>
                {c.title}:
              </Box>{" "}
              {c.body}
            </Typography>
          </Box>
        ))}
      </Box>
    </Panel>
  </Box>
);
