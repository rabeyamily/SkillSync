"""
PDF Report Generation API endpoints.
"""
import asyncio
from functools import partial
from typing import Optional
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import Response
from app.models.api_models import AnalyzeGapRequest, AnalyzeGapResponse
from app.models.schemas import SkillGapReport
from app.services.gap_analysis import gap_analyzer
from app.services.fit_score import fit_score_calculator
from app.services.recommendations import recommendations_generator
from app.services.pdf_generator import pdf_report_generator
from app.services.unified_extraction import unified_skill_extractor
from app.utils.file_storage import file_storage

router = APIRouter()


@router.post("/generate-pdf")
async def generate_pdf_report(request: AnalyzeGapRequest):
    """
    Generate PDF report from skill gap analysis.
    
    Args:
        request: AnalyzeGapRequest with resume and JD skills
        
    Returns:
        PDF file response
    """
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
        
        # Generate course recommendations with LinkedIn Learning links
        course_recommendations = recommendations_generator.generate_course_recommendations(
            gap_analysis=gap_analysis
        )
        
        # Text-based recommendations are no longer used in PDF, but kept empty for schema compatibility
        recommendations = []
        
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
        from datetime import datetime
        report = SkillGapReport(
            resume_id=None,
            job_description_id=None,
            resume_summary=resume_summary,
            job_description_summary=jd_summary,
            fit_score=fit_score,
            gap_analysis=gap_analysis,
            recommendations=recommendations,
            course_recommendations=course_recommendations,
            generated_at=datetime.now(),
            version="1.0.0"
        )
        
        # Generate PDF
        pdf_buffer = pdf_report_generator.generate_pdf(report)
        
        return Response(
            content=pdf_buffer.read(),
            media_type="application/pdf",
            headers={
                "Content-Disposition": "attachment; filename=skill_gap_report.pdf"
            }
        )
        
    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        print(f"Error generating PDF report: {str(e)}")
        print(f"Traceback: {error_trace}")
        raise HTTPException(
            status_code=500,
            detail=f"Error generating PDF report: {str(e)}"
        )


@router.post("/generate-pdf-from-ids")
async def generate_pdf_from_ids(
    resume_id: str = Query(..., description="Resume file ID"),
    jd_id: str = Query(..., description="Job description file ID"),
    technical_weight: Optional[float] = Query(None, description="Optional weight for technical skills"),
    soft_skills_weight: Optional[float] = Query(None, description="Optional weight for soft skills")
):
    """
    Generate PDF report from file IDs.
    
    Args:
        resume_id: Resume file ID
        jd_id: Job description file ID
        technical_weight: Optional weight for technical skills
        soft_skills_weight: Optional weight for soft skills
        
    Returns:
        PDF file response
    """
    try:
        # Get text from file storage
        resume_file = file_storage.get_file(resume_id)
        jd_file = file_storage.get_file(jd_id)
        
        if not resume_file:
            raise HTTPException(status_code=404, detail=f"Resume file {resume_id} not found")
        if not jd_file:
            raise HTTPException(status_code=404, detail=f"Job description file {jd_id} not found")
        
        # Extract text
        resume_text = resume_file.get("parsed_text") or resume_file.get("content", "")
        jd_text = jd_file.get("parsed_text") or jd_file.get("content", "")
        
        if isinstance(resume_text, bytes):
            resume_text = resume_text.decode("utf-8", errors="ignore")
        if isinstance(jd_text, bytes):
            jd_text = jd_text.decode("utf-8", errors="ignore")
        
        # Extract skills (run synchronous extractor in thread pool)
        loop = asyncio.get_running_loop()

        resume_result, error = await loop.run_in_executor(
            None,
            partial(unified_skill_extractor.extract_from_text, resume_text, "resume")
        )
        if error:
            raise HTTPException(status_code=400, detail=f"Resume extraction error: {error}")
        
        jd_result, error = await loop.run_in_executor(
            None,
            partial(unified_skill_extractor.extract_from_text, jd_text, "job_description")
        )
        if error:
            raise HTTPException(status_code=400, detail=f"Job description extraction error: {error}")
        
        # Create request
        weights = None
        if technical_weight is not None or soft_skills_weight is not None:
            weights = {
                "technical": technical_weight,
                "soft_skills": soft_skills_weight
            }
        
        request = AnalyzeGapRequest(
            resume_skills=resume_result,
            jd_skills=jd_result,
            weights=weights
        )
        
        # Generate PDF
        return await generate_pdf_report(request)
        
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        print(f"Error generating PDF from IDs: {str(e)}")
        print(f"Traceback: {error_trace}")
        raise HTTPException(
            status_code=500,
            detail=f"Error generating PDF report: {str(e)}"
        )

