import { useState } from "react";
import { Box, ButtonBase, Link, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import PhoneIphoneIcon from "@mui/icons-material/PhoneIphone";
import LaptopIcon from "@mui/icons-material/Laptop";
import MenuBookOutlinedIcon from "@mui/icons-material/MenuBookOutlined";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import { Mono, Panel } from "./ui";

type Device = "mobile" | "web";

interface ExportGuideProps {
  title?: string;
}

const OPEN_EXPORT_STEPS: Record<Device, React.ReactNode[]> = {
  mobile: [
    <>Open the Instagram app and go to your <strong>profile</strong></>,
    <>Tap the <strong>☰ menu</strong> (top right), then <strong>Accounts Center</strong></>,
    <>Tap <strong>Your information and permissions</strong> → <strong>Export your information</strong></>,
  ],
  web: [
    <>
      Sign in at{" "}
      <Link href="https://www.instagram.com" target="_blank" rel="noopener noreferrer" sx={{ color: "accent.primary" }}>
        instagram.com
      </Link>
    </>,
    <>Click <strong>More (☰)</strong> at the bottom left → <strong>Settings</strong> → <strong>Accounts Center</strong></>,
    <>Click <strong>Your information and permissions</strong> → <strong>Export your information</strong></>,
  ],
};

const CONFIGURE_STEPS: React.ReactNode[] = [
  <>Choose <strong>Create export</strong>, select your Instagram profile, then <strong>Export to device</strong></>,
  <>Under <strong>Customize information</strong>, clear everything and select only <strong>Followers and following</strong></>,
  <>Set <strong>Date range</strong> to <strong>All time</strong> and <strong>Format</strong> to <strong>JSON</strong></>,
  <>Select <strong>Start export</strong>. When the email arrives, download the ZIP and upload it here</>,
];

const DEVICES: { key: Device; label: string; icon: React.ReactNode }[] = [
  { key: "mobile", label: "Mobile app", icon: <PhoneIphoneIcon sx={{ fontSize: 16 }} /> },
  { key: "web", label: "Web", icon: <LaptopIcon sx={{ fontSize: 16 }} /> },
];

export const ExportGuide = ({ title = "How to get your followers & following data" }: ExportGuideProps) => {
  const [device, setDevice] = useState<Device>("mobile");
  const steps = [...OPEN_EXPORT_STEPS[device], ...CONFIGURE_STEPS];

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
                sx={{
                  gap: 0.75,
                  px: 1.5,
                  py: 0.75,
                  borderRadius: "8px",
                  fontSize: 12,
                  fontWeight: 600,
                  ...(selected
                    ? { bgcolor: "accent.container", color: "accent.onContainer" }
                    : { color: "text.secondary", "&:hover": { color: "text.primary" } }),
                }}
              >
                {d.icon}
                {d.label}
              </ButtonBase>
            );
          })}
        </Box>
      </Box>

      <Box component="ol" sx={{ listStyle: "none", m: 0, p: 0, display: "flex", flexDirection: "column", gap: 1 }}>
        {steps.map((step, i) => (
          <Box component="li" key={i} sx={{ display: "flex", gap: 1.25, alignItems: "flex-start" }}>
            <Mono
              sx={(t) => ({
                width: 22,
                height: 22,
                flexShrink: 0,
                borderRadius: "50%",
                display: "grid",
                placeItems: "center",
                fontSize: 10,
                fontWeight: 700,
                bgcolor: alpha(t.palette.primary.main, 0.15),
                color: "accent.primary",
              })}
            >
              {i + 1}
            </Mono>
            <Typography sx={{ fontSize: 13, lineHeight: "22px", color: "text.secondary", "& strong": { color: "text.primary" } }}>
              {step}
            </Typography>
          </Box>
        ))}
      </Box>

      <Box
        sx={(t) => ({
          mt: 2,
          p: 1.25,
          borderRadius: "8px",
          display: "flex",
          gap: 1,
          alignItems: "flex-start",
          bgcolor: alpha(t.palette.state.warning, 0.1),
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
        The download link expires after a few days. Upload the ZIP as it is; there's no need to unzip it.
      </Typography>
    </Panel>
  );
};
