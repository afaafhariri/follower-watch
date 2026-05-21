import type { ReactNode } from "react";
import {
  Box,
  Container,
  Typography,
  AppBar,
  Toolbar,
  Link,
  Paper,
  Avatar,
  Button,
} from "@mui/material";
import AnalyticsIcon from "@mui/icons-material/Analytics";
import GitHubIcon from "@mui/icons-material/GitHub";
import LogoutIcon from "@mui/icons-material/Logout";
import type { UserInfo } from "../types";

interface LayoutProps {
  children: ReactNode;
  user: UserInfo | null;
  authenticated: boolean;
  onLogout: () => void;
}

export const Layout = ({ children, user, authenticated, onLogout }: LayoutProps) => {
  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        bgcolor: "background.default",
      }}
    >
      {/* Header */}
      <AppBar
        position="static"
        elevation={0}
        sx={{
          bgcolor: "background.paper",
          borderBottom: "1px solid",
          borderColor: "divider",
        }}
      >
        <Toolbar>
          <AnalyticsIcon sx={{ color: "primary.main", mr: 1.5 }} />
          <Typography
            variant="h6"
            sx={{
              flexGrow: 1,
              fontWeight: 700,
              background: "linear-gradient(45deg, #E1306C 30%, #405DE6 90%)",
              backgroundClip: "text",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            FollowerWatch
          </Typography>
          {user && (
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mr: 2 }}>
              <Avatar
                src={user.picture}
                alt={user.name}
                imgProps={{ referrerPolicy: "no-referrer" }}
                sx={{ width: 32, height: 32 }}
              />
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ display: { xs: "none", sm: "block" } }}
              >
                {user.name}
              </Typography>
              <Button
                size="small"
                onClick={onLogout}
                startIcon={<LogoutIcon />}
                sx={{ color: "text.secondary" }}
              >
                Logout
              </Button>
            </Box>
          )}
          <Link
            href="https://github.com/afaafhariri/follower-watch"
            target="_blank"
            rel="noopener noreferrer"
            sx={{ color: "text.primary" }}
          >
            <GitHubIcon />
          </Link>
        </Toolbar>
      </AppBar>

      {/* Main Content */}
      <Container
        maxWidth="lg"
        sx={{
          flex: 1,
          py: 4,
          display: "flex",
          flexDirection: "column",
          ...(!authenticated && { justifyContent: "center" }),
        }}
      >
        {authenticated && (
          <Box sx={{ textAlign: "center", mb: 4 }}>
            <Typography
              variant="h4"
              component="h1"
              gutterBottom
              sx={{ fontWeight: 700 }}
            >
              Find Who Doesn't Follow You Back
            </Typography>
            <Typography
              variant="body1"
              color="text.secondary"
              sx={{ maxWidth: 600, mx: "auto" }}
            >
              Upload your Instagram or Facebook data export to instantly discover
              which accounts you follow that don't follow you back. Your uploaded
              files are never stored.
            </Typography>
          </Box>
        )}

        <Paper
          elevation={0}
          sx={{
            ...(authenticated && { flex: 1 }),
            p: { xs: 2, sm: 4 },
            borderRadius: 3,
            border: "1px solid",
            borderColor: "divider",
          }}
        >
          {children}
        </Paper>
      </Container>

      {/* Footer */}
      <Box
        component="footer"
        sx={{
          py: 2,
          textAlign: "center",
          borderTop: "1px solid",
          borderColor: "divider",
          bgcolor: "background.paper",
        }}
      >
        <Typography variant="body2" color="text.secondary">
          Your uploaded files are never stored. Analysis results are cached
          temporarily and can be cleared at any time.
          <br />
          This tool is not affiliated with Instagram, Facebook, or Meta.
        </Typography>
      </Box>
    </Box>
  );
};
