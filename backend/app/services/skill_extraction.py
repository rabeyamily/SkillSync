"""
Technical skills extraction module using LLM.
"""
import time
from typing import List, Dict, Any, Optional, Tuple
from app.models.schemas import Skill, Education, Certification
from app.models.skill_taxonomy import SkillCategory
from app.services.llm_service import llm_service
from app.services.prompts import skill_extraction_prompts


class TechnicalSkillsExtractor:
    """Extract technical skills from text using LLM."""
    
    # Technical skill categories
    TECHNICAL_CATEGORIES = [
        SkillCategory.PROGRAMMING_LANGUAGES,
        SkillCategory.FRAMEWORKS_LIBRARIES,
        SkillCategory.TOOLS_PLATFORMS,
        SkillCategory.DATABASES,
        SkillCategory.CLOUD_SERVICES,
        SkillCategory.DEVOPS,
        SkillCategory.SOFTWARE_ARCHITECTURE,
        SkillCategory.MACHINE_LEARNING,
        SkillCategory.BLOCKCHAIN,
        SkillCategory.CYBERSECURITY,
        SkillCategory.DATA_SCIENCE,
    ]
    
    @staticmethod
    def extract_skills(text: str) -> Tuple[List[Skill], Optional[str]]:
        """
        Extract technical skills from text.
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
            # Build prompt for technical skills extraction
            messages = skill_extraction_prompts.build_technical_skills_prompt(text)
            
            print(f"[Extraction] Calling LLM API for technical skills extraction...")
            
            # Call LLM API
            response = llm_service.call_api(
                messages=messages,
                response_format=skill_extraction_prompts.get_response_format()
            )
            
            print(f"[Extraction] LLM API call successful. Response content length: {len(response.get('content', ''))}")
            
            # Extract JSON from response
            result = llm_service.extract_json_response(response["content"])
            
            # Debug: Log the raw response
            print(f"[Extraction] Technical skills LLM response: {str(result)[:500]}")
            
            # Parse skills from result
            skills = TechnicalSkillsExtractor._parse_skills(result)
            
            # Debug: Log parsed skills count
            print(f"[Extraction] Parsed {len(skills)} technical skills from response")
            
            # Validate and filter skills
            validated_skills = TechnicalSkillsExtractor._validate_skills(skills)
            
            print(f"[Extraction] After validation: {len(validated_skills)} technical skills")
            
            return validated_skills, None
            
        except Exception as e:
            error_message = f"Error extracting technical skills: {str(e)}"
            import traceback
            print(f"[Extraction] ERROR extracting technical skills: {error_message}")
            print(f"[Extraction] Traceback: {traceback.format_exc()}")
            return [], error_message
    
    @staticmethod
    def _parse_skills(result: Dict[str, Any]) -> List[Skill]:
        """
        Parse skills from LLM response.
        
        Args:
            result: LLM response dictionary
            
        Returns:
            List of Skill objects
        """
        skills = []
        
        # Handle different response formats
        if isinstance(result, list):
            # Direct array of skills
            skill_list = result
        elif isinstance(result, dict) and "skills" in result:
            # Nested skills object
            skill_list = result["skills"]
        elif isinstance(result, dict):
            # Try to find skills in any key
            skill_list = result.get("skills", result.get("technical_skills", []))
        else:
            return []
        
        for skill_data in skill_list:
            if isinstance(skill_data, dict):
                try:
                    skill_name = skill_data.get("name", "").strip()
                    category_str = skill_data.get("category", "").strip()
                    
                    if not skill_name:
                        continue
                    
                    # Validate and convert category
                    try:
                        category = SkillCategory(category_str.lower())
                    except ValueError:
                        # Try to infer category from name
                        category = TechnicalSkillsExtractor._infer_category(skill_name)
                    
                    # Create Skill object
                    skill = Skill(
                        name=skill_name,
                        category=category,
                        confidence=skill_data.get("confidence"),
                        aliases=skill_data.get("aliases", [])
                    )
                    
                    skills.append(skill)
                    
                except Exception as e:
                    # Skip invalid skill entries
                    continue
        
        return skills
    
    @staticmethod
    def _validate_skills(skills: List[Skill]) -> List[Skill]:
        """
        Validate and filter skills.
        
        Args:
            skills: List of Skill objects
            
        Returns:
            List of validated Skill objects
        """
        from app.services.skill_matching import SkillMatcher
        
        validated = []
        seen_names = set()
        
        for skill in skills:
            # Check if skill is in technical categories
            if skill.category not in TechnicalSkillsExtractor.TECHNICAL_CATEGORIES:
                continue
            
            # Use the same normalization as skill matching for consistency
            normalized_name = SkillMatcher.normalize_skill_name(skill.name)
            
            # Skip duplicates
            if normalized_name in seen_names:
                continue
            
            # Basic validation
            if len(skill.name.strip()) < 2:
                continue
            
            seen_names.add(normalized_name)
            validated.append(skill)
        
        return validated
    
    @staticmethod
    def _infer_category(skill_name: str) -> SkillCategory:
        """
        Infer skill category from skill name.
        
        Args:
            skill_name: Name of the skill
            
        Returns:
            Inferred SkillCategory
        """
        skill_lower = skill_name.lower()
        
        # Programming languages
        if skill_lower in ["python", "java", "javascript", "typescript", "c++", "c#", "go", "rust", 
                           "ruby", "php", "swift", "kotlin", "scala", "r", "matlab"]:
            return SkillCategory.PROGRAMMING_LANGUAGES
        
        # Frameworks and libraries
        if skill_lower in ["react", "django", "spring", "spring boot", "flask", "express", "angular", 
                           "vue", "node.js", "tensorflow", "pytorch", "keras", "pandas", "numpy"]:
            return SkillCategory.FRAMEWORKS_LIBRARIES
        
        # Databases
        if skill_lower in ["postgresql", "mysql", "mongodb", "redis", "cassandra", "oracle", 
                          "sqlite", "dynamodb", "elasticsearch"]:
            return SkillCategory.DATABASES
        
        # Cloud services
        if skill_lower in ["aws", "azure", "gcp", "google cloud", "heroku", "vercel", "netlify"]:
            return SkillCategory.CLOUD_SERVICES
        
        # DevOps
        if skill_lower in ["kubernetes", "docker", "terraform", "jenkins", "gitlab ci", "github actions",
                          "ansible", "puppet", "chef", "vagrant"]:
            return SkillCategory.DEVOPS
        
        # Tools and platforms
        if skill_lower in ["git", "jira", "confluence", "slack", "vs code", "intellij", "eclipse"]:
            return SkillCategory.TOOLS_PLATFORMS
        
        # Machine Learning
        if skill_lower in ["machine learning", "deep learning", "neural networks", "nlp", 
                          "computer vision", "reinforcement learning"]:
            return SkillCategory.MACHINE_LEARNING
        
        # Blockchain
        if skill_lower in ["blockchain", "solidity", "ethereum", "smart contracts", "web3", "defi"]:
            return SkillCategory.BLOCKCHAIN
        
        # Default to other
        return SkillCategory.OTHER
    
    @staticmethod
    def extract_by_category(text: str, category: SkillCategory) -> List[Skill]:
        """
        Extract skills of a specific category.
        
        Args:
            text: Text to extract from
            category: Skill category to filter by
            
        Returns:
            List of Skill objects in the specified category
        """
        all_skills, error = TechnicalSkillsExtractor.extract_skills(text)
        
        if error:
            return []
        
        return [skill for skill in all_skills if skill.category == category]
    
    @staticmethod
    def extract_programming_languages(text: str) -> List[Skill]:
        """Extract programming languages from text."""
        return TechnicalSkillsExtractor.extract_by_category(text, SkillCategory.PROGRAMMING_LANGUAGES)
    
    @staticmethod
    def extract_frameworks(text: str) -> List[Skill]:
        """Extract frameworks and libraries from text."""
        return TechnicalSkillsExtractor.extract_by_category(text, SkillCategory.FRAMEWORKS_LIBRARIES)
    
    @staticmethod
    def extract_tools(text: str) -> List[Skill]:
        """Extract tools and platforms from text."""
        return TechnicalSkillsExtractor.extract_by_category(text, SkillCategory.TOOLS_PLATFORMS)
    
    @staticmethod
    def extract_databases(text: str) -> List[Skill]:
        """Extract database technologies from text."""
        return TechnicalSkillsExtractor.extract_by_category(text, SkillCategory.DATABASES)
    
    @staticmethod
    def extract_cloud_services(text: str) -> List[Skill]:
        """Extract cloud services from text."""
        return TechnicalSkillsExtractor.extract_by_category(text, SkillCategory.CLOUD_SERVICES)
    
    @staticmethod
    def extract_devops(text: str) -> List[Skill]:
        """Extract DevOps tools and practices from text."""
        return TechnicalSkillsExtractor.extract_by_category(text, SkillCategory.DEVOPS)


# Global technical skills extractor instance
technical_skills_extractor = TechnicalSkillsExtractor()

