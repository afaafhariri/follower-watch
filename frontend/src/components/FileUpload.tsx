import { useCallback, useState, useRef } from "react";
import { Box, Typography, Button, LinearProgress, Alert } from "@mui/material";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import FolderZipIcon from "@mui/icons-material/FolderZip";
import { API_ENDPOINTS, UPLOAD_CONFIG, RETRY_CONFIG } from "../config";
import type { AnalysisResult, ApiError } from "../types";

interface FileUploadProps {
  isUploading: boolean;
  onUploadStart: () => void;
  onUploadSuccess: (result: AnalysisResult) => void;
  onUploadError: (error: string) => void;
}

export const FileUpload = ({
  isUploading,
  onUploadStart,
  onUploadSuccess,
  onUploadError,
}: FileUploadProps) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): string | null => {
    const isZip =
      file.type === "application/zip" ||
      file.type === "application/x-zip-compressed" ||
      file.name.endsWith(".zip");

    if (!isZip) {
      return "Please upload a ZIP file";
    }

    const maxSize = UPLOAD_CONFIG.maxFileSizeMB * 1024 * 1024;
    if (file.size > maxSize) {
      return `File too large. Maximum size is ${UPLOAD_CONFIG.maxFileSizeMB}MB`;
    }

    return null;
  };

  const uploadWithRetry = async (
    file: File,
    retryCount = 0,
  ): Promise<AnalysisResult> => {
    try {
      const response = await fetch(API_ENDPOINTS.analyze, {
        method: "POST",
        body: file,
        headers: {
          "Content-Type": "application/zip",
        },
      });

      const data = await response.json();

      if (!response.ok) {
        const errorData = data as ApiError;
        throw new Error(errorData.error || "Upload failed");
      }

      return data as AnalysisResult;
    } catch (error) {
      if (retryCount < RETRY_CONFIG.maxRetries) {
        const delay = Math.min(
          RETRY_CONFIG.baseDelay * Math.pow(2, retryCount),
          RETRY_CONFIG.maxDelay,
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
        return uploadWithRetry(file, retryCount + 1);
      }
      throw error;
    }
  };

  const handleUpload = async (file: File) => {
    const validationError = validateFile(file);
    if (validationError) {
      onUploadError(validationError);
      return;
    }

    setSelectedFile(file);
    onUploadStart();
    setUploadProgress(0);

    const progressInterval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return 90;
        }
        return prev + 10;
      });
    }, 200);

    try {
      const result = await uploadWithRetry(file);
      clearInterval(progressInterval);
      setUploadProgress(100);

      setTimeout(() => {
        onUploadSuccess(result);
      }, 300);
    } catch (error) {
      clearInterval(progressInterval);
      setUploadProgress(0);
      onUploadError(
        error instanceof Error
          ? error.message
          : "An unexpected error occurred. Please try again.",
      );
    }
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);

      const files = e.dataTransfer.files;
      if (files.length > 0) {
        handleUpload(files[0]);
      }
    },
    [handleUpload],
  );

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleUpload(files[0]);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <Box sx={{ width: "100%" }}>
      {/* Dropzone */}
      <Box
        onClick={!isUploading ? handleClick : undefined}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        sx={{
          border: "2px dashed",
          borderColor: isDragOver
            ? "primary.main"
            : isUploading
              ? "grey.300"
              : "grey.400",
          borderRadius: 3,
          p: 6,
          textAlign: "center",
          cursor: isUploading ? "default" : "pointer",
          transition: "all 0.2s ease",
          bgcolor: isDragOver ? "action.hover" : "transparent",
          "&:hover": {
            borderColor: isUploading ? "grey.300" : "primary.main",
            bgcolor: isUploading ? "transparent" : "action.hover",
          },
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".zip,application/zip,application/x-zip-compressed"
          onChange={handleFileSelect}
          style={{ display: "none" }}
          disabled={isUploading}
        />

        {isUploading ? (
          <Box>
            <FolderZipIcon
              sx={{ fontSize: 64, color: "primary.main", mb: 2 }}
            />
            <Typography variant="h6" gutterBottom>
              Processing your data...
            </Typography>
            {selectedFile && (
              <Typography variant="body2" color="text.secondary" gutterBottom>
                {selectedFile.name}
              </Typography>
            )}
            <Box sx={{ width: "100%", maxWidth: 400, mx: "auto", mt: 2 }}>
              <LinearProgress
                variant="determinate"
                value={uploadProgress}
                sx={{
                  height: 8,
                  borderRadius: 4,
                  bgcolor: "grey.200",
                  "& .MuiLinearProgress-bar": {
                    borderRadius: 4,
                    background:
                      "linear-gradient(45deg, #E1306C 30%, #405DE6 90%)",
                  },
                }}
              />
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                {uploadProgress < 100 ? "Analyzing..." : "Complete!"}
              </Typography>
            </Box>
          </Box>
        ) : (
          <Box>
            <CloudUploadIcon
              sx={{ fontSize: 64, color: "primary.main", mb: 2 }}
            />
            <Typography variant="h6" gutterBottom>
              Drop your Instagram data ZIP file here
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              or click to browse
            </Typography>
            <Button
              variant="contained"
              size="large"
              startIcon={<CloudUploadIcon />}
              sx={{
                mt: 2,
                px: 4,
                background: "linear-gradient(45deg, #E1306C 30%, #405DE6 90%)",
                "&:hover": {
                  background:
                    "linear-gradient(45deg, #C1285C 30%, #3050D6 90%)",
                },
              }}
              onClick={(e) => {
                e.stopPropagation();
                handleClick();
              }}
            >
              Select ZIP File
            </Button>
          </Box>
        )}
      </Box>

      {/* Security Notice */}
      <Alert
        severity="info"
        icon={false}
        sx={{
          mt: 3,
          bgcolor: "grey.50",
          border: "1px solid",
          borderColor: "grey.200",
        }}
      >
        <Typography variant="body2">
          <strong>🔒 Privacy First:</strong> Your data is processed entirely in
          memory. We never store your files, usernames, or any personal
          information on our servers.
        </Typography>
      </Alert>
    </Box>
  );
};
