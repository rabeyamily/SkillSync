"""
Unit tests for gap analysis.
"""
import pytest
from app.models.schemas import Skill, SkillExtractionResult
from app.models.skill_taxonomy import SkillCategory
from app.services.gap_analysis import GapAnalyzer


class TestGapAnalyzer:
    """Test cases for gap analysis."""

    def test_basic_gap_analysis(self):
        """Test basic gap analysis."""
        resume_skills = [
            Skill(name="Python", category=SkillCategory.PROGRAMMING_LANGUAGES),
            Skill(name="JavaScript", category=SkillCategory.PROGRAMMING_LANGUAGES),
        ]
        jd_skills = [
            Skill(name="Python", category=SkillCategory.PROGRAMMING_LANGUAGES),
            Skill(name="Java", category=SkillCategory.PROGRAMMING_LANGUAGES),
        ]
        
        resume_result = SkillExtractionResult(skills=resume_skills, raw_text="Python and JavaScript developer")
        jd_result = SkillExtractionResult(skills=jd_skills, raw_text="Looking for Python and Java developer")
        
        gap_analysis = GapAnalyzer.analyze_gap(resume_result, jd_result)
        
        assert len(gap_analysis.matched_skills) == 1
        assert len(gap_analysis.missing_skills) == 1
        assert len(gap_analysis.extra_skills) == 1
        assert gap_analysis.matched_skills[0].skill.name == "Python"
        assert gap_analysis.missing_skills[0].name == "Java"
        assert gap_analysis.extra_skills[0].name == "JavaScript"

    def test_category_breakdown(self):
        """Test category breakdown generation."""
        resume_skills = [
            Skill(name="Python", category=SkillCategory.PROGRAMMING_LANGUAGES),
        ]
        jd_skills = [
            Skill(name="Python", category=SkillCategory.PROGRAMMING_LANGUAGES),
            Skill(name="React", category=SkillCategory.FRAMEWORKS_LIBRARIES),
        ]
        
        resume_result = SkillExtractionResult(skills=resume_skills, raw_text="Python developer")
        jd_result = SkillExtractionResult(skills=jd_skills, raw_text="Looking for Python and React developer")
        
        gap_analysis = GapAnalyzer.analyze_gap(resume_result, jd_result)
        
        assert SkillCategory.PROGRAMMING_LANGUAGES.value in gap_analysis.category_breakdown
        assert SkillCategory.FRAMEWORKS_LIBRARIES.value in gap_analysis.category_breakdown

    def test_categorize_skills(self):
        """Test skill categorization."""
        skills = [
            Skill(name="Python", category=SkillCategory.PROGRAMMING_LANGUAGES),
            Skill(name="Leadership", category=SkillCategory.LEADERSHIP),
        ]
        
        categorized = GapAnalyzer.categorize_skills(skills)
        
        assert len(categorized["technical"]) == 1
        assert len(categorized["soft_skills"]) == 1
        assert categorized["technical"][0].name == "Python"
        assert categorized["soft_skills"][0].name == "Leadership"

    def test_empty_skills(self):
        """Test with empty skill lists."""
        resume_result = SkillExtractionResult(skills=[], raw_text="")
        jd_result = SkillExtractionResult(skills=[], raw_text="")
        
        gap_analysis = GapAnalyzer.analyze_gap(resume_result, jd_result)
        
        assert len(gap_analysis.matched_skills) == 0
        assert len(gap_analysis.missing_skills) == 0
        assert len(gap_analysis.extra_skills) == 0

    def test_match_type_distribution(self):
        """Test match type distribution."""
        resume_skills = [
            Skill(name="Python", category=SkillCategory.PROGRAMMING_LANGUAGES),
            Skill(name="JavaScript", category=SkillCategory.PROGRAMMING_LANGUAGES),
        ]
        jd_skills = [
            Skill(name="Python", category=SkillCategory.PROGRAMMING_LANGUAGES),
            Skill(name="JS", category=SkillCategory.PROGRAMMING_LANGUAGES),  # Synonym match
        ]
        
        resume_result = SkillExtractionResult(skills=resume_skills, raw_text="Python and JavaScript developer")
        jd_result = SkillExtractionResult(skills=jd_skills, raw_text="Looking for Python and JS developer")
        
        gap_analysis = GapAnalyzer.analyze_gap(resume_result, jd_result)
        distribution = GapAnalyzer.get_match_type_distribution(gap_analysis.matched_skills)
        
        assert "exact" in distribution
        assert "synonym" in distribution or "fuzzy" in distribution

