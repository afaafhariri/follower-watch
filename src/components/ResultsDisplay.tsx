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
  type Theme,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import DownloadIcon from "@mui/icons-material/Download";
import NorthEastIcon from "@mui/icons-material/NorthEast";
import { MONO } from "../theme";
import { FileTag, Mono, Panel, Pill, ghostButtonSx, toneColor, type Tone } from "./ui";
import type { AnalysisResult, FollowRequestStatus, Profile } from "../types";

export type TabKey = "non_followers" | "follow_requests" | "pending_requests" | "unfollowed";

type SortKey = "az" | "za" | "newest" | "oldest";

const SORT_LABELS: Record<SortKey, string> = {
  az: "Alphabetical (A–Z)",
  za: "Alphabetical (Z–A)",
  newest: "Date: Newest first",
  oldest: "Date: Oldest first",
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
  dateHeading: string;
  defaultSort: SortKey;
  countTone: Tone;
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
const fullDate = (ts: number) =>
  new Date(ts * 1000).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });

const relative = (ts: number) => {
  const days = Math.floor((Date.now() / 1000 - ts) / 86400);
  if (days < 1) return "today";
  if (days < 60) return `${days} days ago`;
  if (days < 730) return `${Math.floor(days / 30)} months ago`;
  return `${Math.floor(days / 365)} years ago`;
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

const initials = (row: ListRow) => {
  const source = row.name?.trim() || row.username.replace(/[._]+/g, " ");
  const parts = source.split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? parts[0]?.[1] ?? "")).toUpperCase();
};

const hash = (s: string) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 0);

const AVATAR_TONES: Tone[] = ["accent", "positive", "warning", "neutral"];

const RowAvatar = ({ row }: { row: ListRow }) => (
  <Box
    aria-hidden
    sx={(t) => {
      const tone = AVATAR_TONES[hash(row.username) % AVATAR_TONES.length];
      return {
        width: 36,
        height: 36,
        flexShrink: 0,
        borderRadius: "50%",
        display: "grid",
        placeItems: "center",
        bgcolor: t.palette.mode === "dark" ? "surface.highest" : "surface.container",
        color: tone === "neutral" ? "text.primary" : toneColor(t, tone).fg,
        fontFamily: MONO,
        fontSize: 11,
        fontWeight: 700,
      };
    }}
  >
    {initials(row)}
  </Box>
);

// Account | date | status | actions; on phones the status drops below the account
const rowGridSx = {
  display: "grid",
  gridTemplateColumns: {
    xs: "minmax(0, 1fr) auto",
    md: "minmax(0, 5fr) minmax(0, 3fr) minmax(0, 3fr) auto",
  },
  columnGap: 2,
  rowGap: 1,
  alignItems: "center",
  px: { xs: 2, md: 3 },
} as const;

const segmentSx = (selected: boolean) => (t: Theme) => ({
  display: "flex",
  alignItems: "center",
  gap: 0.75,
  flexShrink: 0,
  whiteSpace: "nowrap",
  px: 1.5,
  py: 0.75,
  borderRadius: "8px",
  fontSize: 13,
  transition: "background-color .15s, color .15s",
  ...(selected
    ? {
        fontWeight: 500,
        color: "text.primary",
        bgcolor: t.palette.mode === "dark" ? "surface.high" : "surface.card",
        boxShadow: t.shadows[1],
      }
    : { color: "text.secondary", "&:hover": { color: "text.primary", bgcolor: "surface.container" } }),
});

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
        dateHeading: "Followed on",
        defaultSort: "az",
        countTone: "negative",
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
            Requests still waiting are in Pending.
          </>
        ),
        recent: true,
        rows: toRows(
          activity?.follow_requests.filter((r) => r.status in STATUS_LABELS),
          (r) => ({ status: r.status }),
        ),
        source: "recent_follow_requests.json",
        dateVerb: "Requested",
        dateHeading: "Requested on",
        defaultSort: "newest",
        countTone: "neutral",
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
        label: "Pending",
        description:
          "Follow requests you've sent that haven't been accepted yet. You can withdraw one from that account's profile.",
        recent: false,
        rows: toRows(activity?.pending_requests),
        source: "pending_follow_requests.json",
        dateVerb: "Requested",
        dateHeading: "Requested on",
        defaultSort: "newest",
        countTone: "neutral",
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
        dateHeading: "Unfollowed on",
        defaultSort: "newest",
        countTone: "neutral",
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
    <Box id="results" sx={{ display: "flex", flexDirection: "column", gap: 2, scrollMarginTop: 128, minWidth: 0 }}>
      {/* Filter bar: list tabs, then search and list actions */}
      <Panel sx={{ p: 1.5, display: "flex", flexDirection: "column", gap: 1.5, bgcolor: "surface.low" }}>
        <Box
          role="tablist"
          aria-label="Result lists"
          sx={{
            display: "flex",
            gap: 0.5,
            p: 0.5,
            borderRadius: "10px",
            bgcolor: "surface.lowest",
            // Scroll sideways on small screens instead of stacking
            overflowX: "auto",
            scrollbarWidth: "none",
            "&::-webkit-scrollbar": { display: "none" },
          }}
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
                sx={segmentSx(selected)}
              >
                {t.label}
                {showCount && (
                  <Box
                    component="span"
                    sx={(th) => ({
                      px: 0.75,
                      borderRadius: 999,
                      fontFamily: MONO,
                      fontSize: 11,
                      lineHeight: "16px",
                      bgcolor: t.countTone === "neutral" ? "surface.high" : toneColor(th, t.countTone).bg,
                      color: t.countTone === "neutral" ? "text.secondary" : toneColor(th, t.countTone).fg,
                    })}
                  >
                    {t.rows.length.toLocaleString()}
                  </Box>
                )}
              </ButtonBase>
            );
          })}
        </Box>

        {!missingFromCache && (
          <Box sx={{ display: "flex", flexDirection: { xs: "column", sm: "row" }, alignItems: { sm: "center" }, gap: 1 }}>
            <Box
              sx={(t) => ({
                flex: 1,
                minWidth: 0,
                height: 34,
                display: "flex",
                alignItems: "center",
                gap: 1,
                px: 1.25,
                borderRadius: "8px",
                bgcolor: "surface.control",
                boxShadow: t.shadows[1],
                "&:focus-within": { boxShadow: `0 0 0 1px ${t.palette.text.primary}` },
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
                placeholder="Filter handles or names…"
                inputProps={{ "aria-label": "Filter accounts" }}
                sx={{ flex: 1, fontSize: 13 }}
              />
              <Box
                component="kbd"
                sx={{
                  display: { xs: "none", sm: "block" },
                  px: 0.75,
                  borderRadius: "4px",
                  bgcolor: "surface.container",
                  color: "text.muted",
                  fontSize: 11,
                  lineHeight: "18px",
                }}
              >
                /
              </Box>
            </Box>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, "& > button": { flex: { xs: 1, sm: "none" } } }}>
              <Select
                size="small"
                value={activeSort}
                onChange={(e) => {
                  setSort(e.target.value as SortKey);
                  setPage(1);
                }}
                inputProps={{ "aria-label": "Sort" }}
                sx={(t) => ({
                  flex: { xs: "1 1 100%", sm: "none" },
                  height: 34,
                  fontSize: 13,
                  bgcolor: "surface.control",
                  boxShadow: t.shadows[1],
                  "&:hover": { bgcolor: "surface.controlHover" },
                  "& .MuiOutlinedInput-notchedOutline": { border: "none" },
                })}
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
                sx={[ghostButtonSx, { height: 34 }]}
              >
                Copy all
              </Button>
              <Button
                size="small"
                startIcon={<DownloadIcon />}
                disabled={visibleRows.length === 0}
                onClick={downloadCSV}
                sx={[ghostButtonSx, { height: 34 }]}
              >
                Export CSV
              </Button>
            </Box>
          </Box>
        )}
      </Panel>

      <Box sx={{ px: 0.5, display: "flex", flexDirection: "column", gap: 0.5 }}>
        <Typography sx={{ fontSize: 13, color: "text.secondary", "& strong": { color: "text.primary", fontWeight: 600 } }}>
          {tab.description}
        </Typography>
        <Typography sx={{ fontSize: 12, color: "text.muted" }}>
          From <FileTag>{tab.source}</FileTag>
          {tab.recent && " • Instagram only includes roughly the last 90 days of this list."}
        </Typography>
      </Box>

      {missingFromCache ? (
        <Alert severity="info" variant="outlined">
          This saved result is from before this list was added. Upload a new export to see it.
        </Alert>
      ) : (
        <Panel sx={{ overflow: "hidden" }}>
          {/* Column headings */}
          <Box
            aria-hidden
            sx={(t) => ({
              ...rowGridSx,
              display: { xs: "none", md: "grid" },
              py: 1.25,
              bgcolor: t.palette.mode === "dark" ? "surface.lowest" : "surface.low",
              color: "text.muted",
              fontSize: 11,
              fontWeight: 500,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
            })}
          >
            <span>Account</span>
            <span>{tab.dateHeading}</span>
            <span>Status</span>
            <Box component="span" sx={{ textAlign: "right" }}>
              Actions
            </Box>
          </Box>

          <Box component="ul" sx={{ listStyle: "none", m: 0, p: 0 }}>
            {pageRows.length === 0 && (
              <Box component="li" sx={{ p: 5, textAlign: "center" }}>
                <Typography sx={{ fontSize: 14, color: "text.secondary" }}>
                  {query ? `No accounts match "${query}".` : "Nothing in this list."}
                </Typography>
              </Box>
            )}
            {pageRows.map((row, i) => {
              const badge = tab.badge(row);
              return (
                <Box
                  component="li"
                  key={`${row.username}:${i}`}
                  sx={(t) => ({
                    ...rowGridSx,
                    py: 1.75,
                    borderTop: i > 0 ? `1px solid ${t.palette.surface.border}` : "none",
                    transition: "background-color .15s",
                    "&:hover": { bgcolor: "surface.low" },
                  })}
                >
                  {/* Account */}
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, minWidth: 0 }}>
                    <RowAvatar row={row} />
                    <Box sx={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, minWidth: 0 }}>
                        <Link
                          href={row.profile_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          underline="hover"
                          noWrap
                          sx={{ fontSize: 14, fontWeight: 600, color: "text.primary" }}
                        >
                          @{row.username}
                        </Link>
                        <NorthEastIcon aria-hidden sx={{ fontSize: 13, color: "text.muted", flexShrink: 0 }} />
                      </Box>
                      {row.name && (
                        <Typography noWrap sx={{ fontSize: 12, color: "text.secondary" }}>
                          {row.name}
                        </Typography>
                      )}
                      <Mono sx={{ display: { md: "none" }, mt: 0.25, color: "text.muted" }}>
                        {row.date ? `${tab.dateVerb} ${fullDate(row.date)}` : "Date not in export"}
                      </Mono>
                    </Box>
                  </Box>

                  {/* Date */}
                  <Box sx={{ display: { xs: "none", md: "flex" }, flexDirection: "column", gap: 0.25 }}>
                    {row.date ? (
                      <>
                        <Mono sx={{ color: "text.primary", fontSize: 12 }}>{fullDate(row.date)}</Mono>
                        <Mono sx={{ color: "text.muted", fontSize: 10 }}>{relative(row.date)}</Mono>
                      </>
                    ) : (
                      <Mono sx={{ color: "text.muted" }}>Not in export</Mono>
                    )}
                  </Box>

                  {/* Status: under the account on phones */}
                  <Box sx={{ gridColumn: { xs: "1 / -1", md: "auto" }, gridRow: { xs: 2, md: "auto" }, pl: { xs: 6, md: 0 } }}>
                    <Pill tone={badge.tone}>{badge.label}</Pill>
                  </Box>

                  {/* Actions */}
                  <Box sx={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 0.5 }}>
                    <Tooltip title="Copy username">
                      <IconButton
                        size="small"
                        aria-label={`Copy @${row.username}`}
                        onClick={() => copy(row.username, `Copied @${row.username}`)}
                        sx={{
                          borderRadius: "6px",
                          color: "text.secondary",
                          "&:hover": { bgcolor: "surface.container", color: "text.primary" },
                        }}
                      >
                        <ContentCopyIcon sx={{ fontSize: 16 }} />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Box>
              );
            })}
          </Box>

          {/* Count and pagination */}
          {visibleRows.length > 0 && (
            <Box
              component="nav"
              aria-label="Pages"
              sx={(t) => ({
                px: { xs: 2, md: 3 },
                py: 1.5,
                bgcolor: t.palette.mode === "dark" ? "surface.lowest" : "surface.low",
                display: "flex",
                flexDirection: { xs: "column", sm: "row" },
                alignItems: "center",
                justifyContent: "space-between",
                gap: 1,
              })}
            >
              <Typography sx={{ fontSize: 12, color: "text.muted" }}>
                Showing{" "}
                <Box component="strong" sx={{ color: "text.primary", fontWeight: 600 }}>
                  {((currentPage - 1) * PAGE_SIZE + 1).toLocaleString()}–
                  {Math.min(currentPage * PAGE_SIZE, visibleRows.length).toLocaleString()}
                </Box>{" "}
                of{" "}
                <Box component="strong" sx={{ color: "text.primary", fontWeight: 600 }}>
                  {visibleRows.length.toLocaleString()}
                </Box>{" "}
                {visibleRows.length === 1 ? "account" : "accounts"}
                {pageCount > 1 && (
                  <Mono sx={{ ml: 1 }}>
                    • Page {currentPage} of {pageCount}
                  </Mono>
                )}
              </Typography>
              {pageCount > 1 && (
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                  <Button
                    size="small"
                    disabled={currentPage === 1}
                    onClick={() => setPage(currentPage - 1)}
                    sx={[ghostButtonSx, { minWidth: 0, height: 30 }]}
                  >
                    Previous
                  </Button>
                  {pageList(currentPage, pageCount).map((p, i) =>
                    p === "…" ? (
                      <Mono key={`gap-${i}`} sx={{ display: { xs: "none", sm: "inline" }, px: 0.5, color: "text.muted" }}>
                        …
                      </Mono>
                    ) : (
                      <ButtonBase
                        key={p}
                        aria-label={`Page ${p}`}
                        aria-current={p === currentPage ? "page" : undefined}
                        onClick={() => setPage(p)}
                        sx={{
                          display: { xs: p === currentPage ? "inline-flex" : "none", sm: "inline-flex" },
                          minWidth: 30,
                          height: 30,
                          px: 0.75,
                          borderRadius: "6px",
                          fontFamily: MONO,
                          fontSize: 12,
                          ...(p === currentPage
                            ? { bgcolor: "accent.container", color: "accent.onContainer", fontWeight: 600 }
                            : { color: "text.secondary", "&:hover": { bgcolor: "surface.container", color: "text.primary" } }),
                        }}
                      >
                        {p}
                      </ButtonBase>
                    ),
                  )}
                  <Button
                    size="small"
                    disabled={currentPage === pageCount}
                    onClick={() => setPage(currentPage + 1)}
                    sx={[ghostButtonSx, { minWidth: 0, height: 30 }]}
                  >
                    Next
                  </Button>
                </Box>
              )}
            </Box>
          )}
        </Panel>
      )}

      <Snackbar
        open={toast !== null}
        autoHideDuration={2500}
        onClose={() => setToast(null)}
        message={toast}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      />
    </Box>
  );
};
