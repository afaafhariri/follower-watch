import { Box, Button, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import RefreshIcon from "@mui/icons-material/Refresh";
import { Micro, Panel, primaryButtonSx } from "./ui";

interface ErrorDisplayProps {
  error: string;
  onRetry: () => void;
}

export const ErrorDisplay = ({ error, onRetry }: ErrorDisplayProps) => (
  <Panel
    sx={{
      p: { xs: 3, sm: 4 },
      textAlign: "center",
    }}
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
        bgcolor: t.palette.mode === "dark" ? alpha(t.palette.state.negative, 0.12) : t.palette.state.negativeSubtle,
      })}
    >
      <ErrorOutlineIcon sx={{ fontSize: 30 }} />
    </Box>
    <Micro sx={{ color: "state.negative" }}>Analysis failed</Micro>
    <Typography role="alert" sx={{ mt: 1, mb: 3, fontSize: 15, maxWidth: 520, mx: "auto" }}>
      {error}
    </Typography>
    <Button startIcon={<RefreshIcon />} onClick={onRetry} sx={primaryButtonSx}>
      Try again
    </Button>
  </Panel>
);
