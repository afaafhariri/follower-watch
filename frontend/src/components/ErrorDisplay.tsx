import { Box, Button, Alert, AlertTitle } from "@mui/material";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import RefreshIcon from "@mui/icons-material/Refresh";
import { ExportGuide } from "./ExportGuide";

interface ErrorDisplayProps {
  error: string;
  onRetry: () => void;
}

export const ErrorDisplay = ({ error, onRetry }: ErrorDisplayProps) => {
  return (
    <Box
      sx={{
        textAlign: "center",
        py: 4,
      }}
    >
      <ErrorOutlineIcon sx={{ fontSize: 64, color: "error.main", mb: 2 }} />

      <Alert
        severity="error"
        sx={{
          maxWidth: 500,
          mx: "auto",
          mb: 3,
          textAlign: "left",
        }}
      >
        <AlertTitle>Upload Failed</AlertTitle>
        {error}
      </Alert>

      <Button
        variant="contained"
        startIcon={<RefreshIcon />}
        onClick={onRetry}
        sx={{
          background: "linear-gradient(45deg, #E1306C 30%, #405DE6 90%)",
          "&:hover": {
            background: "linear-gradient(45deg, #C1285C 30%, #3050D6 90%)",
          },
        }}
      >
        Try Again
      </Button>

      <ExportGuide title="How to export your data correctly" />
    </Box>
  );
};
