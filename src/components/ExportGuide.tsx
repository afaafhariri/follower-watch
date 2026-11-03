import { useRef, useState, type ReactNode } from "react";
import { Box, Button, ButtonBase, IconButton, Link, Typography, useMediaQuery } from "@mui/material";
import { alpha } from "@mui/material/styles";
import PhoneIphoneIcon from "@mui/icons-material/PhoneIphone";
import LaptopIcon from "@mui/icons-material/Laptop";
import MenuBookOutlinedIcon from "@mui/icons-material/MenuBookOutlined";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import ViewListOutlinedIcon from "@mui/icons-material/ViewListOutlined";
import ViewCarouselOutlinedIcon from "@mui/icons-material/ViewCarouselOutlined";
import { Mono, Panel } from "./ui";
import {
  AccountsCenterScreen,
  BrowserFrame,
  ConfirmScreen,
  CreateExportScreen,
  CustomizeScreen,
  DestinationScreen,
  InfoPermissionsScreen,
  PhoneFrame,
  ProfileScreen,
  SettingsScreen,
  WebAccountsCenterScreen,
  WebHomeScreen,
  WebInfoPermissionsScreen,
  WebSettingsScreen,
} from "./ExportMockups";

type Device = "mobile" | "web";

interface ExportGuideProps {
  title?: string;
}

interface Step {
  caption: ReactNode;
  screen: ReactNode;
  // Web only: the address bar, and whether the screen fills the window
  // instead of sitting in the Accounts Center dialog
  url?: string;
  wide?: boolean;
}

const OPEN_EXPORT_STEPS: Record<Device, Step[]> = {
  mobile: [
    {
      caption: <>In the Instagram app, go to your <strong>profile</strong> and tap the <strong>☰ menu</strong> (top right)</>,
      screen: <ProfileScreen />,
    },
    { caption: <>Tap <strong>Accounts Center</strong></>, screen: <SettingsScreen /> },
    { caption: <>Tap <strong>Your information and permissions</strong></>, screen: <AccountsCenterScreen /> },
    { caption: <>Tap <strong>Export your information</strong></>, screen: <InfoPermissionsScreen /> },
  ],
  web: [
    {
      caption: (
        <>
          Sign in at{" "}
          <Link href="https://www.instagram.com" target="_blank" rel="noopener noreferrer" sx={{ color: "accent.primary" }}>
            instagram.com
          </Link>
          , click <strong>More (☰)</strong> at the bottom left, then <strong>Settings</strong>
        </>
      ),
      screen: <WebHomeScreen />,
      url: "instagram.com",
      wide: true,
    },
    { caption: <>Click <strong>Accounts Center</strong></>, screen: <WebSettingsScreen />, url: "instagram.com/accounts/edit", wide: true },
    {
      caption: <>Click <strong>Your information and permissions</strong></>,
      screen: <WebAccountsCenterScreen />,
      url: "accountscenter.instagram.com",
      wide: true,
    },
    {
      caption: <>Click <strong>Export your information</strong></>,
      screen: <WebInfoPermissionsScreen />,
      url: "accountscenter.instagram.com",
      wide: true,
    },
  ],
};

const CONFIGURE_STEPS: Step[] = [
  { caption: <>Choose <strong>Create export</strong></>, screen: <CreateExportScreen /> },
  { caption: <>Select your Instagram profile, then <strong>Export to device</strong></>, screen: <DestinationScreen /> },
  {
    caption: <>Under <strong>Customize information</strong>, clear everything and select only <strong>Followers and following</strong></>,
    screen: <CustomizeScreen />,
  },
  {
    caption: <>Set <strong>Date range</strong> to <strong>All time</strong> and <strong>Format</strong> to <strong>JSON</strong></>,
    screen: <ConfirmScreen focus="format" />,
  },
  {
    caption: <>Select <strong>Start export</strong>. When the email arrives, download the ZIP and select it here</>,
    screen: <ConfirmScreen focus="start" />,
  },
];

const DEVICES: { key: Device; label: string; icon: React.ReactNode }[] = [
  { key: "mobile", label: "Mobile app", icon: <PhoneIphoneIcon sx={{ fontSize: 16 }} /> },
  { key: "web", label: "Web", icon: <LaptopIcon sx={{ fontSize: 16 }} /> },
];

// Tall enough for the device frame, so slides don't change height
const STAGE_HEIGHT: Record<Device, number> = { mobile: 436, web: 332 };

const StepNumber = ({ n }: { n: number }) => (
  <Mono
    sx={(t) => ({
      width: 22,
      height: 22,
      flexShrink: 0,
      borderRadius: "50%",
      display: "grid",
      placeItems: "center",
      fontSize: 10,
      fontWeight: 600,
      bgcolor: t.palette.surface.container,
      color: "text.primary",
    })}
  >
    {n}
  </Mono>
);

const captionSx = { fontSize: 13, lineHeight: "22px", color: "text.secondary", "& strong": { color: "text.primary" } };

const navButtonSx = {
  width: 32,
  height: 32,
  bgcolor: "surface.control",
  color: "text.primary",
  boxShadow: 1,
  "&:hover": { bgcolor: "surface.controlHover" },
  "&.Mui-disabled": { bgcolor: "surface.control", color: "text.muted", opacity: 0.6 },
};

const StepList = ({ steps }: { steps: Step[] }) => (
  <Box component="ol" sx={{ listStyle: "none", m: 0, p: 0, display: "flex", flexDirection: "column", gap: 1 }}>
    {steps.map((step, i) => (
      <Box component="li" key={i} sx={{ display: "flex", gap: 1.25, alignItems: "flex-start" }}>
        <StepNumber n={i + 1} />
        <Typography sx={captionSx}>{step.caption}</Typography>
      </Box>
    ))}
  </Box>
);

const StepCarousel = ({ steps, device, footer }: { steps: Step[]; device: Device; footer: ReactNode }) => {
  const trackRef = useRef<HTMLDivElement>(null);
  // Slide a button scrolled to; scroll events are ignored until it gets there
  // so the caption doesn't flick through the slides in between
  const pendingRef = useRef<number | null>(null);
  const [index, setIndex] = useState(0);
  const reduceMotion = useMediaQuery("(prefers-reduced-motion: reduce)");

  const goTo = (i: number) => {
    const track = trackRef.current;
    if (!track) return;
    const next = Math.max(0, Math.min(steps.length - 1, i));
    pendingRef.current = next;
    setIndex(next);
    track.scrollTo({ left: next * track.clientWidth, behavior: reduceMotion ? "auto" : "smooth" });
  };

  const handleScroll = () => {
    const track = trackRef.current;
    if (!track || track.clientWidth === 0) return;
    const position = track.scrollLeft / track.clientWidth;
    if (pendingRef.current !== null) {
      if (Math.abs(position - pendingRef.current) > 0.02) return;
      pendingRef.current = null;
    }
    setIndex(Math.round(position));
  };

  // A swipe or trackpad scroll takes over from a button's scroll
  const releasePending = () => {
    pendingRef.current = null;
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      goTo(index - 1);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      goTo(index + 1);
    }
  };

  return (
    <Box role="region" aria-roledescription="carousel" aria-label="Export steps" onKeyDown={handleKeyDown}>
      {/* The drawings are decorative; the caption below carries the step */}
      <Box sx={{ borderRadius: "10px", overflow: "hidden", bgcolor: "surface.lowest" }}>
        <Box
          ref={trackRef}
          aria-hidden="true"
          onScroll={handleScroll}
          onPointerDown={releasePending}
          onTouchStart={releasePending}
          onWheel={releasePending}
          sx={{
            display: "flex",
            overflowX: "auto",
            overscrollBehaviorX: "contain",
            scrollSnapType: "x mandatory",
            scrollbarWidth: "none",
            "&::-webkit-scrollbar": { display: "none" },
          }}
        >
          {steps.map((step, i) => (
            <Box
              key={i}
              sx={{
                flex: "0 0 100%",
                height: STAGE_HEIGHT[device],
                px: 2,
                display: "grid",
                placeItems: "center",
                scrollSnapAlign: "center",
              }}
            >
              {device === "mobile" ? (
                <PhoneFrame>{step.screen}</PhoneFrame>
              ) : (
                <BrowserFrame url={step.url ?? "accountscenter.instagram.com"} wide={step.wide}>
                  {step.screen}
                </BrowserFrame>
              )}
            </Box>
          ))}
        </Box>
      </Box>

      <Box aria-live="polite" sx={{ mt: 2, minHeight: 44, display: "flex", gap: 1.25, alignItems: "flex-start" }}>
        <StepNumber n={index + 1} />
        <Typography sx={captionSx}>{steps[index].caption}</Typography>
      </Box>

      <Box sx={{ mt: 1.5, display: "flex", alignItems: "center", gap: 1 }}>
        <IconButton size="small" aria-label="Previous step" disabled={index === 0} onClick={() => goTo(index - 1)} sx={navButtonSx}>
          <ChevronLeftIcon sx={{ fontSize: 18 }} />
        </IconButton>
        <Box sx={{ display: "flex", alignItems: "center" }}>
          {steps.map((_, i) => {
            const current = i === index;
            return (
              <ButtonBase
                key={i}
                aria-label={`Go to step ${i + 1}`}
                aria-current={current ? "step" : undefined}
                onClick={() => goTo(i)}
                sx={{ height: 20, px: "3px", borderRadius: 999 }}
              >
                <Box
                  sx={{
                    width: current ? 16 : 6,
                    height: 6,
                    borderRadius: 999,
                    bgcolor: current ? "text.primary" : "surface.highest",
                    transition: "width 0.2s ease, background-color 0.2s ease",
                  }}
                />
              </ButtonBase>
            );
          })}
        </Box>
        <IconButton
          size="small"
          aria-label="Next step"
          disabled={index === steps.length - 1}
          onClick={() => goTo(index + 1)}
          sx={navButtonSx}
        >
          <ChevronRightIcon sx={{ fontSize: 18 }} />
        </IconButton>
        <Box sx={{ ml: "auto" }}>{footer}</Box>
      </Box>
    </Box>
  );
};

export const ExportGuide = ({ title = "How to get your followers & following data" }: ExportGuideProps) => {
  const [device, setDevice] = useState<Device>("mobile");
  const [view, setView] = useState<"slides" | "list">("slides");
  const steps = [...OPEN_EXPORT_STEPS[device], ...CONFIGURE_STEPS];

  const viewToggle = (
    <Button
      size="small"
      onClick={() => setView(view === "slides" ? "list" : "slides")}
      startIcon={view === "slides" ? <ViewListOutlinedIcon /> : <ViewCarouselOutlinedIcon />}
      sx={{ color: "text.secondary", fontSize: 12, "&:hover": { color: "text.primary" } }}
    >
      {view === "slides" ? "All steps" : "Step by step"}
    </Button>
  );

  return (
    <Panel sx={{ p: { xs: 2, sm: 3 }, textAlign: "left" }}>
      <Box
        sx={{
          display: "flex",
          flexWrap: "wrap",
          gap: 1.5,
          alignItems: "center",
          justifyContent: "space-between",
          mb: 2,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <MenuBookOutlinedIcon sx={{ fontSize: 20, color: "accent.primary" }} />
          <Typography variant="h3" component="h2">
            {title}
          </Typography>
        </Box>
        <Box
          role="tablist"
          aria-label="Device"
          sx={{ display: "flex", gap: 0.5, p: 0.5, borderRadius: "10px", bgcolor: "surface.lowest" }}
        >
          {DEVICES.map((d) => {
            const selected = d.key === device;
            return (
              <ButtonBase
                key={d.key}
                role="tab"
                aria-selected={selected}
                onClick={() => setDevice(d.key)}
                sx={(t) => ({
                  gap: 0.75,
                  px: 1.5,
                  py: 0.75,
                  borderRadius: "8px",
                  fontSize: 12,
                  fontWeight: 500,
                  ...(selected
                    ? {
                        color: "text.primary",
                        bgcolor: t.palette.mode === "dark" ? "surface.high" : "surface.card",
                        boxShadow: t.shadows[1],
                      }
                    : { color: "text.secondary", "&:hover": { color: "text.primary" } }),
                })}
              >
                {d.icon}
                {d.label}
              </ButtonBase>
            );
          })}
        </Box>
      </Box>

      {view === "slides" ? (
        // Remount per device so the carousel starts again at step 1
        <StepCarousel key={device} steps={steps} device={device} footer={viewToggle} />
      ) : (
        <>
          <StepList steps={steps} />
          <Box sx={{ mt: 1, display: "flex", justifyContent: "flex-end" }}>{viewToggle}</Box>
        </>
      )}

      <Box
        sx={(t) => ({
          mt: 2,
          p: 1.25,
          borderRadius: "8px",
          display: "flex",
          gap: 1,
          alignItems: "flex-start",
          bgcolor: t.palette.mode === "dark" ? alpha(t.palette.state.warning, 0.12) : t.palette.state.warningSubtle,
          color: "state.warning",
        })}
      >
        <WarningAmberIcon sx={{ fontSize: 18, mt: 0.25 }} />
        <Typography sx={{ fontSize: 13, "& strong": { color: "text.primary" } }}>
          The format defaults to <strong>HTML</strong>. Switch it to <strong>JSON</strong>, or the file
          can't be analyzed.
        </Typography>
      </Box>

      <Typography sx={{ mt: 1.5, fontSize: 12, color: "text.muted" }}>
        The export usually takes minutes, sometimes a few hours, and Meta emails you when it's ready.
        The download link expires after a few days. Select the ZIP as it is; there's no need to unzip it.
      </Typography>
    </Panel>
  );
};
