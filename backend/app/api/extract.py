"""
Skill extraction API endpoints.
"""
import time
import asyncio
from concurrent.futures import ThreadPoolExecutor
from fastapi import APIRouter, HTTPException
from app.models.api_models import ExtractSkillsRequest, ExtractSkillsResponse
from app.models.schemas import SkillExtractionResult
from app.services.unified_extraction import unified_skill_extractor

router = APIRouter()

# Thread pool for running synchronous extraction functions in parallel
executor = ThreadPoolExecutor(max_workers=2)


@router.post("/extract", response_model=ExtractSkillsResponse)
async def extract_skills(request: ExtractSkillsRequest):
    """
    Extract skills from resume and/or job description text.
    
    Runs extractions in parallel for better performance.
    
    Args:
        request: ExtractSkillsRequest with text or file IDs
        
    Returns:
        ExtractSkillsResponse with extracted skills
    """
    start_time = time.time()
    
    resume_result = None
    jd_result = None
    
    # Define extraction tasks
    async def extract_resume():
        """Extract resume skills."""
        try:
            if request.resume_id:
                # Run synchronous function in thread pool
                loop = asyncio.get_event_loop()
                result, error = await loop.run_in_executor(
                    executor,
                    unified_skill_extractor.extract_from_file_id,
                    request.resume_id
                )
                if error:
                    return None, error
                return result, None
            elif request.resume_text:
                loop = asyncio.get_event_loop()
                result, error = await loop.run_in_executor(
                    executor,
                    unified_skill_extractor.extract_from_text,
                    request.resume_text,
                    "resume"
                )
                if error:
                    return None, error
                return result, None
            else:
                return None, "Either resume_text or resume_id must be provided"
        except Exception as e:
            return None, str(e)
    
    async def extract_jd():
        """Extract job description skills."""
        try:
            if request.jd_id:
                loop = asyncio.get_event_loop()
                result, error = await loop.run_in_executor(
                    executor,
                    unified_skill_extractor.extract_from_file_id,
                    request.jd_id
                )
                if error:
                    return None, error
                return result, None
            elif request.job_description_text:
                loop = asyncio.get_event_loop()
                result, error = await loop.run_in_executor(
                    executor,
                    unified_skill_extractor.extract_from_text,
                    request.job_description_text,
                    "job_description"
                )
                if error:
                    return None, error
                return result, None
            return None, None  # JD is optional
        except Exception as e:
            return None, str(e)
    
    # Run both extractions in parallel
    tasks = []
    
    # Always extract resume (required)
    if request.resume_id or request.resume_text:
        resume_task = extract_resume()
        tasks.append(("resume", resume_task))
    else:
        raise HTTPException(
            status_code=400,
            detail="Either resume_text or resume_id must be provided"
        )
    
    # Extract JD if provided (optional)
    if request.jd_id or request.job_description_text:
        jd_task = extract_jd()
        tasks.append(("jd", jd_task))
    
    # Wait for all tasks to complete
    results = await asyncio.gather(*[task for _, task in tasks])
    
    # Process results
    resume_error = None
    jd_error = None
    
    for i, (name, _) in enumerate(tasks):
        result, error = results[i]
        
        if error:
            if name == "resume":
                resume_error = error
            elif name == "jd":
                jd_error = error
        else:
            if name == "resume":
                resume_result = result
            elif name == "jd":
                jd_result = result
    
    # Handle errors
    if resume_error:
        raise HTTPException(status_code=400, detail=f"Resume extraction error: {resume_error}")
    
    if jd_error:
        raise HTTPException(status_code=400, detail=f"Job description extraction error: {jd_error}")
    
    # At least one must be provided
    if not resume_result and not jd_result:
        raise HTTPException(
            status_code=400,
            detail="Either resume_text or resume_id must be provided"
        )
    
    # Create default empty result if one is missing
    if not resume_result:
        resume_result = SkillExtractionResult(
            skills=[],
            education=[],
            certifications=[],
            extraction_method="llm",
            raw_text=""
        )
    
    if not jd_result:
        jd_result = SkillExtractionResult(
            skills=[],
            education=[],
            certifications=[],
            extraction_method="llm",
            raw_text=""
        )
    
    extraction_time = time.time() - start_time
    
    return ExtractSkillsResponse(
        resume_skills=resume_result,
        jd_skills=jd_result,
        extraction_time=extraction_time
    )


@router.post("/extract/resume")
async def extract_resume_skills(text: str):
    """
    Extract skills from resume text only.
    
    Args:
        text: Resume text
        
    Returns:
        SkillExtractionResult
    """
    result, error = unified_skill_extractor.extract_from_text(text, source_type="resume")
    
    if error:
        raise HTTPException(status_code=400, detail=error)
    
    return result


@router.post("/extract/job-description")
async def extract_jd_skills(text: str):
    """
    Extract skills from job description text only.
    
    Args:
        text: Job description text
        
    Returns:
        SkillExtractionResult
    """
    result, error = unified_skill_extractor.extract_from_text(text, source_type="job_description")
    
    if error:
        raise HTTPException(status_code=400, detail=error)
    
    return result


@router.post("/extract/file/{file_id}")
async def extract_skills_from_file(file_id: str):
    """
    Extract skills from an uploaded file.
    
    Args:
        file_id: File identifier
        
    Returns:
        SkillExtractionResult
    """
    result, error = unified_skill_extractor.extract_from_file_id(file_id)
    
    if error:
        raise HTTPException(status_code=400, detail=error)
    
    return result
