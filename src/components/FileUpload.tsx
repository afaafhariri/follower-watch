import { useRef, useState } from "react";
import { Box, Button, LinearProgress, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import CloudUploadOutlinedIcon from "@mui/icons-material/CloudUploadOutlined";
import FolderZipOutlinedIcon from "@mui/icons-material/FolderZipOutlined";
import { UPLOAD_CONFIG } from "../config";
import { Mono, primaryButtonSx } from "./ui";

interface FileUploadProps {
  isUploading: boolean;
  progress: number;
  fileName: string | null;
  onFile: (file: File) => void;
}

export const FileUpload = ({
  isUploading,
  progress,
  fileName,
  onFile,
}: FileUploadProps) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    if (isUploading) return;
    const file = e.dataTransfer.files[0];
    if (file) onFile(file);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onFile(file);
    // Allow picking the same file again after an error
    e.target.value = "";
  };

  const handleClick = () => fileInputRef.current?.click();

  return (
    <Box
      onClick={!isUploading ? handleClick : undefined}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragOver(true);
      }}
      onDragLeave={(e) => {
        e.preventDefault();
        setIsDragOver(false);
      }}
      onDrop={handleDrop}
      sx={(t) => ({
        border: "1.5px dashed",
        borderColor: isDragOver ? t.palette.primary.main : alpha(t.palette.text.primary, 0.2),
        borderRadius: "12px",
        px: { xs: 2, sm: 4 },
        py: { xs: 4, sm: 6 },
        textAlign: "center",
        cursor: isUploading ? "default" : "pointer",
        transition: "border-color .2s, background-color .2s",
        bgcolor: isDragOver ? alpha(t.palette.primary.main, 0.06) : t.palette.surface.low,
        "&:hover": isUploading
          ? undefined
          : {
              borderColor: alpha(t.palette.text.primary, 0.4),
              bgcolor: t.palette.surface.container,
            },
      })}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".zip,application/zip,application/x-zip-compressed"
        onChange={handleFileSelect}
        style={{ display: "none" }}
        disabled={isUploading}
      />

      <Box
        sx={(t) => ({
          width: 56,
          height: 56,
          mx: "auto",
          mb: 2,
          borderRadius: "50%",
          display: "grid",
          placeItems: "center",
          color: "text.primary",
          bgcolor: "surface.card",
          boxShadow: t.shadows[1],
        })}
      >
        {isUploading ? (
          <FolderZipOutlinedIcon sx={{ fontSize: 28 }} />
        ) : (
          <CloudUploadOutlinedIcon sx={{ fontSize: 28 }} />
        )}
      </Box>

      {isUploading ? (
        <Box>
          <Typography sx={{ fontSize: 18, fontWeight: 600, letterSpacing: "-0.015em" }}>
            Processing your data…
          </Typography>
          {fileName && <Mono sx={{ color: "text.muted" }}>{fileName}</Mono>}
          <Box sx={{ width: "100%", maxWidth: 400, mx: "auto", mt: 2.5 }}>
            <LinearProgress
              variant="determinate"
              value={progress}
              aria-label="Analysis progress"
              sx={{
                height: 6,
                borderRadius: 4,
                bgcolor: "surface.high",
                "& .MuiLinearProgress-bar": {
                  borderRadius: 4,
                  bgcolor: "accent.container",
                },
              }}
            />
            <Mono sx={{ display: "block", mt: 1, color: "text.secondary" }}>
              {progress < 100 ? "Analyzing…" : "Complete!"}
            </Mono>
          </Box>
        </Box>
      ) : (
        <Box>
          <Typography sx={{ fontSize: 18, fontWeight: 600, letterSpacing: "-0.015em" }}>
            Drop your Instagram export ZIP here
          </Typography>
          <Typography sx={{ fontSize: 13, color: "text.secondary", mt: 0.5 }}>
            or click to browse • up to {UPLOAD_CONFIG.maxFileSizeMB} MB • no
            need to unzip
          </Typography>
          <Button
            startIcon={<CloudUploadOutlinedIcon />}
            sx={[primaryButtonSx, { mt: 3, px: 2.5, py: 1 }]}
            onClick={(e) => {
              e.stopPropagation();
              handleClick();
            }}
          >
            Select ZIP file
          </Button>
          {/* <Box sx={{ mt: 3, display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 1 }}>
            <FileTag>connections/followers_and_following/</FileTag>
            <FileTag>followers_*.json</FileTag>
            <FileTag>following.json</FileTag>
          </Box> */}
        </Box>
      )}
    </Box>
  );
};
