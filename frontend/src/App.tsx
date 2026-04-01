import {
  ThemeProvider,
  createTheme,
  CssBaseline,
  Alert,
  Button,
  Box,
} from "@mui/material";
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

const App = () => {
  const [state, setState] = useState<AppState>({
    status: "idle",
    result: null,
    error: null,
    cachedAt: null,
  });

  const [auth, setAuth] = useState<AuthState>({
    authenticated: false,
    user: null,
    loading: true,
  });

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
          fetch(API_ENDPOINTS.lastResult, { credentials: "include" })
            .then((res) => res.json())
            .then((cached: CachedResultResponse) => {
              if (cached.success && cached.result) {
                setState({
                  status: "success",
                  result: cached.result,
                  error: null,
                  cachedAt: cached.cached_at ?? null,
                });
              }
            })
            .catch(() => {
              // No cached result, stay idle
            });
        }
      })
      .catch(() => {
        setAuth({ authenticated: false, user: null, loading: false });
      });
  }, []);

  const handleLogout = () => {
    fetch(AUTH_ENDPOINTS.logout, {
      method: "POST",
      credentials: "include",
    }).then(() => {
      setAuth({ authenticated: false, user: null, loading: false });
      setState({ status: "idle", result: null, error: null, cachedAt: null });
    });
  };

  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode: "light",
          primary: {
            main: "#E1306C", // Instagram pink
          },
          secondary: {
            main: "#405DE6", // Instagram purple
          },
          background: {
            default: "#fafafa",
            paper: "#ffffff",
          },
        },
        typography: {
          fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
          h4: {
            fontWeight: 600,
          },
        },
        shape: {
          borderRadius: 12,
        },
        components: {
          MuiButton: {
            styleOverrides: {
              root: {
                textTransform: "none",
                fontWeight: 500,
              },
            },
          },
          MuiPaper: {
            styleOverrides: {
              root: {
                boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
              },
            },
          },
        },
      }),
    [],
  );

  const handleUploadStart = () => {
    setState({ status: "uploading", result: null, error: null, cachedAt: null });
  };

  const handleUploadSuccess = (result: AnalysisResult) => {
    setState({ status: "success", result, error: null, cachedAt: null });
  };

  const handleUploadError = (error: string) => {
    setState({ status: "error", result: null, error, cachedAt: null });
  };

  const handleReset = () => {
    setState({ status: "idle", result: null, error: null, cachedAt: null });
  };

  const handleClearCache = () => {
    fetch(API_ENDPOINTS.deleteResult, {
      method: "DELETE",
      credentials: "include",
    }).then(() => {
      setState({ status: "idle", result: null, error: null, cachedAt: null });
    });
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Layout user={auth.user} onLogout={handleLogout}>
        {auth.loading ? null : !auth.authenticated ? (
          <LoginScreen />
        ) : (
          <>
            {state.status === "error" && state.error && (
              <ErrorDisplay error={state.error} onRetry={handleReset} />
            )}

            {(state.status === "idle" || state.status === "uploading") && (
              <FileUpload
                isUploading={state.status === "uploading"}
                onUploadStart={handleUploadStart}
                onUploadSuccess={handleUploadSuccess}
                onUploadError={handleUploadError}
              />
            )}

            {state.status === "success" && state.result && (
              <>
                {state.cachedAt && (
                  <Box sx={{ mb: 2 }}>
                    <Alert
                      severity="info"
                      action={
                        <Button
                          color="inherit"
                          size="small"
                          onClick={handleClearCache}
                        >
                          Clear cached data
                        </Button>
                      }
                    >
                      Showing your last analysis from{" "}
                      {new Date(state.cachedAt * 1000).toLocaleDateString()}.
                      Upload a new file to re-analyze.
                    </Alert>
                  </Box>
                )}
                <ResultsDisplay result={state.result} onReset={handleReset} />
              </>
            )}
          </>
        )}
      </Layout>
    </ThemeProvider>
  );
};

export default App;
