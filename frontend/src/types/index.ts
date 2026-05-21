export interface NonFollower {
  username: string;
  profile_url: string;
  followed_at?: number;
}

export interface AnalysisResult {
  success: boolean;
  non_followers: NonFollower[];
  total_following: number;
  total_followers: number;
  count: number;
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

// --- Facebook types ---

export interface FacebookPerson {
  name: string;
  timestamp?: number;
}

export interface FacebookAnalysisResult {
  success: boolean;
  non_following_friends: FacebookPerson[];
  non_following_pages: FacebookPerson[];
  total_friends: number;
  total_following: number;
  total_followers: number;
  friends_count: number;
  pages_count: number;
  message?: string;
}

export interface FacebookCachedResultResponse {
  success: boolean;
  result?: FacebookAnalysisResult;
  cached_at?: number;
  error?: string;
}

export interface FacebookAppState {
  status: AppStatus;
  result: FacebookAnalysisResult | null;
  error: string | null;
  cachedAt: number | null;
}
