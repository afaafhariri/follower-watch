import { Box, Button, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import RefreshIcon from "@mui/icons-material/Refresh";
import { Micro, Panel, gradientButtonSx } from "./ui";

interface ErrorDisplayProps {
  error: string;
  onRetry: () => void;
}

export const ErrorDisplay = ({ error, onRetry }: ErrorDisplayProps) => (
  <Panel
    sx={(t) => ({
      p: { xs: 3, sm: 4 },
      textAlign: "center",
      borderTop: `2px solid ${t.palette.state.negative}`,
    })}
  >
    <Box
      sx={(t) => ({
        width: 56,
        height: 56,
        mx: "auto",
        mb: 2,
        borderRadius: "50%",
        display: "grid",
        placeItems: "center",
        color: "state.negative",
        bgcolor: alpha(t.palette.state.negative, 0.14),
      })}
    >
      <ErrorOutlineIcon sx={{ fontSize: 30 }} />
    </Box>
    <Micro sx={{ color: "state.negative" }}>Upload failed</Micro>
    <Typography role="alert" sx={{ mt: 1, mb: 3, fontSize: 15, maxWidth: 520, mx: "auto" }}>
      {error}
    </Typography>
    <Button startIcon={<RefreshIcon />} onClick={onRetry} sx={gradientButtonSx}>
      Try again
    </Button>
  </Panel>
);
