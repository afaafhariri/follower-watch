import { useMemo, useCallback } from "react";
import {
  Box,
  Typography,
  Button,
  Chip,
  Stack,
  Paper,
  Divider,
} from "@mui/material";
import { DataGrid, type GridColDef, type GridRenderCellParams } from "@mui/x-data-grid";
import DownloadIcon from "@mui/icons-material/Download";
import RefreshIcon from "@mui/icons-material/Refresh";
import PersonOffIcon from "@mui/icons-material/PersonOff";
import PeopleIcon from "@mui/icons-material/People";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import GroupIcon from "@mui/icons-material/Group";
import type { FacebookAnalysisResult, FacebookPerson } from "../types";

interface FacebookResultsDisplayProps {
  result: FacebookAnalysisResult;
  onReset: () => void;
}

interface GridRow extends FacebookPerson {
  id: number;
}

const FB_GRADIENT = "linear-gradient(45deg, #1877F2 30%, #4267B2 90%)";
const FB_GRADIENT_HOVER = "linear-gradient(45deg, #1260CC 30%, #335490 90%)";

const buildColumns = (): GridColDef<GridRow>[] => [
  { field: "id", headerName: "#", width: 60, sortable: false },
  {
    field: "name",
    headerName: "Name",
    flex: 1,
    minWidth: 200,
    renderCell: (params: GridRenderCellParams<GridRow>) => (
      <Typography variant="body2" fontWeight={500}>
        {params.value}
      </Typography>
    ),
  },
  {
    field: "timestamp",
    headerName: "Date Added",
    width: 150,
    renderCell: (params: GridRenderCellParams<GridRow>) => {
      if (!params.value) return "—";
      return new Date(params.value * 1000).toLocaleDateString();
    },
  },
];

const gridSx = {
  border: "1px solid",
  borderColor: "divider",
  borderRadius: 2,
  "& .MuiDataGrid-columnHeaders": {
    borderBottom: "2px solid",
    borderColor: "divider",
  },
  "& .MuiDataGrid-row:hover": { bgcolor: "action.hover" },
  "& .MuiDataGrid-cell:focus": { outline: "none" },
  "& .MuiDataGrid-columnHeader:focus": { outline: "none" },
};

export const FacebookResultsDisplay = ({
  result,
  onReset,
}: FacebookResultsDisplayProps) => {
  const columns = useMemo(() => buildColumns(), []);

  const friendRows: GridRow[] = useMemo(
    () =>
      (result.non_following_friends ?? []).map((p, i) => ({ id: i + 1, ...p })),
    [result.non_following_friends],
  );

  const pageRows: GridRow[] = useMemo(
    () =>
      (result.non_following_pages ?? []).map((p, i) => ({ id: i + 1, ...p })),
    [result.non_following_pages],
  );

  const downloadCSV = useCallback(
    (rows: GridRow[], filename: string) => {
      const headers = ["Name", "Date Added"];
      const csvRows = [
        headers.join(","),
        ...rows.map((r) => {
          const date = r.timestamp
            ? new Date(r.timestamp * 1000).toISOString()
            : "";
          return [`"${r.name}"`, `"${date}"`].join(",");
        }),
      ];
      const blob = new Blob([csvRows.join("\n")], {
        type: "text/csv;charset=utf-8;",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    },
    [],
  );

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
            bgcolor: "action.hover",
            border: "1px solid",
            borderColor: "divider",
            borderRadius: 2,
          }}
        >
          <GroupIcon sx={{ color: "#1877F2", fontSize: 32, mb: 1 }} />
          <Typography variant="h5" fontWeight="bold" sx={{ color: "#1877F2" }}>
            {result.total_friends.toLocaleString()}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Total Friends
          </Typography>
        </Paper>

        <Paper
          elevation={0}
          sx={{
            p: 2,
            flex: 1,
            textAlign: "center",
            bgcolor: "action.hover",
            border: "1px solid",
            borderColor: "divider",
            borderRadius: 2,
          }}
        >
          <PeopleIcon sx={{ color: "secondary.main", fontSize: 32, mb: 1 }} />
          <Typography variant="h5" fontWeight="bold" color="secondary">
            {result.total_followers.toLocaleString()}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Total Followers
          </Typography>
        </Paper>

        <Paper
          elevation={0}
          sx={{
            p: 2,
            flex: 1,
            textAlign: "center",
            bgcolor: "action.hover",
            border: "1px solid",
            borderColor: "divider",
            borderRadius: 2,
          }}
        >
          <PersonAddIcon sx={{ color: "primary.main", fontSize: 32, mb: 1 }} />
          <Typography variant="h5" fontWeight="bold" color="primary">
            {result.total_following.toLocaleString()}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Total Following
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
            {(result.friends_count + result.pages_count).toLocaleString()}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Not Following Back
          </Typography>
        </Paper>
      </Stack>

      {/* Action row */}
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={2}
        sx={{ mb: 4 }}
        justifyContent="space-between"
        alignItems={{ xs: "stretch", sm: "center" }}
      >
        <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
          <Chip
            label={`${result.friends_count} friend${result.friends_count !== 1 ? "s" : ""} not following back`}
            color="warning"
            variant="outlined"
            icon={<PersonOffIcon />}
            size="small"
          />
          <Chip
            label={`${result.pages_count} page${result.pages_count !== 1 ? "s" : ""} not following back`}
            color="error"
            variant="outlined"
            icon={<PersonOffIcon />}
            size="small"
          />
        </Stack>
        <Button variant="outlined" startIcon={<RefreshIcon />} onClick={onReset}>
          Analyze Another File
        </Button>
      </Stack>

      {/* List A — Friends not following back */}
      <Paper
        elevation={0}
        sx={{
          mb: 4,
          border: "1px solid",
          borderColor: "divider",
          borderRadius: 2,
          overflow: "hidden",
        }}
      >
        <Box
          sx={{
            px: 3,
            py: 2,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            bgcolor: "action.hover",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <GroupIcon sx={{ color: "#1877F2" }} />
            <Typography variant="subtitle1" fontWeight={600}>
              Friends who do not follow you back
            </Typography>
            <Chip
              label={result.friends_count}
              size="small"
              sx={{ bgcolor: "#1877F2", color: "white", fontWeight: 600 }}
            />
          </Box>
          <Button
            size="small"
            variant="contained"
            startIcon={<DownloadIcon />}
            onClick={() => downloadCSV(friendRows, "fb_non_following_friends.csv")}
            disabled={friendRows.length === 0}
            sx={{
              background: FB_GRADIENT,
              "&:hover": { background: FB_GRADIENT_HOVER },
            }}
          >
            CSV
          </Button>
        </Box>
        <Divider />
        {friendRows.length === 0 ? (
          <Box sx={{ p: 4, textAlign: "center" }}>
            <Typography color="text.secondary">
              All your friends follow you back!
            </Typography>
          </Box>
        ) : (
          <Box sx={{ height: 400 }}>
            <DataGrid
              rows={friendRows}
              columns={columns}
              pageSizeOptions={[10, 25, 50, 100]}
              initialState={{
                pagination: { paginationModel: { pageSize: 25 } },
                sorting: { sortModel: [{ field: "name", sort: "asc" }] },
              }}
              disableRowSelectionOnClick
              sx={gridSx}
            />
          </Box>
        )}
      </Paper>

      {/* List B — Pages/People not following back */}
      <Paper
        elevation={0}
        sx={{
          border: "1px solid",
          borderColor: "divider",
          borderRadius: 2,
          overflow: "hidden",
        }}
      >
        <Box
          sx={{
            px: 3,
            py: 2,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            bgcolor: "action.hover",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <PersonAddIcon sx={{ color: "primary.main" }} />
            <Typography variant="subtitle1" fontWeight={600}>
              Pages / People you follow who do not follow you back
            </Typography>
            <Chip
              label={result.pages_count}
              size="small"
              color="primary"
              sx={{ fontWeight: 600 }}
            />
          </Box>
          <Button
            size="small"
            variant="contained"
            startIcon={<DownloadIcon />}
            onClick={() => downloadCSV(pageRows, "fb_non_following_pages.csv")}
            disabled={pageRows.length === 0}
            sx={{
              background: FB_GRADIENT,
              "&:hover": { background: FB_GRADIENT_HOVER },
            }}
          >
            CSV
          </Button>
        </Box>
        <Divider />
        {pageRows.length === 0 ? (
          <Box sx={{ p: 4, textAlign: "center" }}>
            <Typography color="text.secondary">
              Everyone you follow also follows you back!
            </Typography>
          </Box>
        ) : (
          <Box sx={{ height: 400 }}>
            <DataGrid
              rows={pageRows}
              columns={columns}
              pageSizeOptions={[10, 25, 50, 100]}
              initialState={{
                pagination: { paginationModel: { pageSize: 25 } },
                sorting: { sortModel: [{ field: "name", sort: "asc" }] },
              }}
              disableRowSelectionOnClick
              sx={gridSx}
            />
          </Box>
        )}
      </Paper>
    </Box>
  );
};
