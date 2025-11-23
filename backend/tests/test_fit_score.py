"""
Unit tests for fit score calculation.
"""
import pytest
from app.models.schemas import Skill, SkillExtractionResult, GapAnalysis, SkillMatch
from app.models.skill_taxonomy import SkillCategory
from app.services.fit_score import FitScoreCalculator
from app.services.gap_analysis import GapAnalyzer


class TestFitScoreCalculator:
    """Test cases for fit score calculation."""

    def test_perfect_match(self):
        """Test perfect match scenario."""
        resume_skills = [
            Skill(name="Python", category=SkillCategory.PROGRAMMING_LANGUAGES),
        ]
        jd_skills = [
            Skill(name="Python", category=SkillCategory.PROGRAMMING_LANGUAGES),
        ]
        
        resume_result = SkillExtractionResult(skills=resume_skills, raw_text="Python developer")
        jd_result = SkillExtractionResult(skills=jd_skills, raw_text="Looking for Python developer")
        
        gap_analysis = GapAnalyzer.analyze_gap(resume_result, jd_result)
        fit_score = FitScoreCalculator.calculate_fit_score(
            gap_analysis, resume_result, jd_result
        )
        
        assert fit_score.overall_score == 100.0
        assert fit_score.technical_score == 100.0
        assert fit_score.matched_count == 1
        assert fit_score.missing_count == 0

    def test_no_match(self):
        """Test no match scenario."""
        resume_skills = [
            Skill(name="Python", category=SkillCategory.PROGRAMMING_LANGUAGES),
        ]
        jd_skills = [
            Skill(name="Java", category=SkillCategory.PROGRAMMING_LANGUAGES),
        ]
        
        resume_result = SkillExtractionResult(skills=resume_skills, raw_text="Python developer")
        jd_result = SkillExtractionResult(skills=jd_skills, raw_text="Looking for Java developer")
        
        gap_analysis = GapAnalyzer.analyze_gap(resume_result, jd_result)
        fit_score = FitScoreCalculator.calculate_fit_score(
            gap_analysis, resume_result, jd_result
        )
        
        # When no match, technical score is 0, but soft skills score is 100% (no soft skills in JD)
        # Overall score = 0.0 * 0.7 + 1.0 * 0.3 = 0.3 = 30%
        assert fit_score.overall_score == 30.0  # This is correct behavior
        assert fit_score.matched_count == 0
        assert fit_score.missing_count == 1
        assert fit_score.technical_score == 0.0

    def test_partial_match(self):
        """Test partial match scenario."""
        resume_skills = [
            Skill(name="Python", category=SkillCategory.PROGRAMMING_LANGUAGES),
        ]
        jd_skills = [
            Skill(name="Python", category=SkillCategory.PROGRAMMING_LANGUAGES),
            Skill(name="Java", category=SkillCategory.PROGRAMMING_LANGUAGES),
        ]
        
        resume_result = SkillExtractionResult(skills=resume_skills, raw_text="Python developer")
        jd_result = SkillExtractionResult(skills=jd_skills, raw_text="Looking for Python and Java developer")
        
        gap_analysis = GapAnalyzer.analyze_gap(resume_result, jd_result)
        fit_score = FitScoreCalculator.calculate_fit_score(
            gap_analysis, resume_result, jd_result
        )
        
        assert 0 < fit_score.overall_score < 100
        assert fit_score.matched_count == 1
        assert fit_score.missing_count == 1

    def test_custom_weights(self):
        """Test custom weight configuration."""
        resume_skills = [
            Skill(name="Python", category=SkillCategory.PROGRAMMING_LANGUAGES),
        ]
        jd_skills = [
            Skill(name="Python", category=SkillCategory.PROGRAMMING_LANGUAGES),
        ]
        
        resume_result = SkillExtractionResult(skills=resume_skills, raw_text="Python developer")
        jd_result = SkillExtractionResult(skills=jd_skills, raw_text="Looking for Python developer")
        
        gap_analysis = GapAnalyzer.analyze_gap(resume_result, jd_result)
        fit_score = FitScoreCalculator.calculate_fit_score(
            gap_analysis,
            resume_result,
            jd_result,
            technical_weight=0.8,
            soft_skills_weight=0.2,
        )
        
        assert fit_score.technical_weight == 0.8
        assert fit_score.soft_skills_weight == 0.2

    def test_empty_jd_skills(self):
        """Test when JD has no skills."""
        resume_skills = [
            Skill(name="Python", category=SkillCategory.PROGRAMMING_LANGUAGES),
        ]
        jd_skills = []
        
        resume_result = SkillExtractionResult(skills=resume_skills, raw_text="Python developer")
        jd_result = SkillExtractionResult(skills=jd_skills, raw_text="Job description")
        
        gap_analysis = GapAnalyzer.analyze_gap(resume_result, jd_result)
        fit_score = FitScoreCalculator.calculate_fit_score(
            gap_analysis, resume_result, jd_result
        )
        
        # Should return perfect score when no JD skills
        assert fit_score.technical_score == 100.0

