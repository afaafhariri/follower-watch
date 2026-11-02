export interface NonFollower {
  username: string;
  profile_url: string;
  followed_at?: number;
}

export interface Profile {
  username: string;
  name?: string;
  profile_url: string;
  timestamp?: number;
}

export type FollowRequestStatus = "accepted" | "not_accepted";

export interface FollowRequest extends Profile {
  status: FollowRequestStatus;
}

export interface UnfollowedProfile extends Profile {
  follows_you: boolean;
}

// Lists Meta only keeps for roughly the last 90 days
export interface RecentActivity {
  follow_requests: FollowRequest[];
  pending_requests: Profile[];
  unfollowed: UnfollowedProfile[];
}

export interface AnalysisResult {
  success: boolean;
  non_followers: NonFollower[];
  total_following: number;
  total_followers: number;
  count: number;
  // Always set by analyzeExport; optional so results saved by an older version still load
  recent_activity?: RecentActivity;
}

export type AppStatus = "idle" | "uploading" | "success" | "error";

// The file behind a result analyzed in this session (not known for saved results)
export interface UploadInfo {
  name: string;
  size: number;
  durationMs: number;
}

export interface AppState {
  status: AppStatus;
  result: AnalysisResult | null;
  error: string | null;
  cachedAt: number | null;
  upload: UploadInfo | null;
}
