"""
Gap analysis module for comparing resume and job description skills.
"""
from typing import List, Dict
from app.models.schemas import GapAnalysis, Skill, SkillMatch, SkillExtractionResult
from app.models.skill_taxonomy import SkillCategory
from app.services.skill_matching import skill_matcher


class GapAnalyzer:
    """Analyze gaps between resume and job description skills."""
    
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
    def analyze_gap(
        resume_skills: SkillExtractionResult,
        jd_skills: SkillExtractionResult
    ) -> GapAnalysis:
        """
        Analyze gap between resume and job description skills.
        
        Args:
            resume_skills: SkillExtractionResult from resume
            jd_skills: SkillExtractionResult from job description
            
        Returns:
            GapAnalysis object with matched, missing, and extra skills
        """
        # Deduplicate skills using the same normalization as matching
        resume_skill_list = GapAnalyzer._deduplicate_skills(resume_skills.skills)
        jd_skill_list = GapAnalyzer._deduplicate_skills(jd_skills.skills)
        
        # Find matches
        matched_skills = skill_matcher.find_matches(resume_skill_list, jd_skill_list)
        
        # Find missing skills (in JD but not in resume)
        missing_skills = skill_matcher.find_missing_skills(resume_skill_list, jd_skill_list)
        
        # Find extra skills (in resume but not in JD)
        extra_skills = skill_matcher.find_extra_skills(resume_skill_list, jd_skill_list)
        
        # Generate category breakdown
        category_breakdown = GapAnalyzer._generate_category_breakdown(
            matched_skills,
            missing_skills,
            extra_skills
        )
        
        return GapAnalysis(
            matched_skills=matched_skills,
            missing_skills=missing_skills,
            extra_skills=extra_skills,
            category_breakdown=category_breakdown
        )
    
    @staticmethod
    def _deduplicate_skills(skills: List[Skill]) -> List[Skill]:
        """
        Deduplicate skills using the same normalization as skill matching.
        
        Args:
            skills: List of skills to deduplicate
            
        Returns:
            Deduplicated list of skills
        """
        from app.services.skill_matching import SkillMatcher
        
        seen = {}
        deduplicated = []
        
        for skill in skills:
            normalized = SkillMatcher.normalize_skill_name(skill.name)
            
            # If we've seen this normalized name, skip it
            if normalized in seen:
                continue
            
            seen[normalized] = skill
            deduplicated.append(skill)
        
        return deduplicated
    
    @staticmethod
    def _generate_category_breakdown(
        matched_skills: List[SkillMatch],
        missing_skills: List[Skill],
        extra_skills: List[Skill]
    ) -> Dict[str, Dict[str, int]]:
        """
        Generate category breakdown of skills.
        
        Args:
            matched_skills: List of matched skills
            missing_skills: List of missing skills
            extra_skills: List of extra skills
            
        Returns:
            Dictionary with category breakdown
        """
        breakdown = {}
        
        # Process matched skills
        for match in matched_skills:
            category = match.skill.category
            if category not in breakdown:
                breakdown[category] = {"matched": 0, "missing": 0, "extra": 0}
            breakdown[category]["matched"] = breakdown[category].get("matched", 0) + 1
        
        # Process missing skills
        for skill in missing_skills:
            category = skill.category
            if category not in breakdown:
                breakdown[category] = {"matched": 0, "missing": 0, "extra": 0}
            breakdown[category]["missing"] = breakdown[category].get("missing", 0) + 1
        
        # Process extra skills
        for skill in extra_skills:
            category = skill.category
            if category not in breakdown:
                breakdown[category] = {"matched": 0, "missing": 0, "extra": 0}
            breakdown[category]["extra"] = breakdown[category].get("extra", 0) + 1
        
        return breakdown
    
    @staticmethod
    def categorize_skills(skills: List[Skill]) -> Dict[str, List[Skill]]:
        """
        Categorize skills by type.
        
        Args:
            skills: List of skills
            
        Returns:
            Dictionary with categorized skills
        """
        categorized = {
            "technical": [],
            "soft_skills": [],
            "methodologies": [],
            "other": []
        }
        
        for skill in skills:
            if skill.category in GapAnalyzer.TECHNICAL_CATEGORIES:
                categorized["technical"].append(skill)
            elif skill.category in GapAnalyzer.SOFT_SKILL_CATEGORIES:
                categorized["soft_skills"].append(skill)
            elif skill.category in GapAnalyzer.METHODOLOGY_CATEGORIES:
                categorized["methodologies"].append(skill)
            else:
                categorized["other"].append(skill)
        
        return categorized
    
    @staticmethod
    def get_match_type_distribution(matched_skills: List[SkillMatch]) -> Dict[str, int]:
        """
        Get distribution of match types.
        
        Args:
            matched_skills: List of matched skills
            
        Returns:
            Dictionary with match type counts
        """
        distribution = {
            "exact": 0,
            "synonym": 0,
            "fuzzy": 0,
            "category": 0
        }
        
        for match in matched_skills:
            match_type = match.match_type
            if match_type in distribution:
                distribution[match_type] += 1
        
        return distribution
    
    @staticmethod
    def get_category_statistics(gap_analysis: GapAnalysis) -> Dict[str, Dict[str, int]]:
        """
        Get detailed statistics by category.
        
        Args:
            gap_analysis: GapAnalysis result
            
        Returns:
            Dictionary with category statistics
        """
        stats = {}
        
        for category, counts in gap_analysis.category_breakdown.items():
            stats[category] = {
                "matched": counts.get("matched", 0),
                "missing": counts.get("missing", 0),
                "extra": counts.get("extra", 0),
                "total_resume": counts.get("matched", 0) + counts.get("extra", 0),
                "total_jd": counts.get("matched", 0) + counts.get("missing", 0),
            }
        
        return stats


# Global gap analyzer instance
gap_analyzer = GapAnalyzer()

