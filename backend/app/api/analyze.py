"""
Gap analysis API endpoints.
"""
import time
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, HTTPException
from app.models.api_models import AnalyzeGapRequest, AnalyzeGapResponse, AnalyzeGapFromTextRequest
from app.models.schemas import SkillGapReport
from app.services.gap_analysis import gap_analyzer
from app.services.fit_score import fit_score_calculator
from app.services.recommendations import recommendations_generator
from app.services.unified_extraction import unified_skill_extractor
from app.utils.file_storage import file_storage

router = APIRouter()


@router.post("/analyze-gap", response_model=AnalyzeGapResponse)
async def analyze_gap(request: AnalyzeGapRequest):
    """
    Analyze skill gap between resume and job description.
    
    This endpoint performs comprehensive gap analysis, calculates fit scores,
    and generates personalized recommendations.
    
    Args:
        request: AnalyzeGapRequest with resume and JD skills
        
    Returns:
        AnalyzeGapResponse with complete SkillGapReport
    """
    start_time = time.time()
    
    try:
        # Perform gap analysis
        gap_analysis = gap_analyzer.analyze_gap(
            request.resume_skills,
            request.jd_skills
        )
        
        # Extract weights if provided
        technical_weight = None
        soft_skills_weight = None
        
        if request.weights:
            technical_weight = request.weights.get("technical", None)
            soft_skills_weight = request.weights.get("soft_skills", None)
        
        # Calculate fit score
        fit_score = fit_score_calculator.calculate_fit_score(
            gap_analysis=gap_analysis,
            resume_skills=request.resume_skills,
            jd_skills=request.jd_skills,
            technical_weight=technical_weight,
            soft_skills_weight=soft_skills_weight,
            include_education=True,
            include_certifications=True
        )
        
        # Generate course recommendations with Coursera links
        course_recommendations = recommendations_generator.generate_course_recommendations(
            gap_analysis=gap_analysis
        )
        
        # Create input summaries
        resume_summary = {
            "total_skills": len(request.resume_skills.skills),
            "total_education": len(request.resume_skills.education),
            "total_certifications": len(request.resume_skills.certifications),
            "skill_categories": list(set(s.category for s in request.resume_skills.skills))
        }
        
        jd_summary = {
            "total_skills": len(request.jd_skills.skills),
            "total_education": len(request.jd_skills.education),
            "total_certifications": len(request.jd_skills.certifications),
            "skill_categories": list(set(s.category for s in request.jd_skills.skills))
        }
        
        # Create complete report
        report = SkillGapReport(
            resume_id=None,  # Can be populated if file IDs are tracked
            job_description_id=None,  # Can be populated if file IDs are tracked
            resume_summary=resume_summary,
            job_description_summary=jd_summary,
            fit_score=fit_score,
            gap_analysis=gap_analysis,
            recommendations=[],  # Text recommendations removed - only course recommendations used
            course_recommendations=course_recommendations,
            generated_at=datetime.now(),
            version="1.0.0"
        )
        
        analysis_time = time.time() - start_time
        
        return AnalyzeGapResponse(
            report=report,
            analysis_time=round(analysis_time, 3)
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error during gap analysis: {str(e)}"
        )


@router.post("/analyze-gap-from-text", response_model=AnalyzeGapResponse)
async def analyze_gap_from_text(request: AnalyzeGapFromTextRequest):
    """
    Analyze skill gap from text or file IDs.
    
    This is a convenience endpoint that extracts skills first, then performs gap analysis.
    
    Args:
        request: AnalyzeGapFromTextRequest with text or file IDs
        
    Returns:
        AnalyzeGapResponse with complete SkillGapReport
    """
    start_time = time.time()
    
    # Extract resume skills
    resume_skills = None
    
    if request.resume_id:
        # Get text from file storage
        file_info = file_storage.get_file(request.resume_id)
        if not file_info:
            raise HTTPException(status_code=404, detail=f"Resume file {request.resume_id} not found")
        
        text = file_info.get("parsed_text") or file_info.get("content", "")
        if isinstance(text, bytes):
            text = text.decode("utf-8", errors="ignore")
        
        resume_result, error = unified_skill_extractor.extract_from_text(
            text, source_type="resume"
        )
        if error:
            raise HTTPException(status_code=400, detail=f"Resume extraction error: {error}")
        resume_skills = resume_result
    elif request.resume_text:
        resume_result, error = unified_skill_extractor.extract_from_text(
            request.resume_text, source_type="resume"
        )
        if error:
            raise HTTPException(status_code=400, detail=f"Resume extraction error: {error}")
        resume_skills = resume_result
    else:
        raise HTTPException(
            status_code=400,
            detail="Either resume_text or resume_id must be provided"
        )
    
    # Extract JD skills
    jd_skills = None
    
    if request.jd_id:
        # Get text from file storage
        file_info = file_storage.get_file(request.jd_id)
        if not file_info:
            raise HTTPException(status_code=404, detail=f"Job description file {request.jd_id} not found")
        
        text = file_info.get("parsed_text") or file_info.get("content", "")
        if isinstance(text, bytes):
            text = text.decode("utf-8", errors="ignore")
        
        jd_result, error = unified_skill_extractor.extract_from_text(
            text, source_type="job_description"
        )
        if error:
            raise HTTPException(status_code=400, detail=f"Job description extraction error: {error}")
        jd_skills = jd_result
    elif request.jd_text:
        jd_result, error = unified_skill_extractor.extract_from_text(
            request.jd_text, source_type="job_description"
        )
        if error:
            raise HTTPException(status_code=400, detail=f"Job description extraction error: {error}")
        jd_skills = jd_result
    else:
        raise HTTPException(
            status_code=400,
            detail="Either jd_text or jd_id must be provided"
        )
    
    # Create AnalyzeGapRequest
    weights = None
    if request.technical_weight is not None or request.soft_skills_weight is not None:
        weights = {
            "technical": request.technical_weight,
            "soft_skills": request.soft_skills_weight
        }
    
    gap_request = AnalyzeGapRequest(
        resume_skills=resume_skills,
        jd_skills=jd_skills,
        weights=weights
    )
    
    # Delegate to main analyze_gap endpoint
    return await analyze_gap(gap_request)

