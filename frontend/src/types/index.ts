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

export type AppStatus = "idle" | "uploading" | "success" | "error";

export interface AppState {
  status: AppStatus;
  result: AnalysisResult | null;
  error: string | null;
}
