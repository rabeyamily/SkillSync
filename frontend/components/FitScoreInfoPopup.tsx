"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export default function FitScoreInfoPopup() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;

    const checkAndShow = () => {
      // Clear any existing timer
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }

      // Check if there's a report in sessionStorage
      const hasReport = sessionStorage.getItem("last_report");
      if (!hasReport) {
        setIsVisible(false);
        return;
      }

      // Check if user has dismissed the popup for this report
      const dismissedReport = sessionStorage.getItem("fitScoreInfoDismissedForReport");
      const currentReport = sessionStorage.getItem("last_report");
      
      // If it's a new report (different from dismissed one), show popup again
      if (!dismissedReport || dismissedReport !== currentReport) {
        // Show popup after a short delay
        timer = setTimeout(() => {
          setIsVisible(true);
        }, 2000);
      } else {
        setIsVisible(false);
      }
    };

    // Check immediately
    checkAndShow();

    // Listen for storage changes (when new report is saved)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "last_report") {
        checkAndShow();
      }
    };

    window.addEventListener("storage", handleStorageChange);
    
    // Also check periodically in case storage event doesn't fire (same window)
    const interval = setInterval(checkAndShow, 2000);
    
    return () => {
      window.removeEventListener("storage", handleStorageChange);
      clearInterval(interval);
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, []);

  const handleDismiss = () => {
    setIsVisible(false);
    // Remember that user dismissed it for this specific report
    const currentReport = sessionStorage.getItem("last_report");
    if (currentReport) {
      sessionStorage.setItem("fitScoreInfoDismissedForReport", currentReport);
    }
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 animate-in slide-in-from-bottom-5 duration-300">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-blue-200 dark:border-blue-800 p-4 max-w-sm">
        <div className="flex items-start gap-3">
          {/* Info Icon Button */}
          <Link
            href="/about#fit-score-calculation"
            className="flex-shrink-0 mt-0.5"
            onClick={handleDismiss}
          >
            <div className="w-10 h-10 rounded-full flex items-center justify-center transition-colors cursor-pointer" style={{ background: 'linear-gradient(to bottom right, #0077b5, #00a0dc)' }}>
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </Link>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
              How is the Fit Score calculated?
            </h3>
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
              Learn how we calculate your fit score and what it means for your job application.
            </p>
            <Link
              href="/about#fit-score-calculation"
              className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
              onClick={handleDismiss}
            >
              Learn more →
            </Link>
          </div>

          {/* Close Button */}
          <button
            onClick={handleDismiss}
            className="flex-shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

