import { Box, Button, Typography } from "@mui/material";
import GoogleIcon from "@mui/icons-material/Google";
import { AUTH_ENDPOINTS } from "../config";
import { HeroIntro, HeroShell, IntroCopy } from "./Hero";
import { gradientButtonSx } from "./ui";

export const LoginScreen = () => {
  const handleLogin = () => {
    window.location.href = AUTH_ENDPOINTS.login;
  };

  return (
    <Box sx={{ flex: 1, display: "flex", alignItems: "center" }}>
      <Box sx={{ width: "100%", maxWidth: 880, mx: "auto" }}>
        <HeroShell>
          <HeroIntro title="Find Who Unfollowed You On Instagram & More">
            <IntroCopy />
          </HeroIntro>
          <Box>
            <Button size="large" startIcon={<GoogleIcon />} onClick={handleLogin} sx={gradientButtonSx}>
              Sign in with Google
            </Button>
            <Typography sx={{ mt: 1.5, fontSize: 12, color: "text.muted", maxWidth: 520 }}>
              Sign-in is only used to prevent abuse and to let you come back to your last result. You
              never enter your Instagram password.
            </Typography>
          </Box>
        </HeroShell>
      </Box>
    </Box>
  );
};
