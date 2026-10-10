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

export type FollowRequestStatus = "accepted" | "pending" | "not_accepted";

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
  // Missing from results cached before these lists were added
  recent_activity?: RecentActivity;
  message?: string;
}

export interface ApiError {
  success: false;
  error: string;
}

export interface CachedResultResponse {
  success: boolean;
  result?: AnalysisResult;
  cached_at?: number;
  error?: string;
}

export type AppStatus = "idle" | "uploading" | "success" | "error";

export interface AppState {
  status: AppStatus;
  result: AnalysisResult | null;
  error: string | null;
  cachedAt: number | null;
}

export interface UserInfo {
  email: string;
  name: string;
  picture: string;
}

export interface AuthState {
  authenticated: boolean;
  user: UserInfo | null;
  loading: boolean;
}
