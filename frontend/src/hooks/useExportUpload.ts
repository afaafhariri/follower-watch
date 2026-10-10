import { useCallback, useRef, useState } from "react";
import { RETRY_CONFIG, UPLOAD_CONFIG } from "../config";
import type { ApiError, UploadInfo } from "../types";

interface UploadHandlers {
  onStart: (file: File) => void;
  onSuccess: (result: unknown, info: UploadInfo) => void;
  onError: (error: string) => void;
}

const validateFile = (file: File): string | null => {
  const isZip =
    file.type === "application/zip" ||
    file.type === "application/x-zip-compressed" ||
    file.name.endsWith(".zip");

  if (!isZip) return "Please upload a ZIP file";

  const maxSize = UPLOAD_CONFIG.maxFileSizeMB * 1024 * 1024;
  if (file.size > maxSize)
    return `File too large. Maximum size is ${UPLOAD_CONFIG.maxFileSizeMB}MB`;

  return null;
};

const uploadWithRetry = async (
  apiEndpoint: string,
  file: File,
  retryCount = 0,
): Promise<unknown> => {
  try {
    const response = await fetch(apiEndpoint, {
      method: "POST",
      body: file,
      headers: { "Content-Type": "application/zip" },
    });

    const data = await response.json();

    if (!response.ok) {
      const errorData = data as ApiError;
      const error = new Error(errorData.error || "Upload failed");
      // 4xx means the file itself was rejected; retrying won't help
      if (response.status < 500) error.name = "ClientError";
      throw error;
    }

    return data;
  } catch (error) {
    const retryable = !(error instanceof Error && error.name === "ClientError");
    if (retryable && retryCount < RETRY_CONFIG.maxRetries) {
      const delay = Math.min(
        RETRY_CONFIG.baseDelay * Math.pow(2, retryCount),
        RETRY_CONFIG.maxDelay,
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
      return uploadWithRetry(apiEndpoint, file, retryCount + 1);
    }
    throw error;
  }
};

// Uploads an export ZIP and reports simulated progress while the server works
export const useExportUpload = (apiEndpoint: string, handlers: UploadHandlers) => {
  const [progress, setProgress] = useState(0);
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  const upload = useCallback(
    async (file: File) => {
      const { onStart, onError } = handlersRef.current;

      const validationError = validateFile(file);
      if (validationError) {
        onError(validationError);
        return;
      }

      onStart(file);
      setProgress(0);

      const progressInterval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      const startedAt = performance.now();
      try {
        const result = await uploadWithRetry(apiEndpoint, file);
        const durationMs = Math.round(performance.now() - startedAt);
        clearInterval(progressInterval);
        setProgress(100);
        setTimeout(
          () => handlersRef.current.onSuccess(result, { name: file.name, size: file.size, durationMs }),
          300,
        );
      } catch (error) {
        clearInterval(progressInterval);
        setProgress(0);
        handlersRef.current.onError(
          error instanceof Error ? error.message : "An unexpected error occurred. Please try again.",
        );
      }
    },
    [apiEndpoint],
  );

  return { upload, progress };
};
