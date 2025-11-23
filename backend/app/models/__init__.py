# Models package - exports all data models
from app.models.skill_taxonomy import SkillCategory, SKILL_CATEGORY_DESCRIPTIONS
from app.models.schemas import (
    Skill,
    Education,
    Certification,
    ResumeData,
    JobDescription,
    SkillExtractionResult,
    SkillMatch,
    GapAnalysis,
    FitScoreBreakdown,
    SkillGapReport,
)
from app.models.api_models import (
    UploadResumeResponse,
    TextInputRequest,
    TextInputResponse,
    ExtractSkillsRequest,
    ExtractSkillsResponse,
    AnalyzeGapRequest,
    AnalyzeGapResponse,
)

__all__ = [
    "SkillCategory",
    "SKILL_CATEGORY_DESCRIPTIONS",
    "Skill",
    "Education",
    "Certification",
    "ResumeData",
    "JobDescription",
    "SkillExtractionResult",
    "SkillMatch",
    "GapAnalysis",
    "FitScoreBreakdown",
    "SkillGapReport",
    "UploadResumeResponse",
    "TextInputRequest",
    "TextInputResponse",
    "ExtractSkillsRequest",
    "ExtractSkillsResponse",
    "AnalyzeGapRequest",
    "AnalyzeGapResponse",
]
