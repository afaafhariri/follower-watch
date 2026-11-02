import { useCallback, useRef, useState } from "react";
import { UPLOAD_CONFIG } from "../config";
import { analyzeExport, ExportError } from "../lib/analyzeExport";
import type { AnalysisResult, UploadInfo } from "../types";

interface AnalysisHandlers {
  onStart: (file: File) => void;
  onSuccess: (result: AnalysisResult, info: UploadInfo) => void;
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
    return `File too large. Maximum size is ${UPLOAD_CONFIG.maxFileSizeMB}MB. Export only "Followers and following" to keep it small.`;

  return null;
};

// Lets the progress bar paint before the next synchronous step
const nextFrame = () => new Promise((resolve) => setTimeout(resolve, 0));

// Reads an export ZIP and analyzes it in the browser; the file never leaves the device
export const useExportAnalysis = (handlers: AnalysisHandlers) => {
  const [progress, setProgress] = useState(0);
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  const analyze = useCallback(async (file: File) => {
    const { onStart, onError } = handlersRef.current;

    const validationError = validateFile(file);
    if (validationError) {
      onError(validationError);
      return;
    }

    onStart(file);
    setProgress(10);

    const startedAt = performance.now();
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      setProgress(50);
      await nextFrame();

      const result = analyzeExport(bytes);
      const durationMs = Math.round(performance.now() - startedAt);
      setProgress(100);
      setTimeout(
        () => handlersRef.current.onSuccess(result, { name: file.name, size: file.size, durationMs }),
        300,
      );
    } catch (error) {
      setProgress(0);
      onError(
        error instanceof ExportError
          ? error.message
          : "Couldn't read this file. Please make sure it's the ZIP from your Instagram export.",
      );
    }
  }, []);

  return { analyze, progress };
};
