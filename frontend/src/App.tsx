import {
  ThemeProvider,
  createTheme,
  CssBaseline,
  Alert,
  Button,
  Box,
  Typography,
} from "@mui/material";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useState, useMemo, useEffect } from "react";
import { Layout } from "./components/Layout";
import { FileUpload } from "./components/FileUpload";
import { ResultsDisplay } from "./components/ResultsDisplay";
import { ErrorDisplay } from "./components/ErrorDisplay";
import { LoginScreen } from "./components/LoginScreen";
import { AUTH_ENDPOINTS, API_ENDPOINTS } from "./config";
import type {
  AnalysisResult,
  AppState,
  AuthState,
  CachedResultResponse,
} from "./types";

const INSTAGRAM_GRADIENT_START = "#E1306C";
const INSTAGRAM_GRADIENT_END = "#405DE6";

const initialInstagramState: AppState = {
  status: "idle",
  result: null,
  error: null,
  cachedAt: null,
};

const InstagramInstructions = () => (
  <Box sx={{ mt: 3, textAlign: "center" }}>
    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
      How to get your Instagram data:
    </Typography>
    <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 500, mx: "auto" }}>
      1. Go to Instagram Settings → Privacy and Security → Download Data
      <br />
      2. Select <strong>"following and followers"</strong> only
      <br />
      3. Request your data in <strong>JSON format</strong> and set time to "all time"
      <br />
      4. Download the ZIP file when ready and upload it here
    </Typography>
  </Box>
);

const App = () => {
  const [instagramState, setInstagramState] =
    useState<AppState>(initialInstagramState);

  const [auth, setAuth] = useState<AuthState>({
    authenticated: false,
    user: null,
    loading: true,
  });

  const prefersDarkMode = useMediaQuery("(prefers-color-scheme: dark)");

  useEffect(() => {
    fetch(AUTH_ENDPOINTS.me, { credentials: "include" })
      .then((res) => res.json())
      .then((data) => {
        setAuth({
          authenticated: data.authenticated,
          user: data.user || null,
          loading: false,
        });

        if (data.authenticated) {
          // Load Instagram cached result
          fetch(API_ENDPOINTS.lastResult, { credentials: "include" })
            .then((res) => res.json())
            .then((cached: CachedResultResponse) => {
              if (cached.success && cached.result) {
                setInstagramState({
                  status: "success",
                  result: cached.result,
                  error: null,
                  cachedAt: cached.cached_at ?? null,
                });
              }
            })
            .catch(() => {});
        }
      })
      .catch(() => {
        setAuth({ authenticated: false, user: null, loading: false });
      });
  }, []);

  const handleLogout = () => {
    fetch(AUTH_ENDPOINTS.logout, { method: "POST", credentials: "include" }).then(
      () => {
        setAuth({ authenticated: false, user: null, loading: false });
        setInstagramState(initialInstagramState);
      },
    );
  };

  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode: prefersDarkMode ? "dark" : "light",
          primary: { main: "#E1306C" },
          secondary: { main: "#405DE6" },
          ...(prefersDarkMode
            ? {
                background: { default: "#0d0d1a", paper: "#141428" },
              }
            : {
                background: { default: "#fafafa", paper: "#ffffff" },
              }),
        },
        typography: {
          fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
          h4: { fontWeight: 600 },
        },
        shape: { borderRadius: 12 },
        components: {
          MuiButton: {
            styleOverrides: { root: { textTransform: "none", fontWeight: 500 } },
          },
          MuiPaper: {
            styleOverrides: {
              root: {
                boxShadow: prefersDarkMode
                  ? "0 2px 12px rgba(0,0,0,0.4)"
                  : "0 2px 12px rgba(0,0,0,0.08)",
              },
            },
          },
        },
      }),
    [prefersDarkMode],
  );

  // --- Instagram handlers ---
  const handleInstagramUploadStart = () =>
    setInstagramState({ status: "uploading", result: null, error: null, cachedAt: null });

  const handleInstagramUploadSuccess = (raw: unknown) => {
    setInstagramState({
      status: "success",
      result: raw as AnalysisResult,
      error: null,
      cachedAt: null,
    });
  };

  const handleInstagramUploadError = (error: string) =>
    setInstagramState({ status: "error", result: null, error, cachedAt: null });

  const handleInstagramReset = () =>
    setInstagramState(initialInstagramState);

  const handleClearInstagramCache = () => {
    fetch(API_ENDPOINTS.deleteResult, { method: "DELETE", credentials: "include" }).then(
      () => setInstagramState(initialInstagramState),
    );
  };

  const renderInstagramContent = () => {
    const s = instagramState;
    return (
      <>
        {s.status === "error" && s.error && (
          <ErrorDisplay error={s.error} onRetry={handleInstagramReset} />
        )}

        {(s.status === "idle" || s.status === "uploading") && (
          <>
            <FileUpload
              isUploading={s.status === "uploading"}
              apiEndpoint={API_ENDPOINTS.analyze}
              platformLabel="Instagram"
              gradientStart={INSTAGRAM_GRADIENT_START}
              gradientEnd={INSTAGRAM_GRADIENT_END}
              onUploadStart={handleInstagramUploadStart}
              onUploadSuccess={handleInstagramUploadSuccess}
              onUploadError={handleInstagramUploadError}
            />
            <InstagramInstructions />
          </>
        )}

        {s.status === "success" && s.result && (
          <>
            {s.cachedAt && (
              <Box sx={{ mb: 2 }}>
                <Alert
                  severity="info"
                  action={
                    <Button
                      color="inherit"
                      size="small"
                      onClick={handleClearInstagramCache}
                    >
                      Clear cached data
                    </Button>
                  }
                >
                  Showing your last Instagram analysis from{" "}
                  {new Date(s.cachedAt * 1000).toLocaleDateString()}. Upload a
                  new file to re-analyze.
                </Alert>
              </Box>
            )}
            <ResultsDisplay result={s.result} onReset={handleInstagramReset} />
          </>
        )}
      </>
    );
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Layout
        user={auth.user}
        authenticated={auth.authenticated}
        onLogout={handleLogout}
      >
        {auth.loading ? null : !auth.authenticated ? (
          <LoginScreen />
        ) : (
          renderInstagramContent()
        )}
      </Layout>
    </ThemeProvider>
  );
};

export default App;
