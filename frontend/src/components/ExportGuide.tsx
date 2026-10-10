import { useState } from "react";
import {
  Alert,
  Box,
  Link,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import PhoneIphoneIcon from "@mui/icons-material/PhoneIphone";
import LaptopIcon from "@mui/icons-material/Laptop";

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
      <Link href="https://www.instagram.com" target="_blank" rel="noopener noreferrer">
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

export const ExportGuide = ({ title = "How to get your Instagram data" }: ExportGuideProps) => {
  const [device, setDevice] = useState<Device>("mobile");
  const steps = [...OPEN_EXPORT_STEPS[device], ...CONFIGURE_STEPS];

  return (
    <Box sx={{ mt: 3, maxWidth: 560, mx: "auto", textAlign: "left" }}>
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
        <Typography variant="subtitle1" fontWeight={600}>
          {title}
        </Typography>
        <ToggleButtonGroup
          size="small"
          exclusive
          value={device}
          onChange={(_, v: Device | null) => v && setDevice(v)}
          aria-label="Device"
        >
          <ToggleButton value="mobile" sx={{ px: 1.5, gap: 0.5 }}>
            <PhoneIphoneIcon fontSize="small" /> Mobile app
          </ToggleButton>
          <ToggleButton value="web" sx={{ px: 1.5, gap: 0.5 }}>
            <LaptopIcon fontSize="small" /> Web
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>

      <Box component="ol" sx={{ pl: 3, m: 0, "& li": { mb: 0.75 } }}>
        {steps.map((step, i) => (
          <Typography key={i} component="li" variant="body2" color="text.secondary">
            {step}
          </Typography>
        ))}
      </Box>

      <Alert severity="warning" sx={{ mt: 2 }}>
        The format defaults to <strong>HTML</strong>. Switch it to <strong>JSON</strong>, or the
        file can't be analyzed.
      </Alert>

      <Typography variant="caption" color="text.secondary" component="div" sx={{ mt: 1.5 }}>
        The export usually takes minutes, sometimes a few hours, and Meta emails you when it's
        ready. The download link expires after a few days. <strong>Note:</strong> Upload the ZIP as it is; there's no need
        to unzip it.
      </Typography>
    </Box>
  );
};
