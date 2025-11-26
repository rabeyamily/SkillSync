/**
 * TypeScript types and interfaces for the frontend
 * These mirror the backend Pydantic models
 */

// Skill Categories
export enum SkillCategory {
  PROGRAMMING_LANGUAGES = "programming_languages",
  FRAMEWORKS_LIBRARIES = "frameworks_libraries",
  TOOLS_PLATFORMS = "tools_platforms",
  DATABASES = "databases",
  CLOUD_SERVICES = "cloud_services",
  DEVOPS = "devops",
  SOFTWARE_ARCHITECTURE = "software_architecture",
  MACHINE_LEARNING = "machine_learning",
  BLOCKCHAIN = "blockchain",
  CYBERSECURITY = "cybersecurity",
  DATA_SCIENCE = "data_science",
  LEADERSHIP = "leadership",
  COMMUNICATION = "communication",
  COLLABORATION = "collaboration",
  PROBLEM_SOLVING = "problem_solving",
  ANALYTICAL_THINKING = "analytical_thinking",
  AGILE = "agile",
  SCRUM = "scrum",
  CI_CD = "ci_cd",
  DESIGN_THINKING = "design_thinking",
  EDUCATION = "education",
  CERTIFICATIONS = "certifications",
  FINTECH = "fintech",
  HEALTHCARE_IT = "healthcare_it",
  E_COMMERCE = "e_commerce",
  OTHER = "other",
}

// Core Data Models
export interface Skill {
  name: string;
  category: SkillCategory | string;
  confidence?: number;
  aliases?: string[];
}

export interface Education {
  degree?: string;
  field?: string;
  required: boolean;
  preferred: boolean;
}

export interface Certification {
  name: string;
  issuer?: string;
  required: boolean;
  preferred: boolean;
}

export interface ResumeData {
  text: string;
  name?: string;
  email?: string;
  skills: Skill[];
  education: Education[];
  certifications: Certification[];
  experience_years?: number;
  extracted_at: string;
}

export interface JobDescription {
  text: string;
  title?: string;
  company?: string;
  skills: Skill[];
  education: Education[];
  certifications: Certification[];
  experience_years?: number;
  extracted_at: string;
}

export interface SkillExtractionResult {
  skills: Skill[];
  education: Education[];
  certifications: Certification[];
  extraction_method: string;
  confidence_score?: number;
  raw_text: string;
}

export interface SkillMatch {
  skill: Skill;
  match_type: string;
}

export interface GapAnalysis {
  matched_skills: SkillMatch[];
  missing_skills: Skill[];
  extra_skills: Skill[];
  category_breakdown: Record<string, Record<string, number>>;
}

export interface FitScoreBreakdown {
  overall_score: number;
  technical_score: number;
  soft_skills_score: number;
  education_score?: number;
  certification_score?: number;
  matched_count: number;
  missing_count: number;
  total_jd_skills: number;
  technical_weight: number;
  soft_skills_weight: number;
}

export interface CourseRecommendation {
  skill_name: string;
  category: string;
  course_url: string;
  platform: string;
}

export interface SkillGapReport {
  resume_id?: string;
  job_description_id?: string;
  resume_summary?: Record<string, any>;
  job_description_summary?: Record<string, any>;
  fit_score: FitScoreBreakdown;
  gap_analysis: GapAnalysis;
  recommendations: string[];
  course_recommendations?: CourseRecommendation[];
  generated_at: string;
  version: string;
}

// API Request/Response Models
export interface UploadResumeResponse {
  file_id: string;
  filename: string;
  file_size: number;
  file_type: string;
  status: string;
}

export interface TextInputRequest {
  text: string;
  source_type: "resume" | "job_description";
}

export interface TextInputResponse {
  text_id: string;
  text_length: number;
  status: string;
}

export interface ExtractSkillsRequest {
  resume_text?: string;
  job_description_text?: string;
  resume_id?: string;
  jd_id?: string;
}

export interface ExtractSkillsResponse {
  resume_skills: SkillExtractionResult;
  jd_skills: SkillExtractionResult;
  extraction_time: number;
}

export interface AnalyzeGapRequest {
  resume_skills: SkillExtractionResult;
  jd_skills: SkillExtractionResult;
  weights?: Record<string, number>;
}

export interface AnalyzeGapResponse {
  report: SkillGapReport;
  analysis_time: number;
}

