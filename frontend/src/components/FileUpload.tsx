import { useRef, useState } from "react";
import { Box, Button, LinearProgress, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import CloudUploadOutlinedIcon from "@mui/icons-material/CloudUploadOutlined";
import FolderZipOutlinedIcon from "@mui/icons-material/FolderZipOutlined";
import { UPLOAD_CONFIG } from "../config";
import { BRAND_GRADIENT } from "../theme";
import { FileTag, Mono, gradientButtonSx } from "./ui";

interface FileUploadProps {
  isUploading: boolean;
  progress: number;
  fileName: string | null;
  onFile: (file: File) => void;
}

export const FileUpload = ({ isUploading, progress, fileName, onFile }: FileUploadProps) => {
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
        border: "2px dashed",
        borderColor: isDragOver ? t.palette.secondary.main : alpha(t.palette.primary.main, 0.55),
        borderRadius: "16px",
        px: { xs: 2, sm: 4 },
        py: { xs: 4, sm: 6 },
        textAlign: "center",
        cursor: isUploading ? "default" : "pointer",
        transition: "border-color .2s, background-color .2s",
        bgcolor: isDragOver ? alpha(t.palette.primary.main, 0.08) : alpha(t.palette.surface.card, 0.4),
        "&:hover": isUploading
          ? undefined
          : { borderColor: t.palette.secondary.main, bgcolor: alpha(t.palette.primary.main, 0.05) },
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
          width: 64,
          height: 64,
          mx: "auto",
          mb: 2,
          borderRadius: "50%",
          display: "grid",
          placeItems: "center",
          color: "accent.primary",
          bgcolor: alpha(t.palette.primary.main, 0.14),
          boxShadow: `0 0 32px ${alpha(t.palette.primary.main, 0.35)}`,
        })}
      >
        {isUploading ? <FolderZipOutlinedIcon sx={{ fontSize: 32 }} /> : <CloudUploadOutlinedIcon sx={{ fontSize: 32 }} />}
      </Box>

      {isUploading ? (
        <Box>
          <Typography sx={{ fontSize: 18, fontWeight: 600 }}>Processing your data…</Typography>
          {fileName && <Mono sx={{ color: "text.muted" }}>{fileName}</Mono>}
          <Box sx={{ width: "100%", maxWidth: 400, mx: "auto", mt: 2.5 }}>
            <LinearProgress
              variant="determinate"
              value={progress}
              aria-label="Upload progress"
              sx={{
                height: 8,
                borderRadius: 4,
                bgcolor: "surface.high",
                "& .MuiLinearProgress-bar": { borderRadius: 4, background: BRAND_GRADIENT },
              }}
            />
            <Mono sx={{ display: "block", mt: 1, color: "text.secondary" }}>
              {progress < 100 ? "Analyzing…" : "Complete!"}
            </Mono>
          </Box>
        </Box>
      ) : (
        <Box>
          <Typography sx={{ fontSize: 18, fontWeight: 600 }}>Drop your Instagram export ZIP here</Typography>
          <Typography sx={{ fontSize: 13, color: "text.secondary", mt: 0.5 }}>
            or click to browse • up to {UPLOAD_CONFIG.maxFileSizeMB} MB • no need to unzip
          </Typography>
          <Button
            size="large"
            startIcon={<CloudUploadOutlinedIcon />}
            sx={[gradientButtonSx, { mt: 3 }]}
            onClick={(e) => {
              e.stopPropagation();
              handleClick();
            }}
          >
            Select ZIP file
          </Button>
          <Box sx={{ mt: 3, display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 1 }}>
            <FileTag>connections/followers_and_following/</FileTag>
            <FileTag>followers_*.json</FileTag>
            <FileTag>following.json</FileTag>
          </Box>
        </Box>
      )}
    </Box>
  );
};
