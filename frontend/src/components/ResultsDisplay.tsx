import { useMemo, useCallback, useState, type ReactNode } from "react";
import {
  Alert,
  Box,
  Typography,
  Button,
  Chip,
  Stack,
  Paper,
  Link,
  Tabs,
  Tab,
} from "@mui/material";
import {
  DataGrid,
  type GridColDef,
  type GridRenderCellParams,
  type GridSortModel,
} from "@mui/x-data-grid";
import DownloadIcon from "@mui/icons-material/Download";
import RefreshIcon from "@mui/icons-material/Refresh";
import PersonOffIcon from "@mui/icons-material/PersonOff";
import PeopleIcon from "@mui/icons-material/People";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import SendIcon from "@mui/icons-material/Send";
import HourglassEmptyIcon from "@mui/icons-material/HourglassEmpty";
import PersonRemoveIcon from "@mui/icons-material/PersonRemove";
import type { AnalysisResult, FollowRequestStatus, Profile } from "../types";

interface ResultsDisplayProps {
  result: AnalysisResult;
  onReset: () => void;
}

type TabKey = "non_followers" | "follow_requests" | "pending_requests" | "unfollowed";

// One row shape for every list so the tables share column definitions
interface ListRow {
  id: number;
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
  icon: React.ReactElement;
  description: ReactNode;
  recent: boolean;
  rows: ListRow[];
  columns: GridColDef<ListRow>[];
  sortModel: GridSortModel;
  csvFile: string;
  csvHeaders: string[];
  csvRow: (row: ListRow) => (string | undefined)[];
}

const STATUS_LABELS: Record<FollowRequestStatus, string> = {
  accepted: "Accepted",
  pending: "Pending",
  not_accepted: "Not accepted",
};

const STATUS_COLORS: Record<FollowRequestStatus, "success" | "warning" | "default"> = {
  accepted: "success",
  pending: "warning",
  not_accepted: "default",
};

const formatDate = (ts?: number) => (ts ? new Date(ts * 1000).toLocaleDateString() : "—");
const isoDate = (ts?: number) => (ts ? new Date(ts * 1000).toISOString() : "");

const toRows = <T extends Profile>(
  items: T[] | undefined,
  extra: (item: T) => Partial<ListRow> = () => ({}),
): ListRow[] =>
  (items ?? []).map((item, index) => ({
    id: index + 1,
    username: item.username,
    name: item.name,
    profile_url: item.profile_url,
    date: item.timestamp,
    ...extra(item),
  }));

const idColumn: GridColDef<ListRow> = {
  field: "id",
  headerName: "#",
  width: 70,
  sortable: false,
};

const usernameColumn: GridColDef<ListRow> = {
  field: "username",
  headerName: "Username",
  flex: 1,
  minWidth: 180,
  renderCell: (params: GridRenderCellParams<ListRow>) => (
    <Link
      href={params.row.profile_url}
      target="_blank"
      rel="noopener noreferrer"
      sx={{
        color: "primary.main",
        textDecoration: "none",
        fontWeight: 500,
        "&:hover": {
          textDecoration: "underline",
        },
      }}
    >
      @{params.value}
    </Link>
  ),
};

const nameColumn: GridColDef<ListRow> = {
  field: "name",
  headerName: "Name",
  flex: 1,
  minWidth: 160,
  renderCell: (params: GridRenderCellParams<ListRow>) => params.value || "—",
};

const profileLinkColumn: GridColDef<ListRow> = {
  field: "profile_url",
  headerName: "Profile Link",
  flex: 1,
  minWidth: 250,
  renderCell: (params: GridRenderCellParams<ListRow>) => (
    <Link
      href={params.value}
      target="_blank"
      rel="noopener noreferrer"
      sx={{
        color: "text.secondary",
        fontSize: "0.875rem",
        "&:hover": {
          color: "primary.main",
        },
      }}
    >
      {params.value}
    </Link>
  ),
};

const dateColumn = (headerName: string): GridColDef<ListRow> => ({
  field: "date",
  headerName,
  width: 150,
  renderCell: (params: GridRenderCellParams<ListRow>) => formatDate(params.value),
});

const statusColumn: GridColDef<ListRow> = {
  field: "status",
  headerName: "Status",
  width: 150,
  valueGetter: (value: FollowRequestStatus) => STATUS_LABELS[value],
  renderCell: (params: GridRenderCellParams<ListRow>) =>
    params.row.status && (
      <Chip
        size="small"
        label={STATUS_LABELS[params.row.status]}
        color={STATUS_COLORS[params.row.status]}
        variant="outlined"
      />
    ),
};

const followsYouColumn: GridColDef<ListRow> = {
  field: "follows_you",
  headerName: "Follows you?",
  width: 140,
  renderCell: (params: GridRenderCellParams<ListRow>) => (
    <Chip
      size="small"
      label={params.value ? "Yes" : "No"}
      color={params.value ? "success" : "default"}
      variant="outlined"
    />
  ),
};

const byDateDesc: GridSortModel = [{ field: "date", sort: "desc" }];

export const ResultsDisplay = ({ result, onReset }: ResultsDisplayProps) => {
  const [activeTab, setActiveTab] = useState<TabKey>("non_followers");
  const activity = result.recent_activity;

  const tabs: ListTab[] = useMemo(
    () => [
      {
        key: "non_followers",
        label: "Don't follow back",
        icon: <PersonOffIcon />,
        description: "Accounts you follow that don't follow you back.",
        recent: false,
        rows: result.non_followers.map((user, index) => ({
          id: index + 1,
          username: user.username,
          profile_url: user.profile_url,
          date: user.followed_at,
        })),
        columns: [idColumn, usernameColumn, profileLinkColumn, dateColumn("Followed Since")],
        sortModel: [{ field: "username", sort: "asc" }],
        csvFile: "non_followers.csv",
        csvHeaders: ["Username", "Profile URL", "Followed At"],
        csvRow: (r) => [r.username, r.profile_url, isoDate(r.date)],
      },
      {
        key: "follow_requests",
        label: "Recent requests",
        icon: <SendIcon />,
        description: (
          <>
            Follow requests you sent recently. <strong>Accepted</strong>: you now follow them.{" "}
            <strong>Pending</strong>: still waiting. <strong>Not accepted</strong>: declined,
            withdrawn, or you've since unfollowed them.
          </>
        ),
        recent: true,
        rows: toRows(activity?.follow_requests, (r) => ({ status: r.status })),
        columns: [idColumn, usernameColumn, nameColumn, dateColumn("Requested"), statusColumn],
        sortModel: byDateDesc,
        csvFile: "recent_follow_requests.csv",
        csvHeaders: ["Username", "Name", "Profile URL", "Requested At", "Status"],
        csvRow: (r) => [
          r.username,
          r.name,
          r.profile_url,
          isoDate(r.date),
          r.status && STATUS_LABELS[r.status],
        ],
      },
      {
        key: "pending_requests",
        label: "Pending requests",
        icon: <HourglassEmptyIcon />,
        description:
          "Follow requests you've sent that haven't been accepted yet. You can withdraw one from that account's profile.",
        recent: false,
        rows: toRows(activity?.pending_requests),
        columns: [idColumn, usernameColumn, nameColumn, dateColumn("Requested")],
        sortModel: byDateDesc,
        csvFile: "pending_follow_requests.csv",
        csvHeaders: ["Username", "Name", "Profile URL", "Requested At"],
        csvRow: (r) => [r.username, r.name, r.profile_url, isoDate(r.date)],
      },
      {
        key: "unfollowed",
        label: "Unfollowed by you",
        icon: <PersonRemoveIcon />,
        description: (
          <>
            Accounts <strong>you</strong> unfollowed. This is not a list of people who unfollowed
            you; Instagram's export doesn't include that.
          </>
        ),
        recent: true,
        rows: toRows(activity?.unfollowed, (u) => ({ follows_you: u.follows_you })),
        columns: [idColumn, usernameColumn, nameColumn, dateColumn("Unfollowed"), followsYouColumn],
        sortModel: byDateDesc,
        csvFile: "recently_unfollowed.csv",
        csvHeaders: ["Username", "Name", "Profile URL", "Unfollowed At", "Follows You"],
        csvRow: (r) => [
          r.username,
          r.name,
          r.profile_url,
          isoDate(r.date),
          r.follows_you ? "Yes" : "No",
        ],
      },
    ],
    [result.non_followers, activity],
  );

  const tab = tabs.find((t) => t.key === activeTab) ?? tabs[0];
  const missingFromCache = tab.key !== "non_followers" && !activity;

  const downloadCSV = useCallback(() => {
    const escape = (value: string | undefined) => `"${(value ?? "").replace(/"/g, '""')}"`;
    const csvRows = [
      tab.csvHeaders.join(","),
      ...tab.rows.map((row) => tab.csvRow(row).map(escape).join(",")),
    ];

    const csvContent = csvRows.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", tab.csvFile);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [tab]);

  return (
    <Box sx={{ width: "100%" }}>
      {/* Stats Summary */}
      <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ mb: 3 }}>
        <Paper
          elevation={0}
          sx={{
            p: 2,
            flex: 1,
            textAlign: "center",
            bgcolor: "grey.50",
            border: "1px solid",
            borderColor: "grey.200",
            borderRadius: 2,
          }}
        >
          <PeopleIcon sx={{ color: "primary.main", fontSize: 32, mb: 1 }} />
          <Typography variant="h5" fontWeight="bold" color="primary">
            {result.total_followers.toLocaleString()}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Followers
          </Typography>
        </Paper>

        <Paper
          elevation={0}
          sx={{
            p: 2,
            flex: 1,
            textAlign: "center",
            bgcolor: "grey.50",
            border: "1px solid",
            borderColor: "grey.200",
            borderRadius: 2,
          }}
        >
          <PersonAddIcon
            sx={{ color: "secondary.main", fontSize: 32, mb: 1 }}
          />
          <Typography variant="h5" fontWeight="bold" color="secondary">
            {result.total_following.toLocaleString()}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Following
          </Typography>
        </Paper>

        <Paper
          elevation={0}
          sx={{
            p: 2,
            flex: 1,
            textAlign: "center",
            bgcolor: "error.50",
            border: "1px solid",
            borderColor: "error.200",
            borderRadius: 2,
          }}
        >
          <PersonOffIcon sx={{ color: "error.main", fontSize: 32, mb: 1 }} />
          <Typography variant="h5" fontWeight="bold" color="error">
            {result.count.toLocaleString()}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Non-Followers
          </Typography>
        </Paper>
      </Stack>

      {/* List Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 2 }}>
        <Tabs
          value={tab.key}
          onChange={(_, v: TabKey) => setActiveTab(v)}
          variant="scrollable"
          scrollButtons="auto"
          allowScrollButtonsMobile
        >
          {tabs.map((t) => (
            <Tab
              key={t.key}
              value={t.key}
              icon={t.icon}
              iconPosition="start"
              label={
                t.key !== "non_followers" && !activity
                  ? t.label
                  : `${t.label} (${t.rows.length})`
              }
              sx={{ minHeight: 48, textTransform: "none", fontWeight: 500 }}
            />
          ))}
        </Tabs>
      </Box>

      {/* Description and Actions */}
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={2}
        sx={{ mb: 2 }}
        justifyContent="space-between"
        alignItems={{ xs: "stretch", sm: "center" }}
      >
        <Box>
          <Typography variant="body2" color="text.secondary">
            {tab.description}
          </Typography>
          {tab.recent && (
            <Typography variant="caption" color="text.secondary">
              Instagram only includes roughly the last 90 days of this list.
            </Typography>
          )}
        </Box>
        <Stack direction="row" spacing={2} sx={{ flexShrink: 0 }}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={onReset}
          >
            Analyze Another File
          </Button>
          <Button
            variant="contained"
            startIcon={<DownloadIcon />}
            onClick={downloadCSV}
            disabled={tab.rows.length === 0}
            sx={{
              background: "linear-gradient(45deg, #E1306C 30%, #405DE6 90%)",
              "&:hover": {
                background: "linear-gradient(45deg, #C1285C 30%, #3050D6 90%)",
              },
            }}
          >
            Download CSV
          </Button>
        </Stack>
      </Stack>

      {missingFromCache ? (
        <Alert severity="info">
          This saved result is from before this list was added. Upload a new export to see it.
        </Alert>
      ) : (
        <Box sx={{ height: 500, width: "100%" }}>
          <DataGrid
            key={tab.key}
            rows={tab.rows}
            columns={tab.columns}
            pageSizeOptions={[10, 25, 50, 100]}
            initialState={{
              pagination: {
                paginationModel: { pageSize: 25 },
              },
              sorting: {
                sortModel: tab.sortModel,
              },
            }}
            disableRowSelectionOnClick
            sx={{
              border: "1px solid",
              borderColor: "grey.200",
              borderRadius: 2,
              "& .MuiDataGrid-columnHeaders": {
                bgcolor: "grey.50",
                borderBottom: "2px solid",
                borderColor: "grey.200",
              },
              "& .MuiDataGrid-row:hover": {
                bgcolor: "action.hover",
              },
              "& .MuiDataGrid-cell:focus": {
                outline: "none",
              },
              "& .MuiDataGrid-columnHeader:focus": {
                outline: "none",
              },
            }}
          />
        </Box>
      )}

      {/* Note */}
      <Alert severity="info" variant="outlined" sx={{ mt: 2 }}>
        Click on any username to visit their Instagram profile. If Instagram says{" "}
        <strong>"Sorry, this page isn't available"</strong>, the account has most likely been
        deactivated or deleted. It can also mean they changed their username since your export, or
        blocked you.
      </Alert>
    </Box>
  );
};
