"use client";

import { useState } from "react";
import FileUpload from "@/components/FileUpload";
import { useRouter } from "next/navigation";

export default function Analyze() {
  const router = useRouter();
  const [resumeFileId, setResumeFileId] = useState<string | null>(null);
  const [resumeTextId, setResumeTextId] = useState<string | null>(null);
  const [jdFileId, setJdFileId] = useState<string | null>(null);
  const [jdTextId, setJdTextId] = useState<string | null>(null);
  const [canAnalyze, setCanAnalyze] = useState(false);

  const handleResumeUpload = (fileId: string, filename: string) => {
    setResumeFileId(fileId);
    setResumeTextId(null);
    checkCanAnalyze(fileId, jdFileId || jdTextId);
  };

  const handleResumeText = (textId: string) => {
    setResumeTextId(textId);
    setResumeFileId(null);
    checkCanAnalyze(textId, jdFileId || jdTextId);
  };

  const handleJDUpload = (fileId: string, filename: string) => {
    setJdFileId(fileId);
    setJdTextId(null);
    checkCanAnalyze(resumeFileId || resumeTextId, fileId);
  };

  const handleJDText = (textId: string) => {
    setJdTextId(textId);
    setJdFileId(null);
    checkCanAnalyze(resumeFileId || resumeTextId, textId);
  };

  const checkCanAnalyze = (resumeId: string | null, jdId: string | null) => {
    setCanAnalyze(!!resumeId && !!jdId);
  };

  const handleAnalyze = () => {
    // Store IDs in session storage or pass as query params
    const ids = {
      resumeId: resumeFileId || resumeTextId,
      jdId: jdFileId || jdTextId,
    };
    
    // For now, we'll pass them via query params
    // In next steps, we'll implement the actual analysis page
    router.push(`/analyze/results?resume=${ids.resumeId}&jd=${ids.jdId}`);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl dark:text-white">
            Analyze Your Skills
          </h1>
          <p className="mt-6 text-lg leading-8 text-gray-600 dark:text-gray-300">
            Upload your resume and job description to identify skill gaps and
            get personalized recommendations.
          </p>
        </div>

        <div className="space-y-8">
          {/* Resume Upload */}
          <div className="rounded-lg bg-white p-6 shadow-sm ring-1 ring-gray-900/5 dark:bg-gray-800 dark:ring-gray-700">
            <FileUpload
              label="Your Resume"
              sourceType="resume"
              onUploadSuccess={handleResumeUpload}
              onTextSubmit={handleResumeText}
            />
          </div>

          {/* Job Description Upload */}
          <div className="rounded-lg bg-white p-6 shadow-sm ring-1 ring-gray-900/5 dark:bg-gray-800 dark:ring-gray-700">
            <FileUpload
              label="Job Description"
              sourceType="job_description"
              onUploadSuccess={handleJDUpload}
              onTextSubmit={handleJDText}
            />
          </div>

          {/* Analyze Button */}
          <div className="flex justify-center">
            <button
              onClick={handleAnalyze}
              disabled={!canAnalyze}
              className="rounded-md bg-blue-600 px-8 py-3 text-base font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed dark:disabled:bg-gray-700 transition-colors"
            >
              Analyze Skill Gap
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
