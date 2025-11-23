"""
Data models for resume and job description analysis.
"""
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from datetime import datetime
from app.models.skill_taxonomy import SkillCategory


class Skill(BaseModel):
    """Represents a single skill."""
    name: str = Field(..., description="Name of the skill")
    category: SkillCategory = Field(..., description="Category of the skill")
    confidence: Optional[float] = Field(None, ge=0.0, le=1.0, description="Confidence score (0-1)")
    aliases: Optional[List[str]] = Field(default_factory=list, description="Alternative names for the skill")
    
    class Config:
        use_enum_values = True


class Education(BaseModel):
    """Education requirement or qualification."""
    degree: Optional[str] = Field(None, description="Degree type (Bachelor's, Master's, PhD, etc.)")
    field: Optional[str] = Field(None, description="Field of study")
    required: bool = Field(True, description="Whether this education is required")
    preferred: bool = Field(False, description="Whether this education is preferred")


class Certification(BaseModel):
    """Professional certification."""
    name: str = Field(..., description="Name of the certification")
    issuer: Optional[str] = Field(None, description="Certifying organization")
    required: bool = Field(False, description="Whether certification is required")
    preferred: bool = Field(False, description="Whether certification is preferred")


class ResumeData(BaseModel):
    """Resume data model."""
    text: str = Field(..., description="Raw text content of the resume")
    name: Optional[str] = Field(None, description="Candidate name")
    email: Optional[str] = Field(None, description="Candidate email")
    skills: List[Skill] = Field(default_factory=list, description="Extracted skills")
    education: List[Education] = Field(default_factory=list, description="Education details")
    certifications: List[Certification] = Field(default_factory=list, description="Certifications")
    experience_years: Optional[float] = Field(None, description="Years of experience")
    extracted_at: datetime = Field(default_factory=datetime.now, description="Extraction timestamp")


class JobDescription(BaseModel):
    """Job description data model."""
    text: str = Field(..., description="Raw text content of the job description")
    title: Optional[str] = Field(None, description="Job title")
    company: Optional[str] = Field(None, description="Company name")
    skills: List[Skill] = Field(default_factory=list, description="Required/preferred skills")
    education: List[Education] = Field(default_factory=list, description="Education requirements")
    certifications: List[Certification] = Field(default_factory=list, description="Certification requirements")
    experience_years: Optional[float] = Field(None, description="Required years of experience")
    extracted_at: datetime = Field(default_factory=datetime.now, description="Extraction timestamp")


class SkillExtractionResult(BaseModel):
    """Result of skill extraction from text."""
    skills: List[Skill] = Field(default_factory=list, description="Extracted skills")
    education: List[Education] = Field(default_factory=list, description="Education found")
    certifications: List[Certification] = Field(default_factory=list, description="Certifications found")
    extraction_method: str = Field(default="llm", description="Method used for extraction")
    confidence_score: Optional[float] = Field(None, ge=0.0, le=1.0, description="Overall confidence")
    raw_text: str = Field(..., description="Original text that was analyzed")


class SkillMatch(BaseModel):
    """Represents a matched skill between resume and job description."""
    skill: Skill = Field(..., description="The matched skill")
    match_type: str = Field(..., description="Type of match (exact, synonym, fuzzy)")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Match confidence")


class GapAnalysis(BaseModel):
    """Gap analysis result."""
    matched_skills: List[SkillMatch] = Field(default_factory=list, description="Skills present in both")
    missing_skills: List[Skill] = Field(default_factory=list, description="Skills in JD but not in resume")
    extra_skills: List[Skill] = Field(default_factory=list, description="Skills in resume but not in JD")
    
    # Category breakdown
    category_breakdown: Dict[str, Dict[str, int]] = Field(
        default_factory=dict,
        description="Breakdown by category with counts"
    )


class FitScoreBreakdown(BaseModel):
    """Detailed breakdown of fit score."""
    overall_score: float = Field(..., ge=0.0, le=100.0, description="Overall fit score percentage")
    technical_score: float = Field(..., ge=0.0, le=100.0, description="Technical skills score")
    soft_skills_score: float = Field(..., ge=0.0, le=100.0, description="Soft skills score")
    education_score: Optional[float] = Field(None, ge=0.0, le=100.0, description="Education match score")
    certification_score: Optional[float] = Field(None, ge=0.0, le=100.0, description="Certification match score")
    
    # Scoring details
    matched_count: int = Field(0, description="Number of matched skills")
    missing_count: int = Field(0, description="Number of missing skills")
    total_jd_skills: int = Field(0, description="Total skills in job description")
    
    # Weights used
    technical_weight: float = Field(0.7, description="Weight for technical skills")
    soft_skills_weight: float = Field(0.3, description="Weight for soft skills")


class SkillGapReport(BaseModel):
    """Complete skill gap analysis report."""
    resume_id: Optional[str] = Field(None, description="Identifier for the resume")
    job_description_id: Optional[str] = Field(None, description="Identifier for the job description")
    
    # Input summaries
    resume_summary: Optional[Dict[str, Any]] = Field(None, description="Resume summary")
    job_description_summary: Optional[Dict[str, Any]] = Field(None, description="JD summary")
    
    # Analysis results
    fit_score: FitScoreBreakdown = Field(..., description="Fit score breakdown")
    gap_analysis: GapAnalysis = Field(..., description="Gap analysis details")
    
    # Recommendations
    recommendations: List[str] = Field(
        default_factory=list,
        description="Personalized recommendations to close gaps"
    )
    course_recommendations: Optional[List[Dict[str, Any]]] = Field(
        default_factory=list,
        description="Course recommendations with links for missing skills"
    )
    
    # Metadata
    generated_at: datetime = Field(default_factory=datetime.now, description="Report generation timestamp")
    version: str = Field(default="1.0.0", description="Report format version")

