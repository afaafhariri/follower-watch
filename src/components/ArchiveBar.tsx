import { useState } from "react";
import { Box, Button, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import FolderZipOutlinedIcon from "@mui/icons-material/FolderZipOutlined";
import HistoryIcon from "@mui/icons-material/History";
import UploadFileOutlinedIcon from "@mui/icons-material/UploadFileOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import VerifiedUserOutlinedIcon from "@mui/icons-material/VerifiedUserOutlined";
import { PrivacyBadges } from "./Hero";
import { Panel, ghostButtonSx, primaryButtonSx } from "./ui";
import type { AnalysisResult, UploadInfo } from "../types";

interface ArchiveBarProps {
  result: AnalysisResult;
  upload: UploadInfo | null;
  cachedAt: number | null;
  onPickFile: () => void;
  onDropFile: (file: File) => void;
  onClearCache: () => void;
}

const formatSize = (bytes: number) =>
  bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;

// Hidden on phones, where the items wrap onto their own lines
const Sep = () => (
  <Box component="span" aria-hidden sx={{ display: { xs: "none", sm: "inline" }, color: "text.muted" }}>
    •
  </Box>
);

const Fact = ({ label, value, tone }: { label: string; value: string; tone?: "negative" }) => (
  <Box component="span" sx={{ display: "inline-flex", gap: 0.5, whiteSpace: "nowrap" }}>
    <Box component="span" sx={{ color: "text.muted" }}>
      {label}
    </Box>
    <Box component="span" sx={{ fontWeight: 500, color: tone === "negative" ? "state.negative" : "text.primary" }}>
      {value}
    </Box>
  </Box>
);

// The analyzed export: where it came from, what to do next, and the headline numbers
export const ArchiveBar = ({ result, upload, cachedAt, onPickFile, onDropFile, onClearCache }: ArchiveBarProps) => {
  const [dragOver, setDragOver] = useState(false);

  const details = upload
    ? [upload.name, formatSize(upload.size), `Analyzed in ${upload.durationMs.toLocaleString()} ms`]
    : [
        cachedAt ? `Saved in this browser on ${new Date(cachedAt * 1000).toLocaleDateString()}` : "Saved in this browser",
        "Upload a new export to refresh",
      ];

  return (
    <Panel
      component="section"
      aria-label="Current export"
      sx={{ position: "relative", overflow: "hidden", p: { xs: 2, md: 3 }, bgcolor: "surface.low" }}
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
      <Box
        sx={{
          position: "relative",
          display: "flex",
          flexDirection: { xs: "column", lg: "row" },
          alignItems: { lg: "center" },
          justifyContent: "space-between",
          gap: 2,
        }}
      >
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5, minWidth: 0 }}>
          <PrivacyBadges />
          <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", columnGap: 1.5, rowGap: 0.5 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              {upload ? (
                <FolderZipOutlinedIcon sx={{ fontSize: 22, color: "accent.primary" }} />
              ) : (
                <HistoryIcon sx={{ fontSize: 22, color: "accent.primary" }} />
              )}
              <Typography component="h1" sx={{ fontSize: 18, lineHeight: "24px", fontWeight: 600, letterSpacing: "-0.015em" }}>
                {upload ? "Instagram Data Archive" : "Saved analysis"}
              </Typography>
            </Box>
            <Box
              sx={{
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                gap: 1,
                fontSize: 12,
                lineHeight: "16px",
                color: "text.secondary",
                minWidth: 0,
              }}
            >
              {details.map((d, i) => (
                <Box key={d} component="span" sx={{ display: "inline-flex", gap: 1, minWidth: 0, overflowWrap: "anywhere" }}>
                  {i > 0 && <Sep />}
                  {d}
                </Box>
              ))}
              <Sep />
              <Box component="span" sx={{ color: "state.positive", fontWeight: 500 }}>
                Successfully analyzed
              </Box>
            </Box>
          </Box>
        </Box>

        <Box
          sx={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            gap: 1,
            flexShrink: 0,
            "& > button": { flex: { xs: "1 1 auto", lg: "none" } },
          }}
        >
          <Button size="small" startIcon={<DeleteOutlineIcon />} onClick={onClearCache} sx={ghostButtonSx}>
            Clear saved result
          </Button>
          <Button
            size="small"
            startIcon={<UploadFileOutlinedIcon />}
            onClick={onPickFile}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              const file = e.dataTransfer.files[0];
              if (file) onDropFile(file);
            }}
            sx={[
              primaryButtonSx,
              (t) => ({
                outline: dragOver ? `2px dashed ${t.palette.primary.main}` : "none",
                outlineOffset: 2,
                ...(dragOver && { bgcolor: alpha(t.palette.accent.container, 0.8) }),
              }),
            ]}
          >
            Upload new archive
          </Button>
        </Box>
      </Box>

      <Box
        sx={(t) => ({
          position: "relative",
          mt: 2,
          px: 2,
          py: 1,
          borderRadius: "8px",
          bgcolor: t.palette.mode === "dark" ? alpha(t.palette.surface.lowest, 0.4) : "surface.card",
          boxShadow: t.palette.mode === "dark" ? "none" : t.shadows[1],
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 1,
          fontSize: 12,
          lineHeight: "16px",
        })}
      >
        <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", columnGap: 1.5, rowGap: 0.5 }}>
          <Fact label="Analyzed:" value={`${result.total_following.toLocaleString()} following`} />
          <Sep />
          <Fact label="Followers found:" value={`${result.total_followers.toLocaleString()} accounts`} />
          <Sep />
          <Fact label="Not following back:" value={`${result.count.toLocaleString()} accounts`} tone="negative" />
        </Box>
        <Box sx={{ display: "inline-flex", alignItems: "center", gap: 0.5, color: "text.muted" }}>
          <VerifiedUserOutlinedIcon sx={{ fontSize: 14, color: "state.positive" }} />
          Nothing sent to any server
        </Box>
      </Box>
    </Panel>
  );
};
