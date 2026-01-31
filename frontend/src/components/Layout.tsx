import type { ReactNode } from "react";
import { Box, Container, Typography, AppBar, Toolbar, Link, Paper } from "@mui/material";
import InstagramIcon from "@mui/icons-material/Instagram";
import GitHubIcon from "@mui/icons-material/GitHub";

interface LayoutProps {
  children: ReactNode;
}

export const Layout = ({ children }: LayoutProps) => {
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
          bgcolor: "white",
          borderBottom: "1px solid",
          borderColor: "divider",
        }}
      >
        <Toolbar>
          <InstagramIcon sx={{ color: "primary.main", mr: 1.5 }} />
          <Typography
            variant="h6"
            sx={{
              flexGrow: 1,
              color: "text.primary",
              fontWeight: 600,
              background: "linear-gradient(45deg, #E1306C 30%, #405DE6 90%)",
              backgroundClip: "text",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            FollowerCount
          </Typography>
          <Link
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            sx={{ color: "text.secondary" }}
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
        }}
      >
        {/* Hero Section */}
        <Box sx={{ textAlign: "center", mb: 4 }}>
          <Typography
            variant="h4"
            component="h1"
            gutterBottom
            sx={{
              fontWeight: 700,
              color: "text.primary",
            }}
          >
            Find Who Doesn't Follow You Back
          </Typography>
          <Typography
            variant="body1"
            color="text.secondary"
            sx={{ maxWidth: 600, mx: "auto" }}
          >
            Upload your Instagram data export to instantly discover which
            accounts you follow that don't follow you back. 100% private —
            processed in-memory, never stored.
          </Typography>
        </Box>

        {/* Content Area */}
        <Paper
          elevation={0}
          sx={{
            flex: 1,
            p: { xs: 2, sm: 4 },
            borderRadius: 3,
            border: "1px solid",
            borderColor: "divider",
          }}
        >
          {children}
        </Paper>

        {/* Instructions */}
        <Box sx={{ mt: 4, textAlign: "center" }}>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            How to get your Instagram data:
          </Typography>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ maxWidth: 500, mx: "auto" }}
          >
            1. Go to Instagram Settings → Privacy and Security → Download Data
            <br />
            2. Request your data in JSON format
            <br />
            3. Download the ZIP file when ready and upload it here
          </Typography>
        </Box>
      </Container>

      {/* Footer */}
      <Box
        component="footer"
        sx={{
          py: 2,
          textAlign: "center",
          borderTop: "1px solid",
          borderColor: "divider",
          bgcolor: "white",
        }}
      >
        <Typography variant="body2" color="text.secondary">
          Your data is processed entirely in-memory and never stored.
          <br />
          This tool is not affiliated with Instagram or Meta.
        </Typography>
      </Box>
    </Box>
  );
};
