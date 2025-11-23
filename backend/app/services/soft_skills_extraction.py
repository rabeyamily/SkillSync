"""
Soft skills, education, and certification extraction module.
"""
from typing import List, Dict, Any, Optional, Tuple
from app.models.schemas import Skill, Education, Certification
from app.models.skill_taxonomy import SkillCategory
from app.services.llm_service import llm_service
from app.services.prompts import skill_extraction_prompts


class SoftSkillsExtractor:
    """Extract soft skills, education, and certifications from text using LLM."""
    
    # Soft skill categories
    SOFT_SKILL_CATEGORIES = [
        SkillCategory.LEADERSHIP,
        SkillCategory.COMMUNICATION,
        SkillCategory.COLLABORATION,
        SkillCategory.PROBLEM_SOLVING,
        SkillCategory.ANALYTICAL_THINKING,
    ]
    
    # Methodology categories
    METHODOLOGY_CATEGORIES = [
        SkillCategory.AGILE,
        SkillCategory.SCRUM,
        SkillCategory.CI_CD,
        SkillCategory.DESIGN_THINKING,
    ]
    
    @staticmethod
    def extract_soft_skills(text: str) -> Tuple[List[Skill], Optional[str]]:
        """
        Extract soft skills from text.
        Uses the same extraction method for both resumes and job descriptions.
        
        Args:
            text: Text to extract skills from
            
        Returns:
            Tuple of (list of Skill objects, error_message)
        """
        if not text or len(text.strip()) < 10:
            return [], "Text is too short or empty"
        
        if not llm_service.is_configured():
            return [], "LLM service is not configured. Please set OPENAI_API_KEY in .env file."
        
        try:
            # Build prompt for soft skills extraction
            messages = skill_extraction_prompts.build_soft_skills_prompt(text)
            
            print(f"[Extraction] Calling LLM API for soft skills extraction...")
            
            # Call LLM API
            response = llm_service.call_api(
                messages=messages,
                response_format=skill_extraction_prompts.get_response_format()
            )
            
            print(f"[Extraction] LLM API call successful. Response content length: {len(response.get('content', ''))}")
            
            # Extract JSON from response
            result = llm_service.extract_json_response(response["content"])
            
            # Debug: Log the raw response
            print(f"[Extraction] Soft skills LLM response: {str(result)[:500]}")
            
            # Parse skills from result
            skills = SoftSkillsExtractor._parse_skills(result)
            
            # Debug: Log parsed skills count
            print(f"[Extraction] Parsed {len(skills)} soft skills from response")
            
            # Validate and filter skills
            validated_skills = SoftSkillsExtractor._validate_soft_skills(skills)
            
            print(f"[Extraction] After validation: {len(validated_skills)} soft skills")
            
            return validated_skills, None
            
        except Exception as e:
            error_message = f"Error extracting soft skills: {str(e)}"
            import traceback
            print(f"[Extraction] ERROR extracting soft skills: {error_message}")
            print(f"[Extraction] Traceback: {traceback.format_exc()}")
            return [], error_message
    
    @staticmethod
    def extract_education(text: str, source_type: str = "resume") -> Tuple[List[Education], Optional[str]]:
        """
        Extract education requirements from text.
        
        Args:
            text: Text to extract education from
            source_type: Type of source ('resume' or 'job_description')
            
        Returns:
            Tuple of (list of Education objects, error_message)
        """
        if not text or len(text.strip()) < 10:
            return [], "Text is too short or empty"
        
        if not llm_service.is_configured():
            return [], "LLM service is not configured. Please set OPENAI_API_KEY in .env file."
        
        try:
            # Build prompt for education extraction
            messages = skill_extraction_prompts.build_education_extraction_prompt(text)
            
            # Call LLM API
            response = llm_service.call_api(
                messages=messages,
                response_format=skill_extraction_prompts.get_response_format()
            )
            
            # Extract JSON from response
            result = llm_service.extract_json_response(response["content"])
            
            # Debug: Log the raw response
            print(f"[Extraction] Education LLM response: {str(result)[:500]}")
            
            # Parse education from result
            education_list = SoftSkillsExtractor._parse_education(result, source_type)
            
            # Debug: Log parsed education count
            print(f"[Extraction] Parsed {len(education_list)} education entries from response")
            
            return education_list, None
            
        except Exception as e:
            error_message = f"Error extracting education: {str(e)}"
            return [], error_message
    
    @staticmethod
    def extract_certifications(text: str, source_type: str = "resume") -> Tuple[List[Certification], Optional[str]]:
        """
        Extract certifications from text.
        
        Args:
            text: Text to extract certifications from
            source_type: Type of source ('resume' or 'job_description')
            
        Returns:
            Tuple of (list of Certification objects, error_message)
        """
        if not text or len(text.strip()) < 10:
            return [], "Text is too short or empty"
        
        if not llm_service.is_configured():
            return [], "LLM service is not configured. Please set OPENAI_API_KEY in .env file."
        
        try:
            # Build prompt for certification extraction
            messages = skill_extraction_prompts.build_certification_extraction_prompt(text)
            
            # Call LLM API
            response = llm_service.call_api(
                messages=messages,
                response_format=skill_extraction_prompts.get_response_format()
            )
            
            # Extract JSON from response
            result = llm_service.extract_json_response(response["content"])
            
            # Debug: Log the raw response
            print(f"[Extraction] Certifications LLM response: {str(result)[:500]}")
            
            # Parse certifications from result
            certifications = SoftSkillsExtractor._parse_certifications(result, source_type)
            
            # Debug: Log parsed certifications count
            print(f"[Extraction] Parsed {len(certifications)} certifications from response")
            
            return certifications, None
            
        except Exception as e:
            error_message = f"Error extracting certifications: {str(e)}"
            return [], error_message
    
    @staticmethod
    def extract_methodologies(text: str) -> List[Skill]:
        """
        Extract methodology skills from text.
        
        Args:
            text: Text to extract from
            
        Returns:
            List of Skill objects
        """
        # Use the full skill extraction prompt and filter for methodologies
        try:
            from app.services.skill_extraction import technical_skills_extractor
            
            # Extract all skills first
            all_skills, error = technical_skills_extractor.extract_skills(text)
            
            if error:
                return []
            
            # Filter for methodology categories
            methodology_skills = [
                skill for skill in all_skills
                if skill.category in SoftSkillsExtractor.METHODOLOGY_CATEGORIES
            ]
            
            return methodology_skills
            
        except Exception:
            return []
    
    @staticmethod
    def _parse_skills(result: Dict[str, Any]) -> List[Skill]:
        """Parse skills from LLM response."""
        skills = []
        
        if isinstance(result, list):
            skill_list = result
        elif isinstance(result, dict) and "skills" in result:
            skill_list = result["skills"]
        elif isinstance(result, dict):
            skill_list = result.get("skills", result.get("soft_skills", []))
        else:
            return []
        
        for skill_data in skill_list:
            if isinstance(skill_data, dict):
                try:
                    skill_name = skill_data.get("name", "").strip()
                    category_str = skill_data.get("category", "").strip()
                    
                    if not skill_name:
                        continue
                    
                    try:
                        category = SkillCategory(category_str.lower())
                    except ValueError:
                        category = SoftSkillsExtractor._infer_soft_skill_category(skill_name)
                    
                    skill = Skill(
                        name=skill_name,
                        category=category,
                        confidence=skill_data.get("confidence"),
                        aliases=skill_data.get("aliases", [])
                    )
                    
                    skills.append(skill)
                    
                except Exception:
                    continue
        
        return skills
    
    @staticmethod
    def _parse_education(result: Dict[str, Any], source_type: str) -> List[Education]:
        """Parse education from LLM response."""
        education_list = []
        
        if isinstance(result, list):
            edu_list = result
        elif isinstance(result, dict) and "education" in result:
            edu_list = result["education"]
        elif isinstance(result, dict):
            edu_list = result.get("education", [])
        else:
            return []
        
        for edu_data in edu_list:
            if isinstance(edu_data, dict):
                try:
                    # For resumes, education is typically not required/preferred
                    # For job descriptions, check if required/preferred
                    if source_type == "job_description":
                        required = edu_data.get("required", False)
                        preferred = edu_data.get("preferred", False)
                    else:
                        required = False
                        preferred = False
                    
                    education = Education(
                        degree=edu_data.get("degree"),
                        field=edu_data.get("field"),
                        required=required,
                        preferred=preferred
                    )
                    
                    education_list.append(education)
                    
                except Exception:
                    continue
        
        return education_list
    
    @staticmethod
    def _parse_certifications(result: Dict[str, Any], source_type: str) -> List[Certification]:
        """Parse certifications from LLM response."""
        certifications = []
        
        if isinstance(result, list):
            cert_list = result
        elif isinstance(result, dict) and "certifications" in result:
            cert_list = result["certifications"]
        elif isinstance(result, dict):
            cert_list = result.get("certifications", [])
        else:
            return []
        
        for cert_data in cert_list:
            if isinstance(cert_data, dict):
                try:
                    cert_name = cert_data.get("name", "").strip()
                    
                    if not cert_name:
                        continue
                    
                    # For resumes, certifications are typically not required/preferred
                    # For job descriptions, check if required/preferred
                    if source_type == "job_description":
                        required = cert_data.get("required", False)
                        preferred = cert_data.get("preferred", False)
                    else:
                        required = False
                        preferred = False
                    
                    certification = Certification(
                        name=cert_name,
                        issuer=cert_data.get("issuer"),
                        required=required,
                        preferred=preferred
                    )
                    
                    certifications.append(certification)
                    
                except Exception:
                    continue
        
        return certifications
    
    @staticmethod
    def _validate_soft_skills(skills: List[Skill]) -> List[Skill]:
        """Validate and filter soft skills."""
        from app.services.skill_matching import SkillMatcher
        
        validated = []
        seen_names = set()
        
        for skill in skills:
            # Check if skill is in soft skill or methodology categories
            if skill.category not in SoftSkillsExtractor.SOFT_SKILL_CATEGORIES + SoftSkillsExtractor.METHODOLOGY_CATEGORIES:
                continue
            
            # Use the same normalization as skill matching for consistency
            normalized_name = SkillMatcher.normalize_skill_name(skill.name)
            
            if normalized_name in seen_names:
                continue
            
            if len(skill.name.strip()) < 2:
                continue
            
            seen_names.add(normalized_name)
            validated.append(skill)
        
        return validated
    
    @staticmethod
    def _infer_soft_skill_category(skill_name: str) -> SkillCategory:
        """Infer soft skill category from skill name."""
        skill_lower = skill_name.lower()
        
        # Leadership
        if skill_lower in ["leadership", "team management", "mentoring", "strategic planning", 
                          "managing", "supervision"]:
            return SkillCategory.LEADERSHIP
        
        # Communication
        if skill_lower in ["communication", "technical writing", "presentations", "public speaking",
                          "written communication", "verbal communication"]:
            return SkillCategory.COMMUNICATION
        
        # Collaboration
        if skill_lower in ["collaboration", "teamwork", "pair programming", "code reviews",
                          "cross-functional", "cooperation"]:
            return SkillCategory.COLLABORATION
        
        # Problem solving
        if skill_lower in ["problem solving", "debugging", "troubleshooting", "critical thinking",
                          "analytical problem solving"]:
            return SkillCategory.PROBLEM_SOLVING
        
        # Analytical thinking
        if skill_lower in ["analytical thinking", "data analysis", "root cause analysis",
                          "logical reasoning", "analysis"]:
            return SkillCategory.ANALYTICAL_THINKING
        
        # Agile
        if skill_lower in ["agile", "agile development", "agile methodologies"]:
            return SkillCategory.AGILE
        
        # Scrum
        if skill_lower in ["scrum", "scrum master", "sprint", "scrum practices"]:
            return SkillCategory.SCRUM
        
        # CI/CD
        if skill_lower in ["ci/cd", "continuous integration", "continuous deployment"]:
            return SkillCategory.CI_CD
        
        return SkillCategory.OTHER


# Global soft skills extractor instance
soft_skills_extractor = SoftSkillsExtractor()

