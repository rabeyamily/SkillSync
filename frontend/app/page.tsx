"use client";

import { useState, useEffect, useCallback } from "react";
import FileUpload from "@/components/FileUpload";
import apiClient, { isAuthenticated, getProfile, getCV, downloadCV, uploadFile } from "@/services/api";
import {
  SkillGapReport,
  SkillMatch,
  Skill,
  FitScoreBreakdown,
  SkillExtractionResult,
  CourseRecommendation,
} from "@/utils/types";
import {
  SkillTag,
} from "@/components/Charts";
import {
  RetryableError,
} from "@/components/LoadingStates";
import { exportToCSV, downloadCSV, downloadPDF } from "@/utils/export";
import { generatePDFReport, generatePDFReportFromIds } from "@/services/api";

export default function Home() {
  const [resumeFileId, setResumeFileId] = useState<string | null>(null);
  const [resumeFileName, setResumeFileName] = useState<string | null>(null);
  const [resumeTextId, setResumeTextId] = useState<string | null>(null);
  const [cvInfo, setCvInfo] = useState<{ filename: string; file_type: string } | null>(null);
  const [jdFileId, setJdFileId] = useState<string | null>(null);
  const [jdTextId, setJdTextId] = useState<string | null>(null);
  const [canAnalyze, setCanAnalyze] = useState(false);
  const [report, setReport] = useState<SkillGapReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [downloadingPDF, setDownloadingPDF] = useState(false);
  const [downloadingCSV, setDownloadingCSV] = useState(false);
  const [resumeSkills, setResumeSkills] = useState<SkillExtractionResult | null>(null);
  const [jdSkills, setJdSkills] = useState<SkillExtractionResult | null>(null);

  const loadSkillsFromSession = useCallback(
    (id: string | null, baseKey: "resume_skills" | "jd_skills"): SkillExtractionResult | null => {
      if (typeof window === "undefined") return null;
      const candidates = [
        id ? `${baseKey}_${id}` : null,
        `last_${baseKey}`,
        sessionStorage.getItem("current_resume_id") && baseKey === "resume_skills"
          ? `${baseKey}_${sessionStorage.getItem("current_resume_id")}`
          : null,
        sessionStorage.getItem("current_jd_id") && baseKey === "jd_skills"
          ? `${baseKey}_${sessionStorage.getItem("current_jd_id")}`
          : null,
      ].filter(Boolean) as string[];

      for (const key of candidates) {
        const raw = sessionStorage.getItem(key);
        if (raw) {
          try {
            return JSON.parse(raw) as SkillExtractionResult;
          } catch (e) {
            console.warn(`Failed to parse stored ${baseKey} for key ${key}:`, e);
          }
        }
      }
      return null;
    },
    []
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const storedResumeSkills = loadSkillsFromSession(
        sessionStorage.getItem("current_resume_id"),
        "resume_skills"
      );
      const storedJdSkills = loadSkillsFromSession(
        sessionStorage.getItem("current_jd_id"),
        "jd_skills"
      );
      if (storedResumeSkills) {
        setResumeSkills(storedResumeSkills);
      }
      if (storedJdSkills) {
        setJdSkills(storedJdSkills);
      }
    } catch (e) {
      console.warn("Failed to restore skills from session storage:", e);
    }
  }, [loadSkillsFromSession]);

  const handleResumeUpload = (fileId: string, filename: string) => {
    setResumeFileId(fileId);
    setResumeFileName(filename);
    setResumeTextId(null);
  };

  const handleResumeText = (textId: string) => {
    setResumeTextId(textId);
    setResumeFileId(null);
    setResumeFileName(null);
  };

  const handleResumeClear = () => {
    setResumeFileId(null);
    setResumeFileName(null);
    setResumeTextId(null);
  };

  const handleJDUpload = (fileId: string, filename: string) => {
    setJdFileId(fileId);
    setJdTextId(null);
  };

  const handleJDText = (textId: string) => {
    setJdTextId(textId);
    setJdFileId(null);
  };

  useEffect(() => {
    const hasResume = !!(resumeFileId || resumeTextId);
    const hasJD = !!(jdFileId || jdTextId);
    setCanAnalyze(hasResume && hasJD);
  }, [resumeFileId, resumeTextId, jdFileId, jdTextId]);

  // Restore report and IDs from sessionStorage when component mounts
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    try {
      const storedReport = sessionStorage.getItem('last_report');
      const storedResumeId = sessionStorage.getItem('last_report_resume_id');
      const storedJdId = sessionStorage.getItem('last_report_jd_id');
      
      // Restore report if we have one stored
      if (storedReport) {
        try {
          const parsedReport = JSON.parse(storedReport);
          setReport(parsedReport);
        } catch (parseError) {
          console.warn('Failed to parse stored report:', parseError);
        }
      }
      
      // Restore IDs if they exist and aren't already set
      if (storedResumeId && !resumeFileId && !resumeTextId) {
        // Check if it's a file ID or text ID by checking sessionStorage
        const resumeText = sessionStorage.getItem(`resume_text_${storedResumeId}`);
        if (resumeText) {
          setResumeTextId(storedResumeId);
        } else {
          setResumeFileId(storedResumeId);
        }
      }
      
      // Check for JD file ID directly from sessionStorage (in case it wasn't stored in last_report_jd_id)
      if (!jdFileId && !jdTextId) {
        const directJdFileId = sessionStorage.getItem('jd_file_id') || 
                               sessionStorage.getItem('job_description_file_id');
        if (directJdFileId) {
          setJdFileId(directJdFileId);
        }
      }
      
      if (storedJdId && !jdFileId && !jdTextId) {
        const jdText = sessionStorage.getItem(`jd_text_${storedJdId}`) || 
                       sessionStorage.getItem(`job_description_text_${storedJdId}`);
        if (jdText) {
          setJdTextId(storedJdId);
        } else {
          setJdFileId(storedJdId);
        }
      }
    } catch (e) {
      console.warn('Failed to restore report from sessionStorage:', e);
    }
  }, []); // Only run on mount

  // Auto-load profile CV if user is logged in and has uploaded a CV
  useEffect(() => {
    const loadProfileCV = async () => {
      // Only load if user is authenticated and no resume is already set
      if (!isAuthenticated() || resumeFileId || resumeTextId) {
        return;
      }

      try {
        // Check if user has a CV in their profile
        const profile = await getProfile();
        if (!profile.has_cv) {
          return; // No CV uploaded in profile
        }

        // Get CV info first to determine filename and type
        const cvInfo = await getCV();
        const filename = cvInfo.filename || `resume.${cvInfo.file_type || 'pdf'}`;
        
        // Download the CV from profile
        const cvBlob = await downloadCV();
        
        // Determine MIME type from file type
        const mimeTypeMap: Record<string, string> = {
          'pdf': 'application/pdf',
          'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'txt': 'text/plain'
        };
        const mimeType = mimeTypeMap[cvInfo.file_type] || cvBlob.type || 'application/pdf';
        
        // Convert blob to File
        const cvFile = new File([cvBlob], filename, {
          type: mimeType,
        });

        // Upload the CV to the analysis endpoint
        const uploadResponse = await uploadFile(cvFile, "resume");
        
        // Set the resume file ID and filename
        setResumeFileId(uploadResponse.file_id);
        setResumeFileName(filename);
        setCvInfo(cvInfo);
        setResumeTextId(null);
        
        console.log('Profile CV automatically loaded:', uploadResponse.file_id, filename);
      } catch (err: any) {
        // Silently fail - user can still upload manually
        console.log('Could not auto-load profile CV:', err.message);
      }
    };

    // Handle auth changes (login/logout)
    const handleAuthChanged = () => {
      if (isAuthenticated()) {
        // User logged in - load CV if not already loaded
        if (!resumeFileId && !resumeTextId) {
          loadProfileCV();
        }
      } else {
        // User logged out - clear CV immediately
        setResumeFileId(null);
        setResumeTextId(null);
        setResumeFileName(null);
        setCvInfo(null);
        
        // Also clear sessionStorage data related to resume
        if (typeof window !== 'undefined') {
          sessionStorage.removeItem('resume_file_id');
          sessionStorage.removeItem('current_resume_id');
          sessionStorage.removeItem('resume_text');
          sessionStorage.removeItem('current_resume_text');
          sessionStorage.removeItem('last_resume_skills');
          sessionStorage.removeItem('last_report_resume_id');
          // Clear all resume-related sessionStorage keys
          const keysToRemove: string[] = [];
          for (let i = 0; i < sessionStorage.length; i++) {
            const key = sessionStorage.key(i);
            if (key && (key.startsWith('resume_') || key.startsWith('resume_text_'))) {
              keysToRemove.push(key);
            }
          }
          keysToRemove.forEach(key => sessionStorage.removeItem(key));
        }
      }
    };

    // Listen for auth-changed events
    window.addEventListener('auth-changed', handleAuthChanged);
    
    // Listen for storage changes (login/logout from other tabs or same window)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'auth_token') {
        handleAuthChanged();
      }
    };
    window.addEventListener('storage', handleStorageChange);

    // Load CV on mount if user is already authenticated
    if (isAuthenticated()) {
      loadProfileCV();
    }

    return () => {
      window.removeEventListener('auth-changed', handleAuthChanged);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [resumeFileId, resumeTextId]); // Re-run if resume IDs change

  const fetchReport = useCallback(async () => {
    const resumeId = resumeFileId || resumeTextId;
    const jdId = jdFileId || jdTextId;

    if (!resumeId || !jdId) {
      setError("Missing resume or job description");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const storedResumeText = 
        (resumeId && sessionStorage.getItem(`resume_text_${resumeId}`)) ||
        sessionStorage.getItem(`resume_text`) ||
        sessionStorage.getItem(`resume_text_${resumeId || ''}`) ||
        null;
      
      const storedJdText = 
        (jdId && sessionStorage.getItem(`jd_text_${jdId}`)) ||
        sessionStorage.getItem(`jd_text`) ||
        sessionStorage.getItem(`job_description_text_${jdId || ''}`) ||
        null;

      const genericResumeText = sessionStorage.getItem('current_resume_text');
      const genericJdText = sessionStorage.getItem('current_jd_text');

      let extractRequest: any = {};
      
      if (storedResumeText || genericResumeText) {
        extractRequest.resume_text = storedResumeText || genericResumeText;
      } else if (resumeId) {
        extractRequest.resume_id = resumeId;
      }
      
      if (storedJdText || genericJdText) {
        extractRequest.job_description_text = storedJdText || genericJdText;
      } else if (jdId) {
        extractRequest.jd_id = jdId;
      }

      if (!extractRequest.resume_text && !extractRequest.resume_id) {
        throw new Error("Resume data is required. Please upload or paste your resume and try again.");
      }

      const extractTimeout = 180000;
      const extractController = new AbortController();
      let extractTimeoutId: NodeJS.Timeout | null = null;
      extractTimeoutId = setTimeout(() => extractController.abort(), extractTimeout);

      let extractResponse;
      try {
        extractResponse = await apiClient.post("/api/extract/extract", extractRequest, {
          signal: extractController.signal,
          timeout: extractTimeout,
        });
        if (extractTimeoutId) clearTimeout(extractTimeoutId);
      } catch (extractErr: any) {
        if (extractTimeoutId) clearTimeout(extractTimeoutId);
        
        if (extractErr.code === 'ERR_CANCELED' || extractErr.message === 'canceled' || extractErr.name === 'CanceledError') {
          if (extractController.signal.aborted) {
            throw new Error("Extraction timed out. Please try again.");
          }
          throw new Error("Extraction was cancelled. Please try again.");
        }
        
        if (extractErr.code === 'ECONNABORTED' || extractErr.message?.includes('timeout')) {
          throw new Error("Extraction is taking too long. Please try again.");
        }
        
        const fallbackResumeText = sessionStorage.getItem(`resume_text_${resumeId}`) || sessionStorage.getItem(`resume_text`);
        const fallbackJdText = sessionStorage.getItem(`jd_text_${jdId}`) || sessionStorage.getItem(`jd_text`);
        
        if (fallbackResumeText && fallbackJdText) {
          const retryController = new AbortController();
          let retryTimeoutId: NodeJS.Timeout | null = null;
          retryTimeoutId = setTimeout(() => retryController.abort(), extractTimeout);
          
          try {
            extractResponse = await apiClient.post("/api/extract/extract", {
              resume_text: fallbackResumeText,
              job_description_text: fallbackJdText,
            }, {
              signal: retryController.signal,
              timeout: extractTimeout,
            });
            if (retryTimeoutId) clearTimeout(retryTimeoutId);
          } catch (retryErr: any) {
            if (retryTimeoutId) clearTimeout(retryTimeoutId);
            throw retryErr;
          }
        } else {
          throw extractErr;
        }
      }

      const resumeSkillsData: SkillExtractionResult = extractResponse.data.resume_skills;
      const jdSkillsData: SkillExtractionResult = extractResponse.data.jd_skills;
      setResumeSkills(resumeSkillsData);
      setJdSkills(jdSkillsData);

      try {
        sessionStorage.setItem("last_resume_skills", JSON.stringify(resumeSkillsData));
        sessionStorage.setItem("last_jd_skills", JSON.stringify(jdSkillsData));
        if (resumeId) {
          sessionStorage.setItem(`resume_skills_${resumeId}`, JSON.stringify(resumeSkillsData));
        }
        if (jdId) {
          sessionStorage.setItem(`jd_skills_${jdId}`, JSON.stringify(jdSkillsData));
        }
      } catch (storageError) {
        console.warn("Failed to persist skills in session storage:", storageError);
      }

      // Increased timeout to 5 minutes
      const analyzeTimeout = 300000; // 5 minutes
      const analyzeController = new AbortController();
      let analyzeTimeoutId: NodeJS.Timeout | null = null;
      analyzeTimeoutId = setTimeout(() => analyzeController.abort(), analyzeTimeout);

      let analyzeResponse;
      try {
        analyzeResponse = await apiClient.post("/api/analyze/analyze-gap", {
          resume_skills: extractResponse.data.resume_skills,
          jd_skills: extractResponse.data.jd_skills,
        }, {
          signal: analyzeController.signal,
          timeout: analyzeTimeout,
        });
        if (analyzeTimeoutId) clearTimeout(analyzeTimeoutId);
      } catch (analyzeErr: any) {
        if (analyzeTimeoutId) clearTimeout(analyzeTimeoutId);
        
        if (analyzeErr.code === 'ERR_CANCELED' || analyzeErr.message === 'canceled' || analyzeErr.name === 'CanceledError') {
          if (analyzeController.signal.aborted) {
            throw new Error("Analysis timed out. Please try again.");
          }
          throw new Error("Analysis was cancelled. Please try again.");
        }
        
        if (analyzeErr.code === 'ECONNABORTED' || analyzeErr.message?.includes('timeout')) {
          throw new Error("Analysis is taking too long. Please try again.");
        }
        throw analyzeErr;
      }

      const reportData = analyzeResponse.data.report;
      setReport(reportData);
      
      if (reportData) {
        try {
          sessionStorage.setItem('last_report', JSON.stringify(reportData));
          sessionStorage.setItem('last_report_resume_id', resumeId || '');
          sessionStorage.setItem('last_report_jd_id', jdId || '');
        } catch (e) {
          console.warn('Failed to store report in sessionStorage:', e);
        }
      }
      
      setRetryCount(0);
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || err.message || "Failed to generate analysis.";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [resumeFileId, resumeTextId, jdFileId, jdTextId]);

  const handleAnalyze = () => {
    const ids = {
      resumeId: resumeFileId || resumeTextId,
      jdId: jdFileId || jdTextId,
    };

    if (ids.resumeId) {
      sessionStorage.setItem('current_resume_id', ids.resumeId);
      const resumeText = sessionStorage.getItem(`resume_text_${ids.resumeId}`) || sessionStorage.getItem(`resume_text`);
      if (resumeText) {
        sessionStorage.setItem('current_resume_text', resumeText);
      }
    }
    if (ids.jdId) {
      sessionStorage.setItem('current_jd_id', ids.jdId);
      const jdText = sessionStorage.getItem(`jd_text_${ids.jdId}`) || 
                     sessionStorage.getItem(`job_description_text_${ids.jdId}`) ||
                     sessionStorage.getItem(`jd_text`);
      if (jdText) {
        sessionStorage.setItem('current_jd_text', jdText);
      }
    }

    fetchReport();
  };

  const handleRetry = () => {
    setRetryCount((prev) => prev + 1);
    fetchReport();
  };

  const handleDownloadPDF = async () => {
    const resumeId = resumeFileId || resumeTextId;
    const jdId = jdFileId || jdTextId;

    if (!resumeId || !jdId) {
      setError("Cannot download PDF: Missing resume or job description ID");
      return;
    }

    setDownloadingPDF(true);
    try {
      const pdfBlob = await generatePDFReportFromIds(resumeId, jdId);
      const filename = `skill_gap_report_${new Date().toISOString().split("T")[0]}.pdf`;
      downloadPDF(pdfBlob, filename);
      setError(null);
    } catch (err: any) {
      const errorMessage = err.message || err.response?.data?.detail || "Failed to generate PDF. Please try again.";

      const isNotFound =
        err?.response?.status === 404 ||
        (errorMessage && errorMessage.toLowerCase().includes("not found"));

      if (isNotFound) {
        const fallbackResumeSkills =
          resumeSkills || loadSkillsFromSession(resumeId, "resume_skills");
        const fallbackJdSkills =
          jdSkills || loadSkillsFromSession(jdId, "jd_skills");

        if (fallbackResumeSkills && fallbackJdSkills) {
          try {
            const pdfBlob = await generatePDFReport({
              resume_skills: fallbackResumeSkills,
              jd_skills: fallbackJdSkills,
            });
            const filename = `skill_gap_report_${new Date().toISOString().split("T")[0]}.pdf`;
            downloadPDF(pdfBlob, filename);
            setError(null);
            return;
          } catch (fallbackErr: any) {
            const fallbackMessage =
              fallbackErr.message ||
              fallbackErr.response?.data?.detail ||
              "Failed to generate PDF with stored data.";
            setError(fallbackMessage);
            return;
          }
        } else {
          setError(
            "We can't find your uploaded files anymore. Please re-upload your resume and job description, then try again."
          );
          return;
        }
      }

      setError(errorMessage);
    } finally {
      setDownloadingPDF(false);
    }
  };

  const handleDownloadCSV = () => {
    if (!report) return;

    setDownloadingCSV(true);
    try {
      const csvContent = exportToCSV(report);
      const filename = `skill_gap_report_${new Date().toISOString().split("T")[0]}.csv`;
      downloadCSV(csvContent, filename);
    } catch (err: any) {
      setError("Failed to generate CSV. Please try again.");
    } finally {
      setDownloadingCSV(false);
    }
  };

  return (
    <div className="bg-gradient-to-b from-blue-50 via-white to-blue-50/50 dark:from-gray-900 dark:via-gray-900 dark:to-blue-950/20">
      <div className="mx-auto max-w-9xl px-6 py-8 sm:px-8 lg:px-10">

        {/* Upload Section */}
        <div className="mx-auto max-w-5xl">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Resume Upload Card */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 border-l-4 border-blue-600 hover:shadow-2xl transition-shadow duration-300" style={{ borderLeftColor: '#0077b5' }}>
              <div className="flex items-center mb-6">
                <div className="flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center mr-4" style={{ background: 'linear-gradient(to bottom right, #0077b5, #00a0dc)' }}>
                  <svg
                    className="h-4 w-4 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth="1.5"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
                    />
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white font-mono">
                  Your Resume
                </h2>
              </div>
              <FileUpload
                label=""
                sourceType="resume"
                onUploadSuccess={handleResumeUpload}
                onTextSubmit={handleResumeText}
                initialFileId={resumeFileId}
                initialFileName={resumeFileName}
                onClear={handleResumeClear}
              />
            </div>

            {/* Job Description Upload Card */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 border-l-4 border-blue-600 hover:shadow-2xl transition-shadow duration-300" style={{ borderLeftColor: '#0077b5' }}>
              <div className="flex items-center mb-6">
                <div className="flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center mr-4" style={{ background: 'linear-gradient(to bottom right, #0077b5, #00a0dc)' }}>
                  <svg
                    className="h-4 w-4 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth="1.5"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0V12a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 12V5.25"
                    />
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white font-mono">
                  Job Description
                </h2>
              </div>
              <FileUpload
                label=""
                sourceType="job_description"
                onUploadSuccess={handleJDUpload}
                onTextSubmit={handleJDText}
              />
            </div>
          </div>

          {/* Analyze Button */}
          <div className="flex justify-center pt-8">
            <button
              onClick={handleAnalyze}
              disabled={!canAnalyze || loading}
              className="group relative inline-flex items-center justify-center overflow-hidden rounded-lg px-5 py-2.5 text-sm font-semibold text-white shadow-md transition-all duration-300 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-300 dark:focus:ring-blue-600 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-md"
              style={{ background: 'linear-gradient(to right, #0077b5, #00a0dc)' }}
            >
              <span className="absolute inset-0 w-full h-full opacity-0 transition-opacity duration-300 group-hover:opacity-100" style={{ background: 'linear-gradient(to right, #00a0dc, #0077b5)' }}></span>
              <span className="relative flex items-center">
                {loading ? (
                  <>
                    <svg className="mr-2 h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Analyzing...
                  </>
                ) : (
                  <>
                    <svg
                      className="mr-2 h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth="2"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <span className="font-mono">Analyze Skill Gap</span>
                  </>
                )}
              </span>
            </button>
          </div>
        </div>

        {/* Error State */}
        {error && !loading && (
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 mt-12">
            <RetryableError
              error={error}
              onRetry={handleRetry}
              retryCount={retryCount}
            />
          </div>
        )}

        {/* Results Section */}
        {report && !loading && (
          <div className="mx-auto max-w-[99%] px-0.5 py-8 sm:px-1 lg:px-2 mt-6">
            <div className="space-y-8">
              {/* Resume Skills and Job Description Skills Columns */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                {/* Resume Skills */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm ring-1 ring-blue-200 dark:ring-blue-600/30 p-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 font-mono">
                    Resume Skills
                  </h3>
                  
                  {(() => {
                    const allSkills = [
                      ...report.gap_analysis.matched_skills.map((m) => m.skill),
                      ...report.gap_analysis.extra_skills,
                    ];
                    
                    const technicalCategories = [
                      'programming_languages', 'frameworks_libraries', 'tools_platforms',
                      'databases', 'cloud_services', 'devops', 'software_architecture',
                      'machine_learning', 'blockchain', 'cybersecurity', 'data_science',
                      'ci_cd', 'fintech', 'healthcare_it', 'e_commerce'
                    ];
                    
                    const softSkillCategories = [
                      'leadership', 'communication', 'collaboration', 'problem_solving',
                      'analytical_thinking', 'agile', 'scrum', 'design_thinking'
                    ];
                    
                    const technicalSkills = allSkills.filter(skill => {
                      const category = typeof skill === 'string' ? 'other' : (skill.category || '').toLowerCase();
                      return technicalCategories.includes(category);
                    });
                    
                    const softSkills = allSkills.filter(skill => {
                      const category = typeof skill === 'string' ? 'other' : (skill.category || '').toLowerCase();
                      return softSkillCategories.includes(category);
                    });
                    
                    return (
                      <div className="space-y-4">
                        {/* Technical Skills */}
                        {technicalSkills.length > 0 && (
                          <div>
                            <h4 className="text-sm font-semibold text-blue-600 dark:text-blue-400 mb-2 font-mono">Technical Skills</h4>
                            <div className="flex flex-wrap gap-3">
                              {technicalSkills.map((skill, index) => (
                      <span
                        key={index}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-50 dark:bg-gray-700 border border-blue-300 dark:border-blue-500 text-sm text-gray-700 dark:text-gray-300"
                      >
                                  <svg className="h-3 w-3 text-gray-600 dark:text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                        </svg>
                        {typeof skill === 'string' ? skill : skill.name}
                      </span>
                    ))}
                  </div>
                </div>
                        )}
                        
                        {/* Soft Skills */}
                        {softSkills.length > 0 && (
                          <div>
                            <h4 className="text-sm font-semibold text-blue-600 dark:text-blue-400 mb-2 font-mono">Soft Skills</h4>
                            <div className="flex flex-wrap gap-3">
                              {softSkills.map((skill, index) => (
                                <span
                                  key={index}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-50 dark:bg-gray-700 border border-blue-300 dark:border-blue-500 text-sm text-gray-700 dark:text-gray-300"
                                >
                                  <svg className="h-3 w-3 text-gray-600 dark:text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                                  </svg>
                                  {typeof skill === 'string' ? skill : skill.name}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Education */}
                        {resumeSkills && resumeSkills.education && resumeSkills.education.length > 0 && (
                          <div>
                            <h4 className="text-sm font-semibold text-blue-600 dark:text-blue-400 mb-2 font-mono">Educational Background</h4>
                            <div className="flex flex-wrap gap-3">
                              {resumeSkills.education.map((edu, index) => (
                                <span
                                  key={index}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-50 dark:bg-gray-700 border border-blue-300 dark:border-blue-500 text-sm text-gray-700 dark:text-gray-300"
                                >
                                  <svg className="h-3 w-3 text-gray-600 dark:text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                                  </svg>
                                  {edu.degree}{edu.field ? ` in ${edu.field}` : ''}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Certifications */}
                        {resumeSkills && resumeSkills.certifications && resumeSkills.certifications.length > 0 && (
                          <div>
                            <h4 className="text-sm font-semibold text-blue-600 dark:text-blue-400 mb-2 font-mono">Certifications</h4>
                            <div className="flex flex-wrap gap-3">
                              {resumeSkills.certifications.map((cert, index) => (
                                <span
                                  key={index}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-50 dark:bg-gray-700 border border-blue-300 dark:border-blue-500 text-sm text-gray-700 dark:text-gray-300"
                                >
                                  <svg className="h-3 w-3 text-gray-600 dark:text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                                  </svg>
                                  {cert.name}{cert.issuer ? ` (${cert.issuer})` : ''}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>

                {/* Job Description Skills */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm ring-1 ring-blue-200 dark:ring-blue-600/30 p-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 font-mono">
                    Job Description Skills
                  </h3>
                  
                  {(() => {
                    const allSkills = [
                      ...report.gap_analysis.matched_skills.map((m) => m.skill),
                      ...report.gap_analysis.missing_skills,
                    ];
                    
                    const technicalCategories = [
                      'programming_languages', 'frameworks_libraries', 'tools_platforms',
                      'databases', 'cloud_services', 'devops', 'software_architecture',
                      'machine_learning', 'blockchain', 'cybersecurity', 'data_science',
                      'ci_cd', 'fintech', 'healthcare_it', 'e_commerce'
                    ];
                    
                    const softSkillCategories = [
                      'leadership', 'communication', 'collaboration', 'problem_solving',
                      'analytical_thinking', 'agile', 'scrum', 'design_thinking'
                    ];
                    
                    const technicalSkills = allSkills.filter(skill => {
                      const category = typeof skill === 'string' ? 'other' : (skill.category || '').toLowerCase();
                      return technicalCategories.includes(category);
                    });
                    
                    const softSkills = allSkills.filter(skill => {
                      const category = typeof skill === 'string' ? 'other' : (skill.category || '').toLowerCase();
                      return softSkillCategories.includes(category);
                    });
                    
                    return (
                      <div className="space-y-4">
                        {/* Technical Skills */}
                        {technicalSkills.length > 0 && (
                          <div>
                            <h4 className="text-sm font-semibold text-blue-600 dark:text-blue-400 mb-2 font-mono">Technical Skills</h4>
                            <div className="flex flex-wrap gap-3">
                              {technicalSkills.map((skill, index) => (
                      <span
                        key={index}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-50 dark:bg-gray-700 border border-blue-300 dark:border-blue-500 text-sm text-gray-700 dark:text-gray-300"
                      >
                                  <svg className="h-3 w-3 text-gray-600 dark:text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
                        </svg>
                        {typeof skill === 'string' ? skill : skill.name}
                      </span>
                    ))}
                  </div>
                </div>
                        )}
                        
                        {/* Soft Skills */}
                        {softSkills.length > 0 && (
                          <div>
                            <h4 className="text-sm font-semibold text-blue-600 dark:text-blue-400 mb-2 font-mono">Soft Skills</h4>
                            <div className="flex flex-wrap gap-3">
                              {softSkills.map((skill, index) => (
                                <span
                                  key={index}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-50 dark:bg-gray-700 border border-blue-300 dark:border-blue-500 text-sm text-gray-700 dark:text-gray-300"
                                >
                                  <svg className="h-3 w-3 text-gray-600 dark:text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
                                  </svg>
                                  {typeof skill === 'string' ? skill : skill.name}
                                </span>
                              ))}
              </div>
                          </div>
                        )}

                        {/* Education */}
                        {jdSkills && jdSkills.education && jdSkills.education.length > 0 && (
                          <div>
                            <h4 className="text-sm font-semibold text-blue-600 dark:text-blue-400 mb-2 font-mono">Educational Background</h4>
                            <div className="flex flex-wrap gap-3">
                              {jdSkills.education.map((edu, index) => (
                                <span
                                  key={index}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-50 dark:bg-gray-700 border border-blue-300 dark:border-blue-500 text-sm text-gray-700 dark:text-gray-300"
                                >
                                  <svg className="h-3 w-3 text-gray-600 dark:text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
                                  </svg>
                                  {edu.degree}{edu.field ? ` in ${edu.field}` : ''}{edu.required ? ' (Required)' : edu.preferred ? ' (Preferred)' : ''}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Certifications */}
                        {jdSkills && jdSkills.certifications && jdSkills.certifications.length > 0 && (
                          <div>
                            <h4 className="text-sm font-semibold text-blue-600 dark:text-blue-400 mb-2 font-mono">Certifications</h4>
                            <div className="flex flex-wrap gap-3">
                              {jdSkills.certifications.map((cert, index) => (
                                <span
                                  key={index}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-50 dark:bg-gray-700 border border-blue-300 dark:border-blue-500 text-sm text-gray-700 dark:text-gray-300"
                                >
                                  <svg className="h-3 w-3 text-gray-600 dark:text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
                                  </svg>
                                  {cert.name}{cert.issuer ? ` (${cert.issuer})` : ''}{cert.required ? ' (Required)' : cert.preferred ? ' (Preferred)' : ''}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Skill Lists - Three Equal Columns */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <SkillList
                  title="Matched Skills"
                  skills={report.gap_analysis.matched_skills.map((m) => m.skill)}
                  matches={report.gap_analysis.matched_skills}
                  type="matched"
                />
                <SkillList
                  title="Missing Skills"
                  skills={report.gap_analysis.missing_skills}
                  type="missing"
                />
                <SkillList
                  title="Extra Skills"
                  skills={report.gap_analysis.extra_skills}
                  type="extra"
                />
              </div>

              {/* Fit Score Display */}
              <FitScoreDisplay fitScore={report.fit_score} />

              {/* Course Recommendations Section */}
              <div className="mt-8">
                <CourseRecommendationsSection 
                  recommendations={report.course_recommendations || []}
                  missingSkills={report.gap_analysis?.missing_skills || []}
                />
              </div>

              {/* Download Actions */}
              <DownloadActions
                onDownloadPDF={handleDownloadPDF}
                onDownloadCSV={handleDownloadCSV}
                downloadingPDF={downloadingPDF}
                downloadingCSV={downloadingCSV}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Copy all the component functions from results page
function FitScoreDisplay({ fitScore }: { fitScore: FitScoreBreakdown }) {
  const [showInfoModal, setShowInfoModal] = useState(false);

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-blue-600 dark:text-blue-400";
    if (score >= 60) return "text-blue-600 dark:text-blue-400";
    if (score >= 40) return "text-blue-600 dark:text-blue-400";
    return "text-blue-600 dark:text-blue-400";
  };

  const getScoreBgColor = (score: number) => {
    if (score >= 80) return "from-blue-100 to-blue-50 dark:from-blue-900/20 dark:to-blue-800/20";
    if (score >= 60) return "from-blue-100 to-cyan-100 dark:from-blue-900/20 dark:to-cyan-900/20";
    if (score >= 40) return "from-blue-100 to-blue-50 dark:from-blue-900/20 dark:to-blue-800/20";
    return "from-blue-100 to-blue-50 dark:from-blue-900/20 dark:to-blue-800/20";
  };

  return (
    <div>
      <h2 className="text-2xl font-bold bg-clip-text text-transparent mb-6 font-mono" style={{ background: 'linear-gradient(to right, #0077b5, #00a0dc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
        Fit Score Analysis
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Box 1: Overall Match Score */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm ring-1 ring-blue-200 dark:ring-blue-600/30 p-4 flex flex-col items-center justify-center">
          <h3 className="text-lg font-semibold text-blue-600 dark:text-blue-400 mb-4 font-mono flex items-center gap-1">
            Overall Match Score
            <button
              onClick={() => setShowInfoModal(true)}
              className="relative inline-flex items-center justify-center w-4 h-4 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors cursor-pointer"
              aria-label="How is the fit score calculated?"
              title="How is the fit score calculated?"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
              </svg>
            </button>
          </h3>
            <div
              className={`inline-flex h-32 w-32 items-center justify-center rounded-full bg-gradient-to-br ${getScoreBgColor(
                fitScore.overall_score ?? 0
              )} ring-2 ring-blue-200 dark:ring-blue-600/50`}
            >
              <span
                className={`text-5xl font-bold ${getScoreColor(
                  fitScore.overall_score ?? 0
                )}`}
              >
                {fitScore.overall_score !== null && fitScore.overall_score !== undefined
                  ? fitScore.overall_score.toFixed(0)
                  : "N/A"}
              </span>
          </div>
        </div>

        {/* Box 2: Skill Scores */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm ring-1 ring-blue-200 dark:ring-blue-600/30 p-4">
          <h3 className="text-lg font-semibold text-blue-600 dark:text-blue-400 mb-4 font-mono">
            Skill Scores
          </h3>
          <div className="space-y-2">
          <ScoreCard
            label="Technical Skills"
            score={fitScore.technical_score}
            weight={fitScore.technical_weight}
          />
          <ScoreCard
            label="Soft Skills"
            score={fitScore.soft_skills_score}
            weight={fitScore.soft_skills_weight}
          />
          </div>
        </div>

        {/* Box 3: Skill Counts */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm ring-1 ring-blue-200 dark:ring-blue-600/30 p-4">
          <h3 className="text-lg font-semibold text-blue-600 dark:text-blue-400 mb-4 font-mono">
            Skill Counts
          </h3>
          <div className="space-y-2">
          <StatCard
            label="Matched Skills"
            value={fitScore.matched_count}
            total={fitScore.total_jd_skills}
          />
          <StatCard
            label="Missing Skills"
            value={fitScore.missing_count}
            total={fitScore.total_jd_skills}
          />
          <StatCard
              label="Total Job Description Skills"
            value={fitScore.total_jd_skills}
            total={undefined}
          />
          </div>
        </div>
      </div>

      {/* Info Modal */}
      {showInfoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setShowInfoModal(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white font-mono">
                How is the Fit Score Calculated?
              </h3>
              <button
                onClick={() => setShowInfoModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                aria-label="Close"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="px-6 py-4 space-y-6">
              <div>
                <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
                  <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  Overall Fit Score
                </h4>
                <p className="text-gray-700 dark:text-gray-300 leading-7 mb-2">
                  The overall fit score is calculated as a simple, transparent ratio:
                </p>
                <p className="text-gray-700 dark:text-gray-300 leading-7 mb-2">
                  <span className="font-mono text-sm bg-gray-100 dark:bg-gray-800 px-3 py-2 rounded block">
                    Overall Score = (Matched Skills / Total JD Skills) × 100
                  </span>
                </p>
                <p className="text-gray-600 dark:text-gray-400 text-sm mt-2 italic">
                  This straightforward approach directly shows what percentage of required skills the candidate possesses. For example, if a job requires 10 skills and the candidate has 7 of them, the fit score is 70%.
                </p>
              </div>

              <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
                  <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  Technical Skills Score
                </h4>
                <p className="text-gray-700 dark:text-gray-300 leading-7">
                  Calculated as the percentage of technical skills from the job description that match your resume. 
                  Formula: <span className="font-mono text-sm bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">(Matched Technical Skills ÷ Total Required Technical Skills) × 100</span>
                </p>
              </div>

              <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
                  <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  Soft Skills Score
                </h4>
                <p className="text-gray-700 dark:text-gray-300 leading-7">
                  Calculated as the percentage of soft skills (communication, leadership, problem-solving, etc.) from the job description that match your resume. 
                  Formula: <span className="font-mono text-sm bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">(Matched Soft Skills ÷ Total Required Soft Skills) × 100</span>
                </p>
              </div>

              <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  <strong className="text-gray-900 dark:text-white">Note:</strong> Education and certification matches are also analyzed separately. These factors are displayed in your report but don&apos;t directly impact the overall fit score, as they serve as supplementary indicators of qualification alignment.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ScoreCard({
  label,
  score,
  weight,
}: {
  label: string;
  score: number | null | undefined;
  weight?: number;
}) {
  if (score === null || score === undefined) {
    return (
      <div className="rounded-lg bg-gradient-to-br from-blue-50 to-blue-50 p-2 ring-1 ring-blue-200/50 dark:from-blue-950/30 dark:to-blue-950/30 dark:ring-blue-600/30 max-w-xs">
        <p className="text-base font-medium text-blue-700 dark:text-blue-300 font-mono">
          {label}: <span className="font-bold text-blue-600 dark:text-blue-500">N/A</span>
        </p>
      </div>
    );
  }

  const getCardColor = (score: number) => {
    if (score >= 80) return "from-blue-50 to-blue-100 ring-blue-200/50 dark:from-blue-950/30 dark:to-blue-800/30 dark:ring-blue-600/30";
    if (score >= 60) return "from-blue-50 to-cyan-50 ring-blue-200/50 dark:from-blue-950/30 dark:to-cyan-950/30 dark:ring-blue-800/30";
    if (score >= 40) return "from-blue-50 to-blue-100 ring-blue-200/50 dark:from-blue-950/30 dark:to-blue-800/30 dark:ring-blue-600/30";
    return "from-blue-50 to-blue-100 ring-blue-200/50 dark:from-blue-950/30 dark:to-blue-800/30 dark:ring-blue-600/30";
  };

  return (
    <div className={`rounded-lg bg-gradient-to-br ${getCardColor(score)} p-2 ring-1 max-w-xs`}>
      <p className="text-base font-medium text-blue-700 dark:text-blue-300 font-mono">
        {label}: <span className="font-bold text-lg text-blue-600 dark:text-blue-400">{score.toFixed(0)}%</span>
      </p>
    </div>
  );
}

function StatCard({
  label,
  value,
  total,
}: {
  label: string;
  value: number;
  total?: number;
}) {
  return (
    <div className="rounded-lg bg-gradient-to-br from-blue-50 to-blue-50 p-2 ring-1 ring-blue-200/50 dark:from-blue-950/30 dark:to-blue-950/30 dark:ring-blue-600/30 max-w-xs">
      <p className="text-base font-medium text-blue-700 dark:text-blue-300 font-mono">
        {label}: <span className="font-bold text-lg text-blue-600 dark:text-blue-400">
          {value}
          {total !== undefined && ` / ${total}`}
        </span>
      </p>
    </div>
  );
}

function SkillList({
  title,
  skills,
  matches,
  type,
}: {
  title: string;
  skills: Skill[];
  matches?: SkillMatch[];
  type: "matched" | "missing" | "extra";
}) {
  const getTypeColors = (type: "matched" | "missing" | "extra") => {
    const baseColors = {
      bg: "from-gray-100 to-gray-100 dark:from-gray-800/30 dark:to-gray-800/30",
      ring: "ring-gray-300 dark:ring-gray-600/30",
      title: "text-blue-600 dark:text-blue-400",
      border: "border-gray-300 dark:border-gray-600/30",
    };
    switch (type) {
      case "matched":
        return baseColors;
      case "missing":
        return {
          bg: "from-gray-100 to-gray-100 dark:from-gray-800/30 dark:to-gray-800/30",
          ring: "ring-red-400 dark:ring-red-600/50",
          title: "text-blue-600 dark:text-blue-400",
          border: "border-red-400 dark:border-red-600/50",
        };
      case "extra":
        return baseColors;
    }
  };

  const colors = getTypeColors(type);

  return (
    <div className={`rounded-lg bg-gradient-to-br ${colors.bg} p-4 ring-1 ${colors.ring}`}>
      <h3 className={`text-lg font-semibold ${colors.title} mb-3 font-mono`}>
        {title}
      </h3>
      {skills.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">No skills found</p>
      ) : (
        <div className="max-h-64 overflow-y-auto space-y-2">
          {skills.map((skill, index) => (
            <SkillTag 
              key={index} 
              name={skill.name}
              category={skill.category}
              type={type}
              matchType={matches?.[index]?.match_type}
              confidence={matches?.[index]?.confidence}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function DownloadActions({
  onDownloadPDF,
  onDownloadCSV,
  downloadingPDF,
  downloadingCSV,
}: {
  onDownloadPDF: () => void;
  onDownloadCSV: () => void;
  downloadingPDF: boolean;
  downloadingCSV: boolean;
}) {
  return (
    <div className="mx-auto max-w-2xl rounded-xl bg-gradient-to-br from-white via-blue-50/50 to-blue-50/30 p-2.5 shadow-lg ring-1 ring-blue-200/50 dark:from-gray-800 dark:via-blue-950/20 dark:to-blue-950/20 dark:ring-blue-600/30 hover:shadow-xl transition-shadow duration-300">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <div className="flex-shrink-0 w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(to bottom right, #0077b5, #00a0dc)' }}>
              <svg
                className="h-4 w-4 text-white"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="2"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <h3 className="text-base font-bold bg-clip-text text-transparent" style={{ background: 'linear-gradient(to right, #0077b5, #00a0dc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Export Report
            </h3>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <button
            onClick={onDownloadPDF}
            disabled={downloadingPDF}
            className="group relative inline-flex items-center justify-center rounded-lg px-4 py-1.5 text-sm font-semibold text-white shadow-md hover:shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#57068C] disabled:bg-gray-300 disabled:cursor-not-allowed dark:disabled:bg-gray-700 transition-all duration-200 hover:scale-105 disabled:hover:scale-100"
            style={{ background: 'linear-gradient(to right, #0077b5, #00a0dc)' }}
          >
            {downloadingPDF ? (
              <>
                <svg
                  className="mr-2 h-4 w-4 animate-spin"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Generating...
              </>
            ) : (
              <>
                <svg
                  className="mr-2 h-4 w-4 transition-transform group-hover:scale-110"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                  />
                </svg>
                PDF
              </>
            )}
          </button>
          <button
            onClick={onDownloadCSV}
            disabled={downloadingCSV}
            className="group relative inline-flex items-center justify-center rounded-lg border-2 border-blue-200 bg-white px-4 py-1.5 text-sm font-semibold shadow-sm hover:bg-blue-50 hover:border-blue-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#57068C] disabled:bg-gray-100 disabled:border-gray-300 disabled:text-gray-400 disabled:cursor-not-allowed dark:border-blue-700 dark:bg-gray-800 dark:hover:bg-blue-950/30 dark:hover:border-blue-500 dark:disabled:bg-gray-900 dark:disabled:border-gray-700 transition-all duration-200 hover:scale-105 disabled:hover:scale-100"
            style={{ color: '#0077b5' }}
          >
            {downloadingCSV ? (
              <>
                <svg
                  className="mr-2 h-4 w-4 animate-spin"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Generating...
              </>
            ) : (
              <>
                <svg
                  className="mr-2 h-4 w-4 transition-transform group-hover:scale-110"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                CSV
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function CourseRecommendationsSection({
  recommendations,
  missingSkills,
}: {
  recommendations: CourseRecommendation[];
  missingSkills: Skill[];
}) {
  const generateLinkedInLearningUrl = (skillName: string) => {
    return `https://www.linkedin.com/learning/search?keywords=${encodeURIComponent(skillName)}`;
  };

  // If we have course recommendations, show them
  if (recommendations && recommendations.length > 0) {
    return (
      <div className="rounded-lg bg-gradient-to-br from-white to-blue-50/30 p-6 shadow-sm ring-1 ring-blue-200 dark:from-gray-800 dark:to-blue-950/20 dark:ring-blue-600/30">
        <div className="flex items-center mb-4">
          <div className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center mr-3" style={{ background: 'linear-gradient(to bottom right, #0077b5, #00a0dc)' }}>
            <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
            </svg>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Recommended Courses
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              LinkedIn Learning courses available through NYU to help you develop missing skills
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
          {recommendations.map((rec, index) => (
            <a
              key={index}
              href={rec.linkedin_learning_url}
              target="_blank"
              rel="noopener noreferrer"
              className="group block p-4 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-400 hover:shadow-md transition-all duration-200"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-base font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {rec.skill_name}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 capitalize">
                    {rec.category.replace(/_/g, " ")}
                  </p>
                </div>
                <svg
                  className="w-5 h-5 text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors flex-shrink-0 ml-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                  />
                </svg>
              </div>
              <div className="mt-3 flex items-center text-xs text-blue-600 dark:text-blue-400">
                <span className="font-medium">{rec.platform}</span>
                <svg
                  className="w-3 h-3 ml-1"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
            </a>
          ))}
        </div>
      </div>
    );
  }

  // If no course recommendations but we have missing skills, show them with search links
  if (missingSkills && missingSkills.length > 0) {
    const topMissing = missingSkills.slice(0, 10);
    return (
      <div className="rounded-lg bg-gradient-to-br from-white to-blue-50/30 p-6 shadow-sm ring-1 ring-blue-200 dark:from-gray-800 dark:to-blue-950/20 dark:ring-blue-600/30">
        <div className="flex items-center mb-4">
          <div className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center mr-3" style={{ background: 'linear-gradient(to bottom right, #0077b5, #00a0dc)' }}>
            <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
            </svg>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Recommended Courses
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              LinkedIn Learning courses available through NYU to help you develop missing skills
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
          {topMissing.map((skill, index) => (
            <a
              key={index}
              href={generateLinkedInLearningUrl(skill.name)}
              target="_blank"
              rel="noopener noreferrer"
              className="group block p-4 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-400 hover:shadow-md transition-all duration-200"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-base font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {skill.name}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 capitalize">
                    {skill.category?.replace(/_/g, " ") || "Other"}
                  </p>
                </div>
                <svg
                  className="w-5 h-5 text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors flex-shrink-0 ml-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                  />
                </svg>
              </div>
              <div className="mt-3 flex items-center text-xs text-blue-600 dark:text-blue-400">
                <span className="font-medium">LinkedIn Learning</span>
                <svg
                  className="w-3 h-3 ml-1"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
            </a>
          ))}
        </div>
      </div>
    );
  }

  // If no missing skills, show a success message
  return (
    <div className="rounded-lg bg-gradient-to-br from-white to-blue-50/30 p-6 shadow-sm ring-1 ring-blue-200 dark:from-gray-800 dark:to-blue-950/20 dark:ring-blue-600/30">
      <div className="flex items-center mb-4">
        <div className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center mr-3" style={{ background: 'linear-gradient(to bottom right, #0077b5, #00a0dc)' }}>
          <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
          </svg>
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Recommended Courses
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            You have all the required skills! No course recommendations needed.
          </p>
        </div>
      </div>
    </div>
  );
}

