import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  Alert,
  Box,
  Button,
  ButtonBase,
  IconButton,
  InputBase,
  Link,
  MenuItem,
  Select,
  Snackbar,
  Tooltip,
  Typography,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import SearchIcon from "@mui/icons-material/Search";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import DownloadIcon from "@mui/icons-material/Download";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import CloseIcon from "@mui/icons-material/Close";
import CheckIcon from "@mui/icons-material/Check";
import HourglassEmptyIcon from "@mui/icons-material/HourglassEmpty";
import RemoveIcon from "@mui/icons-material/Remove";
import { MONO } from "../theme";
import { Mono, Panel, Pill, ghostButtonSx, toneColor, type Tone } from "./ui";
import type { AnalysisResult, FollowRequestStatus, Profile } from "../types";

export type TabKey = "non_followers" | "follow_requests" | "pending_requests" | "unfollowed";

type SortKey = "az" | "za" | "newest" | "oldest";

const SORT_LABELS: Record<SortKey, string> = {
  az: "Sort: A–Z",
  za: "Sort: Z–A",
  newest: "Sort: Newest first",
  oldest: "Sort: Oldest first",
};

const PAGE_SIZE = 20;

// One row shape for every list so they share rendering
interface ListRow {
  username: string;
  name?: string;
  profile_url: string;
  date?: number;
  status?: FollowRequestStatus;
  follows_you?: boolean;
}

interface ListTab {
  key: TabKey;
  label: string;
  description: ReactNode;
  recent: boolean;
  rows: ListRow[];
  source: string;
  dateVerb: string;
  defaultSort: SortKey;
  badge: (row: ListRow) => { label: string; tone: Tone };
  csvFile: string;
  csvHeaders: string[];
  csvRow: (row: ListRow) => (string | undefined)[];
}

const STATUS_LABELS: Record<FollowRequestStatus, string> = {
  accepted: "Accepted",
  not_accepted: "Not accepted",
};

const isoDate = (ts?: number) => (ts ? new Date(ts * 1000).toISOString() : "");
const monthYear = (ts: number) =>
  new Date(ts * 1000).toLocaleDateString(undefined, { month: "short", year: "numeric" });

const relative = (ts: number) => {
  const days = Math.floor((Date.now() / 1000 - ts) / 86400);
  if (days < 1) return "today";
  if (days < 60) return `${days}d ago`;
  if (days < 730) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
};

const toRows = <T extends Profile>(
  items: T[] | undefined,
  extra: (item: T) => Partial<ListRow> = () => ({}),
): ListRow[] =>
  (items ?? []).map((item) => ({
    username: item.username,
    name: item.name,
    profile_url: item.profile_url,
    date: item.timestamp,
    ...extra(item),
  }));

const sortRows = (rows: ListRow[], sort: SortKey) => {
  const sorted = [...rows];
  switch (sort) {
    case "az":
      return sorted.sort((a, b) => a.username.localeCompare(b.username));
    case "za":
      return sorted.sort((a, b) => b.username.localeCompare(a.username));
    // Rows without a date go last either way
    case "newest":
      return sorted.sort((a, b) => (b.date ?? -Infinity) - (a.date ?? -Infinity));
    case "oldest":
      return sorted.sort((a, b) => (a.date ?? Infinity) - (b.date ?? Infinity));
  }
};

// Page numbers with ellipses, e.g. 1 … 4 5 6 … 42
const pageList = (page: number, count: number): (number | "…")[] => {
  const pages = new Set([1, count, page - 1, page, page + 1].filter((p) => p >= 1 && p <= count));
  const out: (number | "…")[] = [];
  let prev = 0;
  for (const p of [...pages].sort((a, b) => a - b)) {
    if (p - prev > 1) out.push("…");
    out.push(p);
    prev = p;
  }
  return out;
};

const AVATAR_GRADIENTS = [
  "linear-gradient(135deg, #AA0266, #D0BCFF)",
  "linear-gradient(135deg, #A078FF, #FFB0CD)",
  "linear-gradient(135deg, #6366F1, #8B5CF6)",
  "linear-gradient(135deg, #EC4899, #F59E0B)",
  "linear-gradient(135deg, #0EA5E9, #8B5CF6)",
];

const initials = (row: ListRow) => {
  const source = row.name?.trim() || row.username.replace(/[._]+/g, " ");
  const parts = source.split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? parts[0]?.[1] ?? "")).toUpperCase();
};

const hash = (s: string) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 0);

const TONE_MARKS: Record<Tone, ReactNode> = {
  negative: <CloseIcon />,
  positive: <CheckIcon />,
  warning: <HourglassEmptyIcon />,
  neutral: <RemoveIcon />,
  accent: <RemoveIcon />,
};

const RowAvatar = ({ row, tone }: { row: ListRow; tone: Tone }) => (
  <Box sx={{ position: "relative", flexShrink: 0 }}>
    <Box
      sx={{
        width: 44,
        height: 44,
        borderRadius: "50%",
        display: "grid",
        placeItems: "center",
        background: AVATAR_GRADIENTS[hash(row.username) % AVATAR_GRADIENTS.length],
        color: "#fff",
        fontWeight: 700,
        fontSize: 14,
      }}
    >
      {initials(row)}
    </Box>
    <Box
      sx={(t) => ({
        position: "absolute",
        right: -3,
        bottom: -3,
        width: 18,
        height: 18,
        borderRadius: "50%",
        display: "grid",
        placeItems: "center",
        bgcolor: tone === "neutral" ? t.palette.surface.highest : toneColor(t, tone).fg,
        color: "#fff",
        border: `2px solid ${t.palette.surface.card}`,
        "& svg": { fontSize: 11 },
      })}
    >
      {TONE_MARKS[tone]}
    </Box>
  </Box>
);

interface ResultsDisplayProps {
  result: AnalysisResult;
  activeTab: TabKey;
  onTabChange: (tab: TabKey) => void;
}

export const ResultsDisplay = ({ result, activeTab, onTabChange }: ResultsDisplayProps) => {
  const activity = result.recent_activity;
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey | null>(null);
  const [page, setPage] = useState(1);
  const [toast, setToast] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const tabs: ListTab[] = useMemo(
    () => [
      {
        key: "non_followers",
        label: "Don't follow back",
        description: "Accounts you follow that don't follow you back.",
        recent: false,
        rows: result.non_followers.map((user) => ({
          username: user.username,
          profile_url: user.profile_url,
          date: user.followed_at,
        })),
        source: "following.json",
        dateVerb: "Followed",
        defaultSort: "az",
        badge: () => ({ label: "Doesn't follow back", tone: "negative" }),
        csvFile: "non_followers.csv",
        csvHeaders: ["Username", "Profile URL", "Followed At"],
        csvRow: (r) => [r.username, r.profile_url, isoDate(r.date)],
      },
      {
        key: "follow_requests",
        label: "Recent requests",
        description: (
          <>
            Follow requests you sent recently. <strong>Accepted</strong>: you now follow them.{" "}
            <strong>Not accepted</strong>: declined, withdrawn, or you've since unfollowed them.
            Requests still waiting are in Pending requests.
          </>
        ),
        recent: true,
        rows: toRows(
          activity?.follow_requests.filter((r) => r.status in STATUS_LABELS),
          (r) => ({ status: r.status }),
        ),
        source: "recent_follow_requests.json",
        dateVerb: "Requested",
        defaultSort: "newest",
        badge: (r) =>
          r.status === "accepted"
            ? { label: "Accepted", tone: "positive" }
            : { label: "Not accepted", tone: "negative" },
        csvFile: "recent_follow_requests.csv",
        csvHeaders: ["Username", "Name", "Profile URL", "Requested At", "Status"],
        csvRow: (r) => [r.username, r.name, r.profile_url, isoDate(r.date), r.status && STATUS_LABELS[r.status]],
      },
      {
        key: "pending_requests",
        label: "Pending requests",
        description:
          "Follow requests you've sent that haven't been accepted yet. You can withdraw one from that account's profile.",
        recent: false,
        rows: toRows(activity?.pending_requests),
        source: "pending_follow_requests.json",
        dateVerb: "Requested",
        defaultSort: "newest",
        badge: () => ({ label: "Pending", tone: "warning" }),
        csvFile: "pending_follow_requests.csv",
        csvHeaders: ["Username", "Name", "Profile URL", "Requested At"],
        csvRow: (r) => [r.username, r.name, r.profile_url, isoDate(r.date)],
      },
      {
        key: "unfollowed",
        label: "Unfollowed by you",
        description: (
          <>
            Accounts <strong>you</strong> unfollowed. This is not a list of people who unfollowed
            you; Instagram's export doesn't include that.
          </>
        ),
        recent: true,
        rows: toRows(activity?.unfollowed, (u) => ({ follows_you: u.follows_you })),
        source: "recently_unfollowed_profiles.json",
        dateVerb: "Unfollowed",
        defaultSort: "newest",
        badge: (r) =>
          r.follows_you
            ? { label: "Follows you", tone: "positive" }
            : { label: "Doesn't follow you", tone: "neutral" },
        csvFile: "recently_unfollowed.csv",
        csvHeaders: ["Username", "Name", "Profile URL", "Unfollowed At", "Follows You"],
        csvRow: (r) => [r.username, r.name, r.profile_url, isoDate(r.date), r.follows_you ? "Yes" : "No"],
      },
    ],
    [result.non_followers, activity],
  );

  const tab = tabs.find((t) => t.key === activeTab) ?? tabs[0];
  const missingFromCache = tab.key !== "non_followers" && !activity;
  const activeSort = sort ?? tab.defaultSort;

  const visibleRows = useMemo(() => {
    const q = query.trim().replace(/^@/, "").toLowerCase();
    const filtered = q
      ? tab.rows.filter((r) => r.username.toLowerCase().includes(q) || r.name?.toLowerCase().includes(q))
      : tab.rows;
    return sortRows(filtered, activeSort);
  }, [tab, query, activeSort]);

  const pageCount = Math.max(1, Math.ceil(visibleRows.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pageRows = visibleRows.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  // Each list starts fresh: default sort, first page, no filter
  useEffect(() => {
    setSort(null);
    setPage(1);
    setQuery("");
  }, [activeTab]);

  // "/" focuses the filter, like the hint in the search box says
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (e.key !== "/" || target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return;
      e.preventDefault();
      searchRef.current?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const copy = useCallback(async (text: string, message: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setToast(message);
    } catch {
      setToast("Couldn't access the clipboard");
    }
  }, []);

  const downloadCSV = useCallback(() => {
    const escape = (value: string | undefined) => `"${(value ?? "").replace(/"/g, '""')}"`;
    const csvRows = [
      tab.csvHeaders.join(","),
      ...visibleRows.map((row) => tab.csvRow(row).map(escape).join(",")),
    ];

    const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", tab.csvFile);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [tab, visibleRows]);

  return (
    <Box id="results" sx={{ display: "flex", flexDirection: "column", gap: 2, scrollMarginTop: 88, minWidth: 0 }}>
      {/* Segmented list tabs */}
      <Box
        role="tablist"
        aria-label="Result lists"
        sx={(t) => ({
          display: "flex",
          // Scroll sideways on small screens instead of stacking
          flexWrap: { xs: "nowrap", md: "wrap" },
          overflowX: "auto",
          scrollbarWidth: "none",
          "&::-webkit-scrollbar": { display: "none" },
          gap: 0.75,
          p: 0.5,
          borderRadius: "12px",
          bgcolor: "surface.lowest",
          border: `1px solid ${t.palette.surface.border}`,
        })}
      >
        {tabs.map((t) => {
          const selected = t.key === tab.key;
          const showCount = t.key === "non_followers" || activity;
          return (
            <ButtonBase
              key={t.key}
              role="tab"
              aria-selected={selected}
              onClick={() => onTabChange(t.key)}
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
                flexShrink: 0,
                whiteSpace: "nowrap",
                px: 2,
                py: 1,
                borderRadius: "8px",
                fontSize: 13,
                fontWeight: 600,
                transition: "background-color .15s, color .15s",
                ...(selected
                  ? { bgcolor: "accent.container", color: "accent.onContainer" }
                  : { color: "text.secondary", "&:hover": { bgcolor: "surface.container", color: "text.primary" } }),
              }}
            >
              {t.label}
              {showCount && (
                <Box
                  component="span"
                  sx={{
                    px: 1,
                    py: 0.25,
                    borderRadius: 999,
                    fontFamily: MONO,
                    fontSize: 10,
                    fontWeight: 700,
                    ...(selected
                      ? { bgcolor: "accent.onContainer", color: "accent.container" }
                      : { bgcolor: "surface.container", color: "text.secondary" }),
                  }}
                >
                  {t.rows.length.toLocaleString()}
                </Box>
              )}
            </ButtonBase>
          );
        })}
      </Box>

      <Box sx={{ px: 0.5 }}>
        <Typography sx={{ fontSize: 13, color: "text.secondary" }}>{tab.description}</Typography>
        {tab.recent && (
          <Mono sx={{ fontSize: 10, color: "text.muted" }}>
            Instagram only includes roughly the last 90 days of this list.
          </Mono>
        )}
      </Box>

      {missingFromCache ? (
        <Alert severity="info" variant="outlined">
          This saved result is from before this list was added. Upload a new export to see it.
        </Alert>
      ) : (
        <>
          {/* Toolbar */}
          <Panel
            sx={{
              p: 2,
              display: "flex",
              flexDirection: { xs: "column", sm: "row" },
              alignItems: { xs: "stretch", sm: "center" },
              gap: 1,
            }}
          >
            <Box
              sx={(t) => ({
                flex: 1,
                display: "flex",
                alignItems: "center",
                gap: 1,
                px: 1.25,
                borderRadius: "8px",
                bgcolor: "surface.container",
                "&:focus-within": { boxShadow: `0 0 0 1px ${t.palette.primary.main}` },
              })}
            >
              <SearchIcon sx={{ fontSize: 18, color: "text.muted" }} />
              <InputBase
                inputRef={searchRef}
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(1);
                }}
                placeholder="Filter by username or name…"
                inputProps={{ "aria-label": "Filter accounts" }}
                sx={{ flex: 1, fontSize: 13, py: 0.75 }}
              />
              <Box
                component="kbd"
                sx={{
                  display: { xs: "none", sm: "block" },
                  px: 0.75,
                  py: 0.25,
                  borderRadius: "4px",
                  bgcolor: "surface.high",
                  color: "text.muted",
                  fontSize: 10,
                }}
              >
                /
              </Box>
            </Box>
            <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
              <Select
                size="small"
                value={activeSort}
                onChange={(e) => {
                  setSort(e.target.value as SortKey);
                  setPage(1);
                }}
                inputProps={{ "aria-label": "Sort" }}
                sx={{
                  flex: { xs: 1, sm: "none" },
                  fontSize: 13,
                  color: "text.secondary",
                  bgcolor: "surface.container",
                  "& .MuiOutlinedInput-notchedOutline": { border: "none" },
                  "& .MuiSelect-select": { py: 0.9 },
                }}
              >
                {(Object.keys(SORT_LABELS) as SortKey[]).map((key) => (
                  <MenuItem key={key} value={key} sx={{ fontSize: 13 }}>
                    {SORT_LABELS[key]}
                  </MenuItem>
                ))}
              </Select>
              <Button
                size="small"
                startIcon={<ContentCopyIcon />}
                disabled={visibleRows.length === 0}
                onClick={() =>
                  copy(
                    visibleRows.map((r) => r.username).join("\n"),
                    `Copied ${visibleRows.length.toLocaleString()} usernames`,
                  )
                }
                sx={ghostButtonSx}
              >
                Copy all
              </Button>
              <Button
                size="small"
                startIcon={<DownloadIcon />}
                disabled={visibleRows.length === 0}
                onClick={downloadCSV}
                sx={ghostButtonSx}
              >
                Export CSV
              </Button>
            </Box>
          </Panel>

          {/* Account rows */}
          <Box component="ul" sx={{ listStyle: "none", m: 0, p: 0, display: "flex", flexDirection: "column", gap: 1 }}>
            {pageRows.length === 0 && (
              <Panel component="li" sx={{ p: 4, textAlign: "center" }}>
                <Typography sx={{ fontSize: 14, color: "text.secondary" }}>
                  {query ? `No accounts match "${query}".` : "Nothing in this list."}
                </Typography>
              </Panel>
            )}
            {pageRows.map((row, i) => {
              const badge = tab.badge(row);
              return (
                <Panel
                  component="li"
                  key={`${row.username}:${i}`}
                  sx={{
                    p: 2,
                    display: "flex",
                    flexDirection: { xs: "column", md: "row" },
                    alignItems: { md: "center" },
                    justifyContent: "space-between",
                    gap: 2,
                    transition: "background-color .15s",
                    "&:hover": { bgcolor: "surface.container" },
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: 2, minWidth: 0 }}>
                    <RowAvatar row={row} tone={badge.tone} />
                    <Box sx={{ minWidth: 0 }}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                        <Link
                          href={row.profile_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          underline="hover"
                          noWrap
                          sx={{ fontSize: 17, fontWeight: 700, color: "text.primary", maxWidth: "100%" }}
                        >
                          @{row.username}
                        </Link>
                        <Pill tone={badge.tone}>{badge.label}</Pill>
                      </Box>
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 1,
                          mt: 0.25,
                          fontSize: 12,
                          color: "text.secondary",
                          minWidth: 0,
                        }}
                      >
                        {row.name && (
                          <>
                            <Box component="span" sx={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {row.name}
                            </Box>
                            <Box component="span" sx={{ color: "text.muted" }}>
                              •
                            </Box>
                          </>
                        )}
                        <Mono sx={{ fontSize: 10, color: "text.muted", whiteSpace: "nowrap" }}>
                          {row.date ? `${tab.dateVerb} ${monthYear(row.date)}` : "Date not in export"}
                        </Mono>
                      </Box>
                    </Box>
                  </Box>

                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: { xs: "space-between", md: "flex-end" },
                      gap: 1.5,
                      flexShrink: 0,
                    }}
                  >
                    <Box sx={{ display: { xs: "none", sm: "flex" }, flexDirection: "column", alignItems: "flex-end" }}>
                      {row.date && (
                        <Mono sx={{ fontSize: 10, color: "text.secondary" }}>
                          {tab.dateVerb} {relative(row.date)}
                        </Mono>
                      )}
                      <Mono sx={{ fontSize: 10, color: "text.muted" }}>source: {tab.source}</Mono>
                    </Box>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, ml: { xs: "auto", sm: 0 } }}>
                      <Tooltip title="Copy username">
                        <IconButton
                          size="small"
                          aria-label={`Copy @${row.username}`}
                          onClick={() => copy(row.username, `Copied @${row.username}`)}
                          sx={{
                            borderRadius: "8px",
                            bgcolor: "surface.high",
                            color: "text.secondary",
                            "&:hover": { bgcolor: "surface.highest", color: "text.primary" },
                          }}
                        >
                          <ContentCopyIcon sx={{ fontSize: 16 }} />
                        </IconButton>
                      </Tooltip>
                      <Button
                        size="small"
                        href={row.profile_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        endIcon={<OpenInNewIcon sx={{ fontSize: "16px !important" }} />}
                        aria-label={`Open @${row.username} on Instagram`}
                        sx={(t) => ({
                          bgcolor: "surface.glass",
                          color: "text.primary",
                          border: `1px solid ${t.palette.surface.border}`,
                          px: 1.5,
                          "&:hover": { bgcolor: "accent.container", color: "accent.onContainer" },
                        })}
                      >
                        Open IG
                      </Button>
                    </Box>
                  </Box>
                </Panel>
              );
            })}
          </Box>

          {/* Pagination */}
          {visibleRows.length > 0 && (
            <Panel
              component="nav"
              sx={{
                p: 2,
                display: "flex",
                flexDirection: { xs: "column", sm: "row" },
                alignItems: "center",
                justifyContent: "space-between",
                gap: 1,
              }}
            >
              <Typography sx={{ fontSize: 12, color: "text.secondary" }}>
                Showing{" "}
                <Box component="strong" sx={{ color: "text.primary" }}>
                  {((currentPage - 1) * PAGE_SIZE + 1).toLocaleString()}–
                  {Math.min(currentPage * PAGE_SIZE, visibleRows.length).toLocaleString()}
                </Box>{" "}
                of{" "}
                <Box component="strong" sx={{ color: "text.primary" }}>
                  {visibleRows.length.toLocaleString()}
                </Box>{" "}
                {visibleRows.length === 1 ? "account" : "accounts"}
              </Typography>
              {pageCount > 1 && (
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                  <IconButton
                    size="small"
                    aria-label="Previous page"
                    disabled={currentPage === 1}
                    onClick={() => setPage(currentPage - 1)}
                    sx={{ borderRadius: "8px", bgcolor: "surface.container" }}
                  >
                    <ChevronLeftIcon fontSize="small" />
                  </IconButton>
                  {pageList(currentPage, pageCount).map((p, i) =>
                    p === "…" ? (
                      <Mono key={`gap-${i}`} sx={{ px: 0.75, color: "text.muted" }}>
                        …
                      </Mono>
                    ) : (
                      <ButtonBase
                        key={p}
                        aria-label={`Page ${p}`}
                        aria-current={p === currentPage ? "page" : undefined}
                        onClick={() => setPage(p)}
                        sx={(t) => ({
                          minWidth: 32,
                          height: 32,
                          px: 1,
                          borderRadius: "8px",
                          fontSize: 13,
                          fontWeight: 600,
                          ...(p === currentPage
                            ? { bgcolor: t.palette.accent.container, color: t.palette.accent.onContainer }
                            : {
                                color: t.palette.text.secondary,
                                "&:hover": { bgcolor: alpha(t.palette.text.primary, 0.06) },
                              }),
                        })}
                      >
                        {p}
                      </ButtonBase>
                    ),
                  )}
                  <IconButton
                    size="small"
                    aria-label="Next page"
                    disabled={currentPage === pageCount}
                    onClick={() => setPage(currentPage + 1)}
                    sx={{ borderRadius: "8px", bgcolor: "surface.container" }}
                  >
                    <ChevronRightIcon fontSize="small" />
                  </IconButton>
                </Box>
              )}
            </Panel>
          )}
        </>
      )}

      <Snackbar
        open={toast !== null}
        autoHideDuration={2500}
        onClose={() => setToast(null)}
        message={toast}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      />
    </Box>
  );
};
