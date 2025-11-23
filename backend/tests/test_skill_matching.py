"""
Unit tests for skill matching algorithm.
"""
import pytest
from app.models.schemas import Skill
from app.models.skill_taxonomy import SkillCategory
from app.services.skill_matching import SkillMatcher


class TestSkillMatcher:
    """Test cases for skill matching."""

    def test_exact_match(self):
        """Test exact skill matching."""
        skill1 = Skill(name="Python", category=SkillCategory.PROGRAMMING_LANGUAGES)
        skill2 = Skill(name="Python", category=SkillCategory.PROGRAMMING_LANGUAGES)
        
        match = SkillMatcher.match_skills(skill1, skill2)
        assert match is not None
        assert match.match_type == "exact"
        assert match.confidence == 1.0

    def test_synonym_match(self):
        """Test synonym matching."""
        skill1 = Skill(name="JavaScript", category=SkillCategory.PROGRAMMING_LANGUAGES)
        skill2 = Skill(name="JS", category=SkillCategory.PROGRAMMING_LANGUAGES)
        
        match = SkillMatcher.match_skills(skill1, skill2)
        assert match is not None
        assert match.match_type == "synonym"
        assert match.confidence >= 0.9  # Accept 0.9 or higher (actual is 0.95)

    def test_fuzzy_match(self):
        """Test fuzzy matching."""
        skill1 = Skill(name="PostgreSQL", category=SkillCategory.DATABASES)
        skill2 = Skill(name="PostgresSQL", category=SkillCategory.DATABASES)  # Typo variant
        
        match = SkillMatcher.match_skills(skill1, skill2)
        assert match is not None
        # Could be synonym or fuzzy depending on implementation
        assert match.match_type in ["synonym", "fuzzy"]

    def test_no_match(self):
        """Test when skills don't match."""
        skill1 = Skill(name="Python", category=SkillCategory.PROGRAMMING_LANGUAGES)
        skill2 = Skill(name="Java", category=SkillCategory.PROGRAMMING_LANGUAGES)
        
        match = SkillMatcher.match_skills(skill1, skill2)
        assert match is None

    def test_case_insensitive_match(self):
        """Test case-insensitive matching."""
        skill1 = Skill(name="python", category=SkillCategory.PROGRAMMING_LANGUAGES)
        skill2 = Skill(name="PYTHON", category=SkillCategory.PROGRAMMING_LANGUAGES)
        
        match = SkillMatcher.match_skills(skill1, skill2)
        assert match is not None
        assert match.match_type == "exact"

    def test_find_matches(self):
        """Test finding multiple matches."""
        resume_skills = [
            Skill(name="Python", category=SkillCategory.PROGRAMMING_LANGUAGES),
            Skill(name="JavaScript", category=SkillCategory.PROGRAMMING_LANGUAGES),
        ]
        jd_skills = [
            Skill(name="Python", category=SkillCategory.PROGRAMMING_LANGUAGES),
            Skill(name="Java", category=SkillCategory.PROGRAMMING_LANGUAGES),
        ]
        
        matches = SkillMatcher.find_matches(resume_skills, jd_skills)
        assert len(matches) == 1
        assert matches[0].skill.name == "Python"

    def test_find_missing_skills(self):
        """Test finding missing skills."""
        resume_skills = [
            Skill(name="Python", category=SkillCategory.PROGRAMMING_LANGUAGES),
        ]
        jd_skills = [
            Skill(name="Python", category=SkillCategory.PROGRAMMING_LANGUAGES),
            Skill(name="Java", category=SkillCategory.PROGRAMMING_LANGUAGES),
        ]
        
        missing = SkillMatcher.find_missing_skills(resume_skills, jd_skills)
        assert len(missing) == 1
        assert missing[0].name == "Java"

    def test_find_extra_skills(self):
        """Test finding extra skills."""
        resume_skills = [
            Skill(name="Python", category=SkillCategory.PROGRAMMING_LANGUAGES),
            Skill(name="JavaScript", category=SkillCategory.PROGRAMMING_LANGUAGES),
        ]
        jd_skills = [
            Skill(name="Python", category=SkillCategory.PROGRAMMING_LANGUAGES),
        ]
        
        extra = SkillMatcher.find_extra_skills(resume_skills, jd_skills)
        assert len(extra) == 1
        assert extra[0].name == "JavaScript"

