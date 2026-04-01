import { Box, Typography, Button } from "@mui/material";
import GoogleIcon from "@mui/icons-material/Google";
import { AUTH_ENDPOINTS } from "../config";

export const LoginScreen = () => {
  const handleLogin = () => {
    window.location.href = AUTH_ENDPOINTS.login;
  };

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        py: 6,
      }}
    >
      <Typography variant="h6" gutterBottom>
        Sign in to continue
      </Typography>
      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ mb: 4, textAlign: "center", maxWidth: 400 }}
      >
        Sign in with your Google account to use FollowerCount. We only use
        authentication to prevent abuse — your Instagram data is still processed
        entirely in-memory.
      </Typography>
      <Button
        variant="contained"
        size="large"
        startIcon={<GoogleIcon />}
        onClick={handleLogin}
        sx={{
          px: 4,
          py: 1.5,
          background: "linear-gradient(45deg, #E1306C 30%, #405DE6 90%)",
          "&:hover": {
            background: "linear-gradient(45deg, #C1285C 30%, #3050D6 90%)",
          },
        }}
      >
        Sign in with Google
      </Button>
    </Box>
  );
};
