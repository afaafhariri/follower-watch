import { ThemeProvider, CssBaseline, Box, type PaletteMode } from "@mui/material";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useState, useMemo, useEffect, useRef, type ReactNode } from "react";
import { Layout, type NavItem } from "./components/Layout";
import { FileUpload } from "./components/FileUpload";
import { ResultsDisplay, type TabKey } from "./components/ResultsDisplay";
import { ErrorDisplay } from "./components/ErrorDisplay";
import { ExportGuide } from "./components/ExportGuide";
import { ArchiveBar } from "./components/ArchiveBar";
import { InfoSidebar } from "./components/InfoSidebar";
import { CacheCapsule, HeroIntro, HeroShell, IntroCopy, StatCards } from "./components/Hero";
import { useExportAnalysis } from "./hooks/useExportAnalysis";
import { clearSavedResult, loadSavedResult, saveResult } from "./lib/savedResult";
import { createAppTheme } from "./theme";
import type { AppState } from "./types";

const initialInstagramState: AppState = {
  status: "idle",
  result: null,
  error: null,
  cachedAt: null,
  upload: null,
};

const THEME_STORAGE_KEY = "followerwatch-theme";

const readThemeChoice = (): PaletteMode | null => {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    return stored === "dark" || stored === "light" ? stored : null;
  } catch {
    return null;
  }
};

const scrollToId = (id: string) =>
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });

// Main column + info sidebar, stacked below lg
const Workspace = ({ children }: { children: ReactNode }) => (
  <Box
    sx={{
      display: "grid",
      gridTemplateColumns: { xs: "minmax(0, 1fr)", lg: "minmax(0, 8fr) minmax(0, 4fr)" },
      gap: 3,
      alignItems: "start",
    }}
  >
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>{children}</Box>
    <InfoSidebar />
  </Box>
);

const App = () => {
  const [instagramState, setInstagramState] =
    useState<AppState>(initialInstagramState);
  const [activeTab, setActiveTab] = useState<TabKey>("non_followers");
  const [uploadingName, setUploadingName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Hold the first render until the saved result has been looked up, so the
  // upload screen doesn't flash before it
  const [loadingSaved, setLoadingSaved] = useState(true);

  const prefersDarkMode = useMediaQuery("(prefers-color-scheme: dark)", { noSsr: true });
  // Explicit choice from the header toggle; null follows the system setting
  const [themeChoice, setThemeChoice] = useState<PaletteMode | null>(readThemeChoice);
  const mode: PaletteMode = themeChoice ?? (prefersDarkMode ? "dark" : "light");

  const toggleTheme = () => {
    const next = mode === "dark" ? "light" : "dark";
    setThemeChoice(next);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Storage unavailable (private mode); the choice lasts for this visit
    }
  };

  useEffect(() => {
    loadSavedResult().then((saved) => {
      if (saved) {
        setInstagramState({
          status: "success",
          result: saved.result,
          error: null,
          cachedAt: saved.savedAt,
          upload: null,
        });
      }
      setLoadingSaved(false);
    });
  }, []);

  const theme = useMemo(() => createAppTheme(mode), [mode]);

  // --- Instagram handlers ---
  const { analyze: upload, progress } = useExportAnalysis({
    onStart: (file) => {
      setUploadingName(file.name);
      setInstagramState({ ...initialInstagramState, status: "uploading" });
    },
    onSuccess: (result, info) => {
      setActiveTab("non_followers");
      setInstagramState({
        status: "success",
        result,
        error: null,
        cachedAt: null,
        upload: info,
      });
      saveResult(result);
    },
    onError: (error) =>
      setInstagramState({ ...initialInstagramState, status: "error", error }),
  });

  const pickFile = () => fileInputRef.current?.click();

  const handleInstagramReset = () =>
    setInstagramState(initialInstagramState);

  const handleClearInstagramCache = () => {
    clearSavedResult().then(() => setInstagramState(initialInstagramState));
  };

  const s = instagramState;
  const hasResult = s.status === "success" && s.result !== null;

  const goToTab = (tab: TabKey) => {
    setActiveTab(tab);
    scrollToId("results");
  };

  const nav: NavItem[] | undefined = hasResult
    ? [
        { label: "Overview", onClick: () => scrollToId("overview") },
        { label: "Don't Follow Back", active: activeTab === "non_followers", onClick: () => goToTab("non_followers") },
        { label: "Follow Requests", active: activeTab === "follow_requests", onClick: () => goToTab("follow_requests") },
        { label: "Unfollowed by You", active: activeTab === "unfollowed", onClick: () => goToTab("unfollowed") },
        { label: "How It Works", onClick: () => scrollToId("how-it-works") },
      ]
    : undefined;

  const renderInstagramContent = () => {
    if (s.status === "success" && s.result) {
      return (
        <>
          <HeroShell id="overview">
            <HeroIntro
              title="Find Who Unfollowed You On Instagram"
              aside={s.cachedAt ? <CacheCapsule cachedAt={s.cachedAt} /> : undefined}
            >
              <IntroCopy />
            </HeroIntro>
            <StatCards
              result={s.result}
              analyzedAt={s.cachedAt ? new Date(s.cachedAt * 1000) : new Date()}
            />
          </HeroShell>
          <ArchiveBar
            upload={s.upload}
            cachedAt={s.cachedAt}
            onPickFile={pickFile}
            onDropFile={upload}
            onClearCache={handleClearInstagramCache}
          />
          <Workspace>
            <ResultsDisplay result={s.result} activeTab={activeTab} onTabChange={setActiveTab} />
          </Workspace>
        </>
      );
    }

    return (
      <>
        <HeroShell>
          <HeroIntro title="Find Who Unfollowed You On Instagram">
            <IntroCopy />
          </HeroIntro>
        </HeroShell>
        <Workspace>
          {s.status === "error" && s.error ? (
            <>
              <ErrorDisplay error={s.error} onRetry={handleInstagramReset} />
              <ExportGuide title="How to export your data correctly" />
            </>
          ) : (
            <>
              <FileUpload
                isUploading={s.status === "uploading"}
                progress={progress}
                fileName={uploadingName}
                onFile={upload}
              />
              <ExportGuide />
            </>
          )}
        </Workspace>
      </>
    );
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <input
        ref={fileInputRef}
        type="file"
        accept=".zip,application/zip,application/x-zip-compressed"
        style={{ display: "none" }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) upload(file);
          e.target.value = "";
        }}
      />
      <Layout nav={nav} themeMode={mode} onToggleTheme={toggleTheme}>
        {loadingSaved ? null : renderInstagramContent()}
      </Layout>
    </ThemeProvider>
  );
};

export default App;
