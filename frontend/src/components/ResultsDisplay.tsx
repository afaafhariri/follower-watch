import { useMemo, useCallback } from "react";
import {
  Box,
  Typography,
  Button,
  Chip,
  Stack,
  Paper,
  Link,
} from "@mui/material";
import {
  DataGrid,
  type GridColDef,
  type GridRenderCellParams,
} from "@mui/x-data-grid";
import DownloadIcon from "@mui/icons-material/Download";
import RefreshIcon from "@mui/icons-material/Refresh";
import PersonOffIcon from "@mui/icons-material/PersonOff";
import PeopleIcon from "@mui/icons-material/People";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import type { AnalysisResult, NonFollower } from "../types";

interface ResultsDisplayProps {
  result: AnalysisResult;
  onReset: () => void;
}

interface GridRow extends NonFollower {
  id: number;
}

export const ResultsDisplay = ({ result, onReset }: ResultsDisplayProps) => {
  const rows: GridRow[] = useMemo(
    () =>
      result.non_followers.map((user, index) => ({
        id: index + 1,
        ...user,
      })),
    [result.non_followers],
  );

  const columns: GridColDef<GridRow>[] = useMemo(
    () => [
      {
        field: "id",
        headerName: "#",
        width: 70,
        sortable: false,
      },
      {
        field: "username",
        headerName: "Username",
        flex: 1,
        minWidth: 200,
        renderCell: (params: GridRenderCellParams<GridRow>) => (
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
      },
      {
        field: "profile_url",
        headerName: "Profile Link",
        flex: 1,
        minWidth: 250,
        renderCell: (params: GridRenderCellParams<GridRow>) => (
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
      },
      {
        field: "followed_at",
        headerName: "Followed Since",
        width: 150,
        renderCell: (params: GridRenderCellParams<GridRow>) => {
          if (!params.value) return "—";
          const date = new Date(params.value * 1000);
          return date.toLocaleDateString();
        },
      },
    ],
    [],
  );

  const downloadCSV = useCallback(() => {
    const headers = ["Username", "Profile URL", "Followed At"];
    const csvRows = [
      headers.join(","),
      ...result.non_followers.map((user) => {
        const followedAt = user.followed_at
          ? new Date(user.followed_at * 1000).toISOString()
          : "";
        return [
          `"${user.username}"`,
          `"${user.profile_url}"`,
          `"${followedAt}"`,
        ].join(",");
      }),
    ];

    const csvContent = csvRows.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "non_followers.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [result.non_followers]);

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

      {/* Action Buttons */}
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={2}
        sx={{ mb: 3 }}
        justifyContent="space-between"
        alignItems={{ xs: "stretch", sm: "center" }}
      >
        <Box>
          <Chip
            label={`${result.count} users don't follow you back`}
            color="error"
            variant="outlined"
            icon={<PersonOffIcon />}
          />
        </Box>
        <Stack direction="row" spacing={2}>
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

      {/* Results Table */}
      <Box sx={{ height: 500, width: "100%" }}>
        <DataGrid
          rows={rows}
          columns={columns}
          pageSizeOptions={[10, 25, 50, 100]}
          initialState={{
            pagination: {
              paginationModel: { pageSize: 25 },
            },
            sorting: {
              sortModel: [{ field: "username", sort: "asc" }],
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

      {/* Note */}
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ mt: 2, display: "block", textAlign: "center" }}
      >
        Click on any username to visit their Instagram profile
      </Typography>
    </Box>
  );
};
