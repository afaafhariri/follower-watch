export const UPLOAD_CONFIG = {
  // Exports are read into memory in the browser, so keep phones comfortable.
  // A "Followers and following" JSON export is far smaller than this.
  maxFileSizeMB: 200,
  acceptedTypes: [".zip", "application/zip", "application/x-zip-compressed"],
} as const;
