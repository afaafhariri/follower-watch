import { ThemeProvider, createTheme, CssBaseline } from "@mui/material";
import { useState, useMemo } from "react";
import { Layout } from "./components/Layout";
import { FileUpload } from "./components/FileUpload";
import { ResultsDisplay } from "./components/ResultsDisplay";
import { ErrorDisplay } from "./components/ErrorDisplay";
import type { AnalysisResult, AppState } from "./types";

const App = () => {
  const [state, setState] = useState<AppState>({
    status: "idle",
    result: null,
    error: null,
  });

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
    setState({ status: "uploading", result: null, error: null });
  };

  const handleUploadSuccess = (result: AnalysisResult) => {
    setState({ status: "success", result, error: null });
  };

  const handleUploadError = (error: string) => {
    setState({ status: "error", result: null, error });
  };

  const handleReset = () => {
    setState({ status: "idle", result: null, error: null });
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Layout>
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
          <ResultsDisplay result={state.result} onReset={handleReset} />
        )}
      </Layout>
    </ThemeProvider>
  );
};

export default App;
