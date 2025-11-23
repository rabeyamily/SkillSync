"use client";

import { useCallback, useState, useRef, useEffect } from "react";
import apiClient from "@/services/api";
import { UploadResumeResponse, TextInputResponse } from "@/utils/types";
import { LoadingSpinner, ErrorDisplay } from "./LoadingStates";

interface FileUploadProps {
  label: string;
  sourceType: "resume" | "job_description";
  onUploadSuccess: (fileId: string, filename: string) => void;
  onTextSubmit: (textId: string) => void;
  maxSizeMB?: number;
  acceptedTypes?: string[];
}

export default function FileUpload({
  label,
  sourceType,
  onUploadSuccess,
  onTextSubmit,
  maxSizeMB = 10,
  acceptedTypes = [".pdf", ".docx", ".txt"],
}: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [uploadedFile, setUploadedFile] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [textInput, setTextInput] = useState("");
  const [submittingText, setSubmittingText] = useState(false);
  const [submittedTextId, setSubmittedTextId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textSubmitTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const handleTextSubmitRef = useRef<(() => Promise<void>) | null>(null);

  const validateFile = (file: File): string | null => {
    // Check file type
    const fileExtension = "." + file.name.split(".").pop()?.toLowerCase();
    if (!acceptedTypes.includes(fileExtension)) {
      return `File type not supported. Accepted types: ${acceptedTypes.join(", ")}`;
    }

    // Check file size
    const fileSizeMB = file.size / (1024 * 1024);
    if (fileSizeMB > maxSizeMB) {
      return `File size exceeds ${maxSizeMB}MB limit`;
    }

    return null;
  };

  const uploadFile = async (file: File) => {
    setUploading(true);
    setProgress(0);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("source_type", sourceType);

      const response = await apiClient.post<UploadResumeResponse>(
        "/api/upload/upload-resume",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
          onUploadProgress: (progressEvent) => {
            if (progressEvent.total) {
              const percentCompleted = Math.round(
                (progressEvent.loaded * 100) / progressEvent.total
              );
              setProgress(percentCompleted);
            }
          },
        }
      );

      setUploadedFile({
        id: response.data.file_id,
        name: response.data.filename,
      });
      onUploadSuccess(response.data.file_id, response.data.filename);
      setProgress(100);
      
      // Clear text input when file is uploaded
      setTextInput("");
      setSubmittedTextId(null);
      if (textSubmitTimeoutRef.current) {
        clearTimeout(textSubmitTimeoutRef.current);
        textSubmitTimeoutRef.current = null;
      }
      
      // Store file ID in sessionStorage for fallback
      // Use consistent keys: 'resume_file_id' or 'jd_file_id' (not 'job_description_file_id')
      const fileIdKey = sourceType === 'job_description' ? 'jd_file_id' : `${sourceType}_file_id`;
      sessionStorage.setItem(fileIdKey, response.data.file_id);
      // Also store with sourceType key for backward compatibility
      sessionStorage.setItem(`${sourceType}_file_id`, response.data.file_id);
      
      // Parse file in the background (non-blocking)
      // Don't await - let it happen asynchronously
      apiClient.post(`/api/parse/parse/${response.data.file_id}`)
        .then(() => {
          // After parsing completes, fetch and store the text
          return apiClient.get(`/api/parse/parse/${response.data.file_id}/text`);
        })
        .then((textResponse) => {
          if (textResponse.data.text) {
            // Store with both key formats for compatibility
            const textKey = sourceType === 'job_description' ? 'jd_text' : `${sourceType}_text`;
            sessionStorage.setItem(`${textKey}_${response.data.file_id}`, textResponse.data.text);
            sessionStorage.setItem(textKey, textResponse.data.text);
            // Also store with sourceType for backward compatibility
            sessionStorage.setItem(`${sourceType}_text_${response.data.file_id}`, textResponse.data.text);
            sessionStorage.setItem(`${sourceType}_text`, textResponse.data.text);
          }
        })
        .catch((parseErr) => {
          // If parsing fails, that's okay - we'll rely on file ID
          // Only log in development to avoid console noise
          if (process.env.NODE_ENV === 'development') {
            console.log(`[FileUpload] Could not fetch parsed text for ${response.data.file_id}:`, parseErr);
          }
        });
    } catch (err: any) {
      setError(
        err.response?.data?.detail || "Failed to upload file. Please try again."
      );
      setProgress(0);
    } finally {
      setUploading(false);
    }
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) {
        const file = files[0];
        const validationError = validateFile(file);
        if (validationError) {
          setError(validationError);
          return;
        }
        uploadFile(file);
      }
    },
    []
  );

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      const validationError = validateFile(file);
      if (validationError) {
        setError(validationError);
        return;
      }
      uploadFile(file);
    }
  };

  const handleTextSubmit = useCallback(async () => {
    if (!textInput.trim() || textInput.trim().length < 10) {
      return; // Don't submit if text is too short
    }

    // Prevent multiple submissions of the same text
    const currentStoredText = submittedTextId 
      ? sessionStorage.getItem(`${sourceType}_text_${submittedTextId}`)
      : null;
    
    if (submittedTextId && textInput.trim() === currentStoredText) {
      return; // Already submitted this text
    }

    // Check if we're already submitting
    if (submittingText) {
      return; // Already in progress
    }

    setSubmittingText(true);
    setError(null);

    // Add timeout to prevent hanging (10 seconds)
    const timeout = 10000;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await apiClient.post<TextInputResponse>(
        "/api/text/text",
        {
          text: textInput,
          source_type: sourceType,
        },
        {
          signal: controller.signal,
          timeout: timeout,
        }
      );

      clearTimeout(timeoutId);

      // Clear any pending timeout
      if (textSubmitTimeoutRef.current) {
        clearTimeout(textSubmitTimeoutRef.current);
        textSubmitTimeoutRef.current = null;
      }

      setSubmittedTextId(response.data.text_id);
      onTextSubmit(response.data.text_id);
      // Don't clear textInput - keep it editable
      
      // Clear uploaded file when text is submitted
      setUploadedFile(null);
      setProgress(0);
      
      // Store text content in sessionStorage as fallback
      // Use consistent keys: 'resume_text' or 'jd_text' (not 'job_description_text')
      const textKey = sourceType === 'job_description' ? 'jd_text' : `${sourceType}_text`;
      sessionStorage.setItem(`${textKey}_${response.data.text_id}`, textInput);
      sessionStorage.setItem(textKey, textInput);
      // Also store with sourceType for backward compatibility
      sessionStorage.setItem(`${sourceType}_text_${response.data.text_id}`, textInput);
      sessionStorage.setItem(`${sourceType}_text`, textInput);
      setSubmittingText(false);
      setError(null); // Clear any previous errors on success
    } catch (err: any) {
      clearTimeout(timeoutId);
      
      // Handle timeout
      if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
        setError("Text submission timed out. Please try again.");
      } else {
        setError(
          err.response?.data?.detail || "Failed to submit text. Please try again."
        );
      }
      
      // Reset submitting state on error
      setSubmittingText(false);
    }
  }, [textInput, sourceType, onTextSubmit, submittedTextId]);

  // Update ref whenever handleTextSubmit changes
  useEffect(() => {
    handleTextSubmitRef.current = handleTextSubmit;
  }, [handleTextSubmit]);

  // Auto-submit text with debounce
  useEffect(() => {
    // Clear any existing timeout
    if (textSubmitTimeoutRef.current) {
      clearTimeout(textSubmitTimeoutRef.current);
      textSubmitTimeoutRef.current = null;
    }

    // Don't auto-submit if already submitted with same text
    const currentStoredText = submittedTextId 
      ? sessionStorage.getItem(`${sourceType}_text_${submittedTextId}`)
      : null;
    
    // If text matches what was already submitted, don't do anything
    if (currentStoredText === textInput.trim() && submittedTextId) {
      return; // Already submitted this exact text - no need to resubmit
    }

    // Only auto-submit if:
    // - Text is valid (at least 10 chars)
    // - Not currently submitting
    // - No file uploaded
    // - Text hasn't been submitted yet or has changed
    // - Not already in a success state
    if (
      textInput.trim().length >= 10 &&
      !submittingText &&
      !uploadedFile &&
      textInput.trim() !== currentStoredText &&
      !submittedTextId // Only auto-submit if we don't have a submittedTextId yet
    ) {
      // Debounce: wait 1.5 seconds after user stops typing
      textSubmitTimeoutRef.current = setTimeout(() => {
        // Double-check conditions before submitting
        if (handleTextSubmitRef.current && !submittingText && !submittedTextId) {
          handleTextSubmitRef.current();
        }
      }, 1500);
    }

    // Cleanup timeout on unmount or when dependencies change
    return () => {
      if (textSubmitTimeoutRef.current) {
        clearTimeout(textSubmitTimeoutRef.current);
        textSubmitTimeoutRef.current = null;
      }
    };
  }, [textInput, submittingText, uploadedFile, submittedTextId, sourceType]);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setTextInput(newValue);
    
    // Only reset submitted ID if text actually changed from what was submitted
    if (submittedTextId) {
      const currentStoredText = sessionStorage.getItem(`${sourceType}_text_${submittedTextId}`);
      if (newValue.trim() !== currentStoredText) {
        // Text changed, so reset submitted ID
        setSubmittedTextId(null);
        setError(null); // Clear error when user starts typing new text
      }
    } else {
      setError(null); // Clear error when typing
    }
  };

  const handleClear = () => {
    setUploadedFile(null);
    setTextInput("");
    setSubmittedTextId(null);
    setError(null);
    setProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    if (textSubmitTimeoutRef.current) {
      clearTimeout(textSubmitTimeoutRef.current);
    }
  };

  return (
    <div className="space-y-4">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        {label}
      </label>

      {/* File Upload Area */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => {
              // Make entire box clickable to trigger file upload
              if (!uploadedFile && !uploading && !submittingText) {
                fileInputRef.current?.click();
              }
            }}
            className={`relative border-2 border-dashed rounded-lg p-2 transition-all duration-300 max-w-md mx-auto ${
              isDragging
                ? "border-blue-600 bg-blue-50 dark:bg-blue-900/20 shadow-lg"
                : uploadedFile || uploading || submittingText
                ? "border-gray-300 dark:border-gray-700"
                : "border-gray-300 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-600 hover:shadow-md cursor-pointer"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept={acceptedTypes.join(",")}
              onChange={handleFileSelect}
              className="hidden"
              disabled={uploading || submittingText}
            />

            {uploadedFile ? (
              <div className="text-center">
                <div className="flex items-center justify-center">
                  <svg
                    className="h-6 w-6 text-blue-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <p className="mt-1 text-xs font-medium text-gray-900 dark:text-white truncate">
                  {uploadedFile.name}
                </p>
                <button
                  onClick={(e) => {
                    e.stopPropagation(); // Prevent triggering file input
                    handleClear();
                  }}
                  className="mt-1 text-xs text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                >
                  Clear
                </button>
              </div>
            ) : uploading ? (
              <div className="text-center">
                <LoadingSpinner size="sm" text="" />
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                  <div
                    className="h-full transition-all duration-300"
                    style={{ background: 'linear-gradient(to right, #0077b5, #00a0dc)', width: `${progress}%` }}
                  ></div>
                </div>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  {progress}%
                </p>
              </div>
            ) : (
              <div className="text-center">
                <svg
                  className="mx-auto h-6 w-6 text-gray-400"
                  stroke="currentColor"
                  fill="none"
                  viewBox="0 0 48 48"
                >
                  <path
                    d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <div className="mt-1 flex text-xs leading-4 text-gray-600 dark:text-gray-400 justify-center flex-wrap">
                  <span className="font-semibold text-blue-600 dark:text-blue-400">
                    Click to upload
                  </span>
                  <span className="pl-1">or drag</span>
                </div>
                <p className="mt-0.5 text-xs leading-3 text-gray-500 dark:text-gray-500">
                  {acceptedTypes.join(", ")} up to {maxSizeMB}MB
                </p>
              </div>
            )}
          </div>

      {/* Divider */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-300 dark:border-gray-700"></div>
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="bg-white px-2 text-gray-500 dark:bg-gray-900 dark:text-gray-400">
            OR
          </span>
        </div>
      </div>

      {/* Text Input Button */}
      <div className="flex justify-center">
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          disabled={uploading || submittingText || !!uploadedFile}
          className="rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 shadow-sm hover:border-blue-600 dark:hover:border-blue-500 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-blue-600 dark:hover:text-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 disabled:bg-gray-100 dark:disabled:bg-gray-900 disabled:cursor-not-allowed transition-colors"
        >
          {submittedTextId && !submittingText ? (
            <span className="flex items-center justify-center font-mono">
              <svg className="h-5 w-5 text-blue-500 mr-1.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Enter {sourceType === "resume" ? "Resume" : "Job Description"}
            </span>
          ) : (
            <span className="font-mono">Enter {sourceType === "resume" ? "Resume" : "Job Description"}</span>
          )}
        </button>
      </div>

      {/* Modal for Text Input */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
              onClick={() => setIsModalOpen(false)}
            ></div>

            {/* Modal */}
            <div className="relative transform overflow-hidden rounded-lg bg-gradient-to-br from-blue-50 via-blue-100/80 to-blue-50 dark:from-gray-800 dark:via-blue-950/30 dark:to-blue-950/20 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-2xl">
              {/* Header */}
              <div className="bg-gradient-to-br from-blue-50 via-blue-100/80 to-blue-50 dark:from-gray-800 dark:via-blue-950/30 dark:to-blue-950/20 px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold leading-6 text-gray-900 dark:text-white font-mono">
                    Enter {sourceType === "resume" ? "Resume" : "Job Description"}
                  </h3>
                  <button
                    onClick={() => setIsModalOpen(false)}
                    className="rounded-md text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2"
                  >
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Body */}
              <div className="bg-gradient-to-br from-blue-50 via-blue-100/80 to-blue-50 dark:from-gray-800 dark:via-blue-950/30 dark:to-blue-950/20 px-4 pb-4 sm:p-6 sm:pt-0">
                <textarea
                  id={`text-input-${sourceType}`}
                  rows={12}
                  value={textInput}
                  onChange={handleTextChange}
                  disabled={uploading || submittingText || !!uploadedFile}
                  placeholder={`Enter your ${sourceType === "resume" ? "resume" : "job description"} text here...`}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-600 focus:ring-blue-600 dark:border-gray-700 dark:bg-gray-900 dark:text-white sm:text-sm disabled:bg-gray-100 dark:disabled:bg-gray-900 transition-colors px-3 py-2"
                />
                <div className="mt-3 flex items-center justify-between">
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {textInput.length} characters
                    {submittingText && (
                      <span className="ml-2 text-blue-600 dark:text-blue-400">
                        • Submitting...
                      </span>
                    )}
                  </p>
                </div>
              </div>

              {/* Footer */}
              <div className="bg-gradient-to-br from-blue-50 via-blue-100/80 to-blue-50 dark:from-gray-800 dark:via-blue-950/30 dark:to-blue-950/20 px-4 py-3 sm:flex sm:justify-center sm:gap-3 sm:px-6">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="mt-3 inline-flex justify-center rounded-md px-5 py-1.5 text-sm font-semibold text-white shadow-sm hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 sm:mt-0 font-mono transition-opacity"
                  style={{ backgroundColor: '#0077b5' }}
                >
                  Done
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTextInput("");
                    setSubmittedTextId(null);
                    setIsModalOpen(false);
                  }}
                  className="mt-3 inline-flex justify-center rounded-md bg-white dark:bg-gray-800 px-5 py-1.5 text-sm font-semibold text-gray-900 dark:text-gray-300 shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 sm:mt-0 font-mono"
                >
                  Clear
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error Message - Only show if not in success state */}
      {error && !uploadedFile && (
        <ErrorDisplay
          message={error}
          onRetry={() => {
            setError(null);
            setUploading(false);
            setProgress(0);
            if (fileInputRef.current) {
              fileInputRef.current.click();
            }
          }}
          retryText="Try Again"
        />
      )}
    </div>
  );
}

