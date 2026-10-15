import { useState } from "react";
import { Box, Button, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import FolderZipOutlinedIcon from "@mui/icons-material/FolderZipOutlined";
import HistoryIcon from "@mui/icons-material/History";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import FileUploadOutlinedIcon from "@mui/icons-material/FileUploadOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import { Mono, ghostButtonSx } from "./ui";
import type { UploadInfo } from "../types";

interface ArchiveBarProps {
  upload: UploadInfo | null;
  cachedAt: number | null;
  onPickFile: () => void;
  onDropFile: (file: File) => void;
  onClearCache: () => void;
}

const formatSize = (bytes: number) =>
  bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;

export const ArchiveBar = ({ upload, cachedAt, onPickFile, onDropFile, onClearCache }: ArchiveBarProps) => {
  const [dragOver, setDragOver] = useState(false);

  const title = upload ? upload.name : "Saved analysis";
  const detail = upload
    ? `${formatSize(upload.size)} • Analyzed in ${upload.durationMs.toLocaleString()} ms`
    : cachedAt
      ? `From ${new Date(cachedAt * 1000).toLocaleDateString()} • Upload a new export to refresh`
      : "Upload a new export to refresh";

  return (
    <Box
      component="section"
      aria-label="Current export"
      sx={(t) => ({
        display: "flex",
        flexDirection: { xs: "column", lg: "row" },
        alignItems: { xs: "stretch", lg: "center" },
        justifyContent: "space-between",
        gap: 2,
        p: 2,
        borderRadius: "12px",
        bgcolor: "surface.low",
        border: `1px solid ${t.palette.surface.border}`,
      })}
    >
      <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 2, minWidth: 0 }}>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            px: 2,
            py: 0.75,
            borderRadius: "8px",
            bgcolor: "surface.container",
            minWidth: 0,
          }}
        >
          {upload ? (
            <FolderZipOutlinedIcon sx={{ fontSize: 20, color: "accent.primary" }} />
          ) : (
            <HistoryIcon sx={{ fontSize: 20, color: "accent.primary" }} />
          )}
          <Box sx={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
            <Typography noWrap sx={{ fontSize: 12, fontWeight: 600 }}>
              {title}
            </Typography>
            <Mono sx={{ fontSize: 10, color: "text.muted" }}>{detail}</Mono>
          </Box>
        </Box>
        <Mono sx={{ display: "inline-flex", alignItems: "center", gap: 0.5, fontSize: 10, color: "state.positive" }}>
          <CheckCircleOutlineIcon sx={{ fontSize: 16 }} />
          JSON export parsed
        </Mono>
      </Box>

      <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 1 }}>
        <Button
          size="small"
          startIcon={<DeleteOutlineIcon />}
          onClick={onClearCache}
          sx={[ghostButtonSx, { bgcolor: "transparent", color: "text.secondary" }]}
        >
          Clear saved result
        </Button>
        <Button
          size="small"
          startIcon={<FileUploadOutlinedIcon sx={{ color: "secondary.main" }} />}
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
            ghostButtonSx,
            (t) => ({
              outline: dragOver ? `2px dashed ${t.palette.primary.main}` : "none",
              bgcolor: dragOver ? alpha(t.palette.primary.main, 0.15) : t.palette.surface.high,
            }),
          ]}
        >
          Drop / Pick New ZIP
        </Button>
      </Box>
    </Box>
  );
};
