import type { ReactNode } from "react";
import { Box, keyframes, type SxProps, type Theme } from "@mui/material";
import { alpha } from "@mui/material/styles";
import AddBoxOutlinedIcon from "@mui/icons-material/AddBoxOutlined";
import AppsOutlinedIcon from "@mui/icons-material/AppsOutlined";
import ArrowBackIosNewIcon from "@mui/icons-material/ArrowBackIosNew";
import BadgeOutlinedIcon from "@mui/icons-material/BadgeOutlined";
import BookmarkBorderIcon from "@mui/icons-material/BookmarkBorder";
import CampaignOutlinedIcon from "@mui/icons-material/CampaignOutlined";
import CheckBoxIcon from "@mui/icons-material/CheckBox";
import CheckBoxOutlineBlankIcon from "@mui/icons-material/CheckBoxOutlineBlank";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import CloudUploadOutlinedIcon from "@mui/icons-material/CloudUploadOutlined";
import ExploreOutlinedIcon from "@mui/icons-material/ExploreOutlined";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import FolderSharedOutlinedIcon from "@mui/icons-material/FolderSharedOutlined";
import HistoryIcon from "@mui/icons-material/History";
import HomeOutlinedIcon from "@mui/icons-material/HomeOutlined";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import ManageAccountsOutlinedIcon from "@mui/icons-material/ManageAccountsOutlined";
import ManageSearchIcon from "@mui/icons-material/ManageSearch";
import MenuIcon from "@mui/icons-material/Menu";
import MovieOutlinedIcon from "@mui/icons-material/MovieOutlined";
import NotificationsNoneIcon from "@mui/icons-material/NotificationsNone";
import PhoneIphoneOutlinedIcon from "@mui/icons-material/PhoneIphoneOutlined";
import SaveAltIcon from "@mui/icons-material/SaveAlt";
import SearchIcon from "@mui/icons-material/Search";
import SendOutlinedIcon from "@mui/icons-material/SendOutlined";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";
import TimerOutlinedIcon from "@mui/icons-material/TimerOutlined";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";

// Simplified drawings of the Instagram screens the export guide walks
// through. They are decorative (the step captions carry the instructions)
// and drawn in the app's own palette so they follow the light/dark theme.

type HighlightTone = "accent" | "warning";

const toSxArray = (sx?: SxProps<Theme>) => (Array.isArray(sx) ? sx : [sx]);

const ripple = keyframes`
  0% { box-shadow: 0 0 0 0 var(--ring); }
  70%, 100% { box-shadow: 0 0 0 7px transparent; }
`;

// Pulsing outline around the control the step asks you to tap
const Target = ({
  children,
  tone = "accent",
  sx,
}: {
  children: ReactNode;
  tone?: HighlightTone;
  sx?: SxProps<Theme>;
}) => (
  <Box
    sx={[
      (t) => {
        const c = tone === "warning" ? t.palette.state.warning : t.palette.accent.primary;
        return {
          position: "relative",
          zIndex: 1,
          borderRadius: "8px",
          outline: `2px solid ${c}`,
          outlineOffset: "1px",
          bgcolor: alpha(c, 0.1),
          "--ring": alpha(c, 0.45),
          animation: `${ripple} 1.8s ease-out infinite`,
          "@media (prefers-reduced-motion: reduce)": { animation: "none" },
        };
      },
      ...toSxArray(sx),
    ]}
  >
    {children}
  </Box>
);

// --- Device frames ---------------------------------------------------------

export const PhoneFrame = ({ children }: { children: ReactNode }) => (
  <Box
    sx={(t) => ({
      width: 212,
      height: 404,
      flexShrink: 0,
      p: "6px",
      borderRadius: "34px",
      bgcolor: t.palette.mode === "dark" ? "surface.highest" : "#18181B",
      boxShadow: t.shadows[2],
    })}
  >
    <Box
      sx={{
        position: "relative",
        height: "100%",
        borderRadius: "28px",
        overflow: "hidden",
        bgcolor: "surface.card",
        color: "text.primary",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Box
        sx={{
          height: 28,
          flexShrink: 0,
          px: 2.5,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          fontSize: 9,
          fontWeight: 600,
        }}
      >
        <span>9:41</span>
        <Box
          sx={{
            position: "absolute",
            top: 7,
            left: "50%",
            transform: "translateX(-50%)",
            width: 60,
            height: 17,
            borderRadius: 999,
            bgcolor: "#000",
          }}
        />
        <Box
          sx={{
            width: 15,
            height: 7,
            p: "1px",
            borderRadius: "2px",
            border: "1px solid",
            borderColor: "text.muted",
          }}
        >
          <Box sx={{ width: "70%", height: "100%", borderRadius: "1px", bgcolor: "text.primary" }} />
        </Box>
      </Box>
      <Box sx={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>{children}</Box>
    </Box>
  </Box>
);

// `wide` screens fill the window; the rest sit in a centered dialog, the way
// Accounts Center shows the export flow on the web
export const BrowserFrame = ({ url, wide, children }: { url: string; wide?: boolean; children: ReactNode }) => (
  <Box
    sx={(t) => ({
      width: "100%",
      maxWidth: 480,
      height: 300,
      borderRadius: "12px",
      overflow: "hidden",
      bgcolor: "surface.card",
      color: "text.primary",
      boxShadow: t.shadows[2],
      outline: `1px solid ${t.palette.surface.border}`,
      display: "flex",
      flexDirection: "column",
    })}
  >
    <Box
      sx={{
        height: 30,
        flexShrink: 0,
        px: 1.25,
        display: "flex",
        alignItems: "center",
        gap: 1,
        bgcolor: "surface.container",
      }}
    >
      <Box sx={{ display: "flex", gap: 0.5, width: 33 }}>
        {[0, 1, 2].map((i) => (
          <Box key={i} sx={{ width: 7, height: 7, borderRadius: "50%", bgcolor: "surface.highest" }} />
        ))}
      </Box>
      <Box
        sx={{
          flex: 1,
          maxWidth: 240,
          mx: "auto",
          height: 18,
          borderRadius: 999,
          bgcolor: "surface.card",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 0.5,
          fontSize: 9,
          color: "text.muted",
          whiteSpace: "nowrap",
          overflow: "hidden",
        }}
      >
        <LockOutlinedIcon sx={{ fontSize: 9 }} />
        {url}
      </Box>
      <Box sx={{ width: 33 }} />
    </Box>
    {wide ? (
      <Box sx={{ flex: 1, minHeight: 0, display: "flex" }}>{children}</Box>
    ) : (
      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          p: 1.25,
          display: "flex",
          justifyContent: "center",
          bgcolor: "surface.lowest",
        }}
      >
        <Box
          sx={(t) => ({
            width: "100%",
            maxWidth: 250,
            borderRadius: "12px",
            overflow: "hidden",
            bgcolor: "surface.card",
            boxShadow: t.shadows[2],
            display: "flex",
            flexDirection: "column",
          })}
        >
          {children}
        </Box>
      </Box>
    )}
  </Box>
);

// --- Building blocks --------------------------------------------------------

const ScreenHeader = ({ title }: { title: string }) => (
  <Box sx={{ px: 1.25, py: 1, flexShrink: 0, display: "flex", alignItems: "center", gap: 0.75 }}>
    <ArrowBackIosNewIcon sx={{ fontSize: 11 }} />
    <Box sx={{ fontSize: 11, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
      {title}
    </Box>
  </Box>
);

const Body = ({ children }: { children: ReactNode }) => (
  <Box sx={{ flex: 1, minHeight: 0, px: 1.25, pb: 1.25, display: "flex", flexDirection: "column", gap: 1 }}>
    {children}
  </Box>
);

// Placeholder line standing in for text the step doesn't care about
const Bar = ({ w, h = 5 }: { w: number | string; h?: number }) => (
  <Box sx={{ width: w, height: h, flexShrink: 0, borderRadius: 999, bgcolor: "surface.high" }} />
);

const Group = ({ label, children }: { label?: string; children: ReactNode }) => (
  <Box>
    {label && <Box sx={{ mb: 0.5, px: 0.25, fontSize: 8.5, fontWeight: 600, color: "text.muted" }}>{label}</Box>}
    <Box sx={{ p: "2px", borderRadius: "10px", bgcolor: "surface.container", display: "flex", flexDirection: "column" }}>
      {children}
    </Box>
  </Box>
);

const Chevron = () => <ChevronRightIcon />;

const Row = ({
  label,
  hint,
  icon,
  trailing = <Chevron />,
  highlight,
  tone,
}: {
  label: string;
  hint?: string;
  icon?: ReactNode;
  trailing?: ReactNode;
  highlight?: boolean;
  tone?: HighlightTone;
}) => {
  const row = (
    <Box
      sx={{
        minHeight: 30,
        px: 1,
        py: 0.75,
        display: "flex",
        alignItems: "center",
        gap: 0.875,
        "& > svg": { fontSize: 14, color: "text.secondary", flexShrink: 0 },
      }}
    >
      {icon}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Box sx={{ fontSize: 10, fontWeight: 500, lineHeight: 1.3 }}>{label}</Box>
        {hint && <Box sx={{ mt: 0.125, fontSize: 8, lineHeight: 1.3, color: "text.muted" }}>{hint}</Box>}
      </Box>
      {trailing}
    </Box>
  );
  return highlight ? <Target tone={tone}>{row}</Target> : row;
};

const Value = ({ children }: { children: ReactNode }) => (
  <Box sx={{ display: "flex", alignItems: "center", fontSize: 9, fontWeight: 600, color: "text.secondary" }}>
    {children}
    <ChevronRightIcon sx={{ fontSize: 14, color: "text.muted" }} />
  </Box>
);

const Check = ({ checked }: { checked?: boolean }) =>
  checked ? (
    <CheckBoxIcon sx={{ fontSize: 15, color: "primary.main" }} />
  ) : (
    <CheckBoxOutlineBlankIcon sx={{ fontSize: 15, color: "text.muted" }} />
  );

const MockButton = ({
  children,
  primary,
  highlight,
  sx,
}: {
  children: ReactNode;
  primary?: boolean;
  highlight?: boolean;
  sx?: SxProps<Theme>;
}) => {
  const button = (
    <Box
      sx={{
        height: 26,
        px: 1,
        borderRadius: "8px",
        display: "grid",
        placeItems: "center",
        fontSize: 9.5,
        fontWeight: 600,
        whiteSpace: "nowrap",
        ...(primary
          ? { bgcolor: "primary.main", color: "primary.contrastText" }
          : { bgcolor: "surface.container", color: "text.primary" }),
      }}
    >
      {children}
    </Box>
  );
  return highlight ? <Target sx={sx}>{button}</Target> : <Box sx={sx}>{button}</Box>;
};

const Avatar = ({ size }: { size: number }) => (
  <Box sx={{ width: size, height: size, flexShrink: 0, borderRadius: "50%", bgcolor: "surface.highest" }} />
);

// --- Mobile app screens ----------------------------------------------------

const PROFILE_STATS = [
  ["128", "posts"],
  ["1,204", "followers"],
  ["987", "following"],
];

export const ProfileScreen = () => (
  <>
    <Box sx={{ px: 1.25, py: 0.75, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <Box sx={{ fontSize: 11, fontWeight: 700 }}>your_username</Box>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <AddBoxOutlinedIcon sx={{ fontSize: 16 }} />
        <Target sx={{ p: "2px", display: "grid", placeItems: "center", borderRadius: "6px" }}>
          <MenuIcon sx={{ fontSize: 16 }} />
        </Target>
      </Box>
    </Box>
    <Box sx={{ px: 1.25, py: 0.5, display: "flex", alignItems: "center", gap: 1.5 }}>
      <Avatar size={46} />
      <Box sx={{ flex: 1, display: "flex", justifyContent: "space-around" }}>
        {PROFILE_STATS.map(([n, label]) => (
          <Box key={label} sx={{ textAlign: "center" }}>
            <Box sx={{ fontSize: 10, fontWeight: 700 }}>{n}</Box>
            <Box sx={{ fontSize: 8, color: "text.muted" }}>{label}</Box>
          </Box>
        ))}
      </Box>
    </Box>
    <Box sx={{ px: 1.25, py: 0.75, display: "flex", flexDirection: "column", gap: 0.5 }}>
      <Bar w={70} />
      <Bar w={130} />
    </Box>
    <Box sx={{ px: 1.25, display: "flex", gap: 0.5, "& > *": { flex: 1 } }}>
      <MockButton>Edit profile</MockButton>
      <MockButton>Share profile</MockButton>
    </Box>
    <Box
      sx={{
        mt: 1.25,
        flex: 1,
        minHeight: 0,
        overflow: "hidden",
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        alignContent: "start",
        gap: "2px",
      }}
    >
      {Array.from({ length: 9 }, (_, i) => (
        <Box key={i} sx={{ aspectRatio: "1", bgcolor: "surface.high" }} />
      ))}
    </Box>
    <Box
      sx={{
        height: 36,
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-around",
        borderTop: "1px solid",
        borderColor: "divider",
        "& svg": { fontSize: 16 },
      }}
    >
      <HomeOutlinedIcon />
      <SearchIcon />
      <AddBoxOutlinedIcon />
      <MovieOutlinedIcon />
      <Box sx={{ p: "1px", borderRadius: "50%", border: "1.5px solid", borderColor: "text.primary" }}>
        <Avatar size={13} />
      </Box>
    </Box>
  </>
);

export const SettingsScreen = () => (
  <>
    <ScreenHeader title="Settings and activity" />
    <Body>
      <Box
        sx={{
          height: 22,
          px: 1,
          borderRadius: "8px",
          bgcolor: "surface.container",
          display: "flex",
          alignItems: "center",
          gap: 0.5,
          fontSize: 9,
          color: "text.muted",
        }}
      >
        <SearchIcon sx={{ fontSize: 12 }} />
        Search
      </Box>
      <Group label="Your account">
        <Row
          icon={<ManageAccountsOutlinedIcon />}
          label="Accounts Center"
          hint="Password, security, personal details, ad preferences"
          highlight
        />
      </Group>
      <Group label="How you use Instagram">
        <Row icon={<BookmarkBorderIcon />} label="Saved" />
        <Row icon={<HistoryIcon />} label="Archive" />
        <Row icon={<NotificationsNoneIcon />} label="Notifications" />
        <Row icon={<TimerOutlinedIcon />} label="Time management" />
      </Group>
    </Body>
  </>
);

export const AccountsCenterScreen = () => (
  <>
    <ScreenHeader title="Accounts Center" />
    <Body>
      <Group>
        <Row icon={<Avatar size={14} />} label="Profiles" hint="your_username" />
      </Group>
      <Group label="Account settings">
        <Row icon={<LockOutlinedIcon />} label="Password and security" />
        <Row icon={<BadgeOutlinedIcon />} label="Personal details" />
        <Row icon={<FolderSharedOutlinedIcon />} label="Your information and permissions" highlight />
        <Row icon={<CampaignOutlinedIcon />} label="Ad preferences" />
      </Group>
    </Body>
  </>
);

export const InfoPermissionsScreen = () => (
  <>
    <ScreenHeader title="Your information and permissions" />
    <Body>
      <Group>
        <Row icon={<VisibilityOutlinedIcon />} label="Access your information" />
        <Row icon={<SaveAltIcon />} label="Export your information" highlight />
        <Row icon={<ManageSearchIcon />} label="Search history" />
        <Row icon={<AppsOutlinedIcon />} label="Your activity off Meta technologies" />
      </Group>
    </Body>
  </>
);

// --- Export flow (same on mobile and web) ---------------------------------

export const CreateExportScreen = () => (
  <>
    <ScreenHeader title="Export your information" />
    <Body>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
        <Bar w="90%" />
        <Bar w="70%" />
      </Box>
      <MockButton primary highlight>
        Create export
      </MockButton>
      <Group label="Current activity">
        <Row label="No exports yet" hint="Exports you create show up here" trailing={null} />
      </Group>
    </Body>
  </>
);

export const DestinationScreen = () => (
  <>
    <ScreenHeader title="Choose where to export" />
    <Body>
      <Group>
        <Row
          icon={<PhoneIphoneOutlinedIcon />}
          label="Export to device"
          hint="Download a ZIP file to your phone or computer"
          highlight
        />
        <Row icon={<CloudUploadOutlinedIcon />} label="Export to external service" hint="Send to a cloud service" />
      </Group>
    </Body>
  </>
);

export const CustomizeScreen = () => (
  <>
    <ScreenHeader title="Customize information" />
    <Body>
      <Group label="Your Instagram activity">
        <Row label="Messages" trailing={<Check />} />
        <Row label="Likes" trailing={<Check />} />
      </Group>
      <Group label="Connections">
        <Row label="Followers and following" trailing={<Check checked />} highlight />
        <Row label="Contacts" trailing={<Check />} />
      </Group>
      <MockButton primary sx={{ mt: "auto" }}>
        Save
      </MockButton>
    </Body>
  </>
);

export const ConfirmScreen = ({ focus }: { focus: "format" | "start" }) => (
  <>
    <ScreenHeader title="Confirm your export" />
    <Body>
      <Group>
        <Row label="Customize information" hint="Followers and following" />
        <Row label="Date range" trailing={<Value>All time</Value>} highlight={focus === "format"} />
        <Row label="Format" trailing={<Value>JSON</Value>} highlight={focus === "format"} tone="warning" />
        <Row label="Media quality" trailing={<Value>Medium</Value>} />
      </Group>
      <MockButton primary highlight={focus === "start"} sx={{ mt: "auto" }}>
        Start export
      </MockButton>
    </Body>
  </>
);

// --- Web screens -------------------------------------------------------------

const NavItem = ({
  icon,
  label,
  active,
  highlight,
  collapsed,
}: {
  icon?: ReactNode;
  label: string;
  active?: boolean;
  highlight?: boolean;
  // Hide the label; left out, it shows from the sm breakpoint up
  collapsed?: boolean;
}) => {
  const item = (
    <Box
      sx={{
        px: 0.75,
        py: 0.625,
        borderRadius: "6px",
        display: "flex",
        alignItems: "center",
        gap: 0.75,
        fontSize: 9.5,
        lineHeight: 1.25,
        fontWeight: active ? 700 : 500,
        ...(active && { bgcolor: "surface.container" }),
        "& svg": { fontSize: 14, flexShrink: 0 },
      }}
    >
      {icon}
      <Box
        component="span"
        sx={{ display: collapsed === undefined ? { xs: "none", sm: "inline" } : collapsed ? "none" : "inline" }}
      >
        {label}
      </Box>
    </Box>
  );
  return highlight ? <Target sx={{ borderRadius: "6px" }}>{item}</Target> : item;
};

const WEB_NAV: [ReactNode, string][] = [
  [<HomeOutlinedIcon key="home" />, "Home"],
  [<SearchIcon key="search" />, "Search"],
  [<ExploreOutlinedIcon key="explore" />, "Explore"],
  [<MovieOutlinedIcon key="reels" />, "Reels"],
  [<SendOutlinedIcon key="messages" />, "Messages"],
  [<FavoriteBorderIcon key="notifications" />, "Notifications"],
  [<AddBoxOutlinedIcon key="create" />, "Create"],
];

const WebSidebar = ({ collapsed, children }: { collapsed?: boolean; children?: ReactNode }) => (
  <Box
    sx={{
      position: "relative",
      flexShrink: 0,
      p: 0.75,
      borderRight: "1px solid",
      borderColor: "divider",
      display: "flex",
      flexDirection: "column",
      gap: 0.25,
    }}
  >
    {WEB_NAV.map(([icon, label]) => (
      <NavItem key={label} icon={icon} label={label} collapsed={collapsed} />
    ))}
    {children ?? <Box sx={{ mt: "auto" }}><NavItem icon={<MenuIcon />} label="More" collapsed={collapsed} /></Box>}
  </Box>
);

export const WebHomeScreen = () => (
  <>
    <WebSidebar>
      <Box sx={{ mt: "auto" }}>
        <NavItem icon={<MenuIcon />} label="More" highlight />
      </Box>
      <Box
        sx={(t) => ({
          position: "absolute",
          left: 6,
          bottom: 40,
          zIndex: 2,
          width: 120,
          p: 0.5,
          borderRadius: "10px",
          bgcolor: "surface.card",
          boxShadow: t.shadows[2],
          outline: `1px solid ${t.palette.surface.border}`,
          display: "flex",
          flexDirection: "column",
          gap: 0.25,
        })}
      >
        <NavItem icon={<SettingsOutlinedIcon />} label="Settings" highlight collapsed={false} />
        <NavItem icon={<HistoryIcon />} label="Your activity" collapsed={false} />
        <NavItem icon={<BookmarkBorderIcon />} label="Saved" collapsed={false} />
        <NavItem label="Log out" collapsed={false} />
      </Box>
    </WebSidebar>
    <Box sx={{ flex: 1, minWidth: 0, pt: 1.5, display: "flex", justifyContent: "center" }}>
      <Box sx={{ width: 150, display: "flex", flexDirection: "column", gap: 0.75 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
          <Avatar size={18} />
          <Bar w={60} />
        </Box>
        <Box sx={{ aspectRatio: "1", borderRadius: "4px", bgcolor: "surface.high" }} />
        <Bar w={110} />
        <Bar w={80} />
      </Box>
    </Box>
  </>
);

const PageTitle = ({ title, hint }: { title: string; hint?: string }) => (
  <Box sx={{ mb: 0.75 }}>
    <Box sx={{ fontSize: 11, fontWeight: 700 }}>{title}</Box>
    {hint && <Box sx={{ mt: 0.25, fontSize: 8, lineHeight: 1.3, color: "text.muted" }}>{hint}</Box>}
  </Box>
);

const ContentPlaceholder = () => (
  <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}>
    <Bar w="80%" />
    <Bar w="60%" />
    <Box sx={{ mt: 0.5, height: 40, borderRadius: "8px", bgcolor: "surface.container" }} />
    <Box sx={{ height: 40, borderRadius: "8px", bgcolor: "surface.container" }} />
  </Box>
);

export const WebSettingsScreen = () => (
  <>
    <WebSidebar collapsed />
    <Box
      sx={{
        width: { xs: 130, sm: 160 },
        flexShrink: 0,
        p: 1.25,
        borderRight: "1px solid",
        borderColor: "divider",
        display: "flex",
        flexDirection: "column",
        gap: 1,
      }}
    >
      <PageTitle title="Settings" />
      <Target sx={{ borderRadius: "10px" }}>
        <Box sx={{ p: 1, borderRadius: "10px", bgcolor: "surface.container" }}>
          <Box sx={{ fontSize: 10, fontWeight: 600 }}>Accounts Center</Box>
          <Box sx={{ mt: 0.25, fontSize: 8, lineHeight: 1.3, color: "text.muted" }}>
            Password, security, personal details, ad preferences
          </Box>
        </Box>
      </Target>
      <Box sx={{ fontSize: 8.5, fontWeight: 600, color: "text.muted" }}>How you use Instagram</Box>
      <Box>
        <NavItem label="Edit profile" active collapsed={false} />
        <NavItem label="Notifications" collapsed={false} />
      </Box>
    </Box>
    <Box sx={{ flex: 1, minWidth: 0, p: 1.5, overflow: "hidden" }}>
      <PageTitle title="Edit profile" />
      <ContentPlaceholder />
    </Box>
  </>
);

const AccountsCenterNav = ({ highlight }: { highlight?: boolean }) => (
  <Box
    sx={{
      width: { xs: 140, sm: 170 },
      flexShrink: 0,
      p: 1.25,
      borderRight: "1px solid",
      borderColor: "divider",
      display: "flex",
      flexDirection: "column",
      gap: 0.25,
    }}
  >
    <PageTitle title="Accounts Center" hint="Manage your connected experiences and account settings" />
    <NavItem icon={<Avatar size={12} />} label="Profiles" collapsed={false} />
    <Box sx={{ mt: 0.75, mb: 0.25, fontSize: 8.5, fontWeight: 600, color: "text.muted" }}>Account settings</Box>
    <NavItem icon={<LockOutlinedIcon />} label="Password and security" collapsed={false} />
    <NavItem icon={<BadgeOutlinedIcon />} label="Personal details" collapsed={false} />
    <NavItem
      icon={<FolderSharedOutlinedIcon />}
      label="Your information and permissions"
      highlight={highlight}
      active={!highlight}
      collapsed={false}
    />
    <NavItem icon={<CampaignOutlinedIcon />} label="Ad preferences" collapsed={false} />
  </Box>
);

export const WebAccountsCenterScreen = () => (
  <>
    <AccountsCenterNav highlight />
    <Box sx={{ flex: 1, minWidth: 0, p: 1.5, overflow: "hidden" }}>
      <PageTitle title="Accounts Center" />
      <ContentPlaceholder />
    </Box>
  </>
);

export const WebInfoPermissionsScreen = () => (
  <>
    <AccountsCenterNav />
    <Box sx={{ flex: 1, minWidth: 0, p: 1.5, overflow: "hidden" }}>
      <PageTitle title="Your information and permissions" />
      <Group>
        <Row label="Access your information" />
        <Row label="Export your information" highlight />
        <Row label="Search history" />
      </Group>
    </Box>
  </>
);
