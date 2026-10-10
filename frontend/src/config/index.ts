// API configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || "/api";

export const API_ENDPOINTS = {
  analyze: `${API_BASE_URL}/analyze`,
  lastResult: `${API_BASE_URL}/last-result`,
  deleteResult: `${API_BASE_URL}/last-result`,
} as const;

export const AUTH_ENDPOINTS = {
  login: "/auth/google/login",
  me: "/auth/me",
  logout: "/auth/logout",
} as const;

// Retry configuration
export const RETRY_CONFIG = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 10000,
} as const;

export const UPLOAD_CONFIG = {
  maxFileSizeMB: 50,
  acceptedTypes: [".zip", "application/zip", "application/x-zip-compressed"],
} as const;
