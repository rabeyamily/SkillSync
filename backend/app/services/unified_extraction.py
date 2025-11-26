"""
Unified skill extraction service that combines all extraction modules.
"""
import time
import asyncio
from concurrent.futures import ThreadPoolExecutor
from typing import Tuple, Optional
from app.models.schemas import SkillExtractionResult
from app.services.skill_extraction import technical_skills_extractor
from app.services.soft_skills_extraction import soft_skills_extractor
from app.utils.file_storage import file_storage
from app.services.file_parser import file_parser_service

# Thread pool for running synchronous extraction functions in parallel
extraction_executor = ThreadPoolExecutor(max_workers=5)


class UnifiedSkillExtractor:
    """Unified service for extracting all skills, education, and certifications."""
    
    @staticmethod
    def extract_from_text(text: str, source_type: str = "resume") -> Tuple[SkillExtractionResult, Optional[str]]:
        """
        Extract all skills, education, and certifications from text.
        
        Runs all sub-extractions in parallel for better performance.
        
        Args:
            text: Text to extract from
            source_type: Type of source ('resume' or 'job_description')
            
        Returns:
            Tuple of (SkillExtractionResult, error_message)
        """
        if not text or len(text.strip()) < 10:
            return None, "Text is too short or empty"
        
        start_time = time.time()
        
        try:
            # Check if LLM is configured first
            from app.services.llm_service import llm_service
            if not llm_service.is_configured():
                return None, "LLM service is not configured. Please set OPENAI_API_KEY in your .env file. Skill extraction requires OpenAI API access."
            
            # Run all extractions in parallel using asyncio
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            
            try:
                result = loop.run_until_complete(
                    UnifiedSkillExtractor._extract_parallel(text, source_type)
                )
                return result
            finally:
                loop.close()
            
        except Exception as e:
            extraction_time = time.time() - start_time
            error_message = f"Error in unified extraction after {extraction_time:.2f}s: {str(e)}"
            print(f"[Extraction] ERROR: {error_message}")
            import traceback
            print(f"[Extraction] Traceback: {traceback.format_exc()}")
            return None, error_message
    
    @staticmethod
    async def _extract_parallel(text: str, source_type: str) -> Tuple[SkillExtractionResult, Optional[str]]:
        """Run all extractions in parallel."""
        start_time = time.time()
        
        async def extract_technical():
            """Extract technical skills."""
            loop = asyncio.get_event_loop()
            result, error = await loop.run_in_executor(
                extraction_executor,
                technical_skills_extractor.extract_skills,
                text
            )
            if error and "not configured" in error:
                return None, error
            print(f"[Extraction] Extracted {len(result)} technical skills")
            return result, error
        
        async def extract_soft():
            """Extract soft skills."""
            loop = asyncio.get_event_loop()
            result, error = await loop.run_in_executor(
                extraction_executor,
                soft_skills_extractor.extract_soft_skills,
                text
            )
            if error and "not configured" in error:
                return None, error
            print(f"[Extraction] Extracted {len(result)} soft skills")
            return result, error
        
        async def extract_methodologies():
            """Extract methodologies."""
            loop = asyncio.get_event_loop()
            result = await loop.run_in_executor(
                extraction_executor,
                soft_skills_extractor.extract_methodologies,
                text
            )
            print(f"[Extraction] Extracted {len(result)} methodologies")
            return result
        
        async def extract_education():
            """Extract education."""
            loop = asyncio.get_event_loop()
            result, error = await loop.run_in_executor(
                extraction_executor,
                soft_skills_extractor.extract_education,
                text,
                source_type
            )
            if error and "not configured" in error:
                return None, error
            print(f"[Extraction] Extracted {len(result)} education entries")
            return result, error
        
        async def extract_certifications():
            """Extract certifications."""
            loop = asyncio.get_event_loop()
            result, error = await loop.run_in_executor(
                extraction_executor,
                soft_skills_extractor.extract_certifications,
                text,
                source_type
            )
            if error and "not configured" in error:
                return None, error
            print(f"[Extraction] Extracted {len(result)} certifications")
            return result, error
        
        # Run all extractions in parallel
        print(f"[Extraction] Starting parallel extraction for {source_type}...")
        technical_task = extract_technical()
        soft_task = extract_soft()
        methodologies_task = extract_methodologies()
        education_task = extract_education()
        certifications_task = extract_certifications()
        
        # Wait for all tasks to complete
        results = await asyncio.gather(
            technical_task,
            soft_task,
            methodologies_task,
            education_task,
            certifications_task,
            return_exceptions=True
        )
        
        # Process results - handle exceptions and tuple/list unpacking
        # Technical skills
        if isinstance(results[0], Exception):
            technical_skills, tech_error = [], str(results[0])
        else:
            technical_skills, tech_error = results[0] if isinstance(results[0], tuple) else ([], None)
        
        # Soft skills
        if isinstance(results[1], Exception):
            soft_skills, soft_error = [], str(results[1])
        else:
            soft_skills, soft_error = results[1] if isinstance(results[1], tuple) else ([], None)
        
        # Methodologies (returns only a list, not a tuple)
        if isinstance(results[2], Exception):
            methodologies = []
        else:
            methodologies = results[2] if isinstance(results[2], list) else []
        
        # Education
        if isinstance(results[3], Exception):
            education, edu_error = [], str(results[3])
        else:
            education, edu_error = results[3] if isinstance(results[3], tuple) else ([], None)
        
        # Certifications
        if isinstance(results[4], Exception):
            certifications, cert_error = [], str(results[4])
        else:
            certifications, cert_error = results[4] if isinstance(results[4], tuple) else ([], None)
        
        # Check for critical errors
        if tech_error and "not configured" in tech_error:
            return None, tech_error
        if soft_error and "not configured" in soft_error:
            return None, soft_error
        if edu_error and "not configured" in edu_error:
            return None, edu_error
        if cert_error and "not configured" in cert_error:
            return None, cert_error
        
        # Combine all skills
        all_skills = (technical_skills or []) + (soft_skills or []) + (methodologies or [])
        
        # Confidence score removed - no longer calculated
        confidence_score = None
        
        extraction_time = time.time() - start_time
        
        print(f"[Extraction] Completed extraction for {source_type} in {extraction_time:.2f}s")
        print(f"[Extraction] Total: {len(all_skills)} skills, {len(education or [])} education, {len(certifications or [])} certifications")
        
        # Create SkillExtractionResult
        result = SkillExtractionResult(
            skills=all_skills,
            education=education or [],
            certifications=certifications or [],
            extraction_method="llm",
            confidence_score=confidence_score,
            raw_text=text
        )
        
        return result, None
    
    @staticmethod
    def extract_from_file_id(file_id: str) -> Tuple[SkillExtractionResult, Optional[str]]:
        """
        Extract skills from a stored file.
        
        Args:
            file_id: File identifier
            
        Returns:
            Tuple of (SkillExtractionResult, error_message)
        """
        # Get file from storage
        file_data = file_storage.get_file(file_id)
        
        if not file_data:
            return None, "File not found or session expired"
        
        # Get parsed text
        parsed_text = file_data.get("parsed_text")
        
        if not parsed_text:
            # Try to parse the file first
            success, parse_error = file_parser_service.parse_file(file_id)
            
            if not success:
                return None, parse_error or "Failed to parse file"
            
            # Get updated file data
            file_data = file_storage.get_file(file_id)
            parsed_text = file_data.get("parsed_text")
            
            if not parsed_text:
                return None, "Could not extract text from file"
        
        # Extract source type
        source_type = file_data.get("source_type", "resume")
        
        # Extract skills from text
        return UnifiedSkillExtractor.extract_from_text(parsed_text, source_type)


# Global unified extractor instance
unified_skill_extractor = UnifiedSkillExtractor()
