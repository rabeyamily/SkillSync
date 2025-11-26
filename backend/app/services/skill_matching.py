"""
Skill matching algorithm for comparing skills between resume and job description.
"""
import re
from typing import List, Dict, Tuple, Optional, Set
from difflib import SequenceMatcher
try:
    from Levenshtein import ratio as levenshtein_ratio
except ImportError:
    # Fallback if Levenshtein not available
    def levenshtein_ratio(s1: str, s2: str) -> float:
        return SequenceMatcher(None, s1, s2).ratio()

from app.models.schemas import Skill, SkillMatch
from app.models.skill_taxonomy import SkillCategory


class SkillMatcher:
    """Skill matching algorithm with exact, synonym, and fuzzy matching."""
    
    # Synonym dictionary for common skill aliases
    SKILL_SYNONYMS: Dict[str, Set[str]] = {
        # Programming Languages
        "javascript": {"js", "ecmascript", "nodejs", "node.js", "ecma script"},
        "typescript": {"ts", "typescript"},
        "c++": {"cpp", "c plus plus", "cplusplus", "cxx"},
        "c#": {"csharp", "c-sharp", "dotnet", ".net", "dot net", "csharp"},
        "python": {"py", "python3", "python 3"},
        "java": {"jvm", "java se", "java ee"},
        "go": {"golang"},
        "ruby": {"ruby on rails", "ror"},
        "php": {"php7", "php 7", "php8", "php 8"},
        "swift": {"swiftui"},
        "kotlin": {"kotlin android"},
        "rust": {"rustlang"},
        "r": {"r language", "r programming"},
        "matlab": {"matlab programming"},
        
        # Frameworks
        "react": {"reactjs", "react.js", "reactjs", "react native"},
        "angular": {"angularjs", "angular.js", "angular 2", "angular2"},
        "vue": {"vuejs", "vue.js", "vue 3", "vue3"},
        "node.js": {"nodejs", "node", "npm", "nodejs"},
        "spring boot": {"springboot", "spring", "spring framework"},
        "django": {"django framework"},
        "flask": {"flask framework"},
        "express": {"express.js", "expressjs"},
        "next.js": {"nextjs", "next"},
        "nuxt": {"nuxt.js", "nuxtjs"},
        "laravel": {"laravel framework"},
        "symfony": {"symfony framework"},
        
        # Tools & Platforms
        "aws": {"amazon web services", "amazon aws", "aws cloud"},
        "azure": {"microsoft azure", "azure cloud"},
        "gcp": {"google cloud", "google cloud platform", "gcp cloud"},
        "kubernetes": {"k8s", "kubernetes cluster"},
        "docker": {"docker container", "docker compose"},
        "git": {"git version control", "git scm"},
        "jenkins": {"jenkins ci", "jenkins pipeline"},
        "terraform": {"terraform iac"},
        "ansible": {"ansible automation"},
        "ci/cd": {"cicd", "continuous integration", "continuous deployment", "ci cd", "ci-cd"},
        "github": {"github actions", "github ci"},
        "gitlab": {"gitlab ci", "gitlab pipeline"},
        
        # Databases
        "postgresql": {"postgres", "postgres db", "postgresql database"},
        "mongodb": {"mongo", "mongo db", "mongodb database"},
        "mysql": {"mysql database", "mysql db"},
        "redis": {"redis cache", "redis database"},
        "sqlite": {"sqlite database", "sqlite db"},
        "oracle": {"oracle database", "oracle db"},
        "sql server": {"mssql", "microsoft sql server", "sqlserver"},
        "elasticsearch": {"elastic search", "es"},
        "cassandra": {"apache cassandra"},
        "dynamodb": {"dynamo db", "aws dynamodb"},
        
        # Methodologies
        "agile": {"agile methodology", "agile development", "agile practices"},
        "scrum": {"scrum methodology", "scrum framework", "scrum master"},
        "kanban": {"kanban board", "kanban methodology"},
        "devops": {"dev ops", "dev-ops"},
        "microservices": {"micro services", "micro-services", "microservice architecture"},
        
        # Soft Skills
        "problem solving": {"problem-solving", "troubleshooting", "debugging", "problem solving skills"},
        "communication": {"communication skills", "verbal communication", "written communication", "interpersonal communication"},
        "leadership": {"leadership skills", "team leadership", "leadership experience"},
        "collaboration": {"team collaboration", "collaborative skills", "teamwork"},
        "analytical thinking": {"analytical skills", "analytical reasoning", "critical thinking"},
    }
    
    # Normalization rules
    NORMALIZATION_RULES = {
        r'\.js$': '',  # Remove .js suffix
        r'\.jsx$': '',  # Remove .jsx suffix
        r'\.ts$': '',  # Remove .ts suffix
        r'\.tsx$': '',  # Remove .tsx suffix
        r'\s+': ' ',  # Normalize whitespace
        r'[-_]': ' ',  # Replace hyphens/underscores with spaces
        r'\s+v?\d+\.?\d*\.?\d*': '',  # Remove version numbers (e.g., "Python 3.9" -> "Python", "React 18.2.0" -> "React")
        r'\s+\(.*?\)': '',  # Remove parenthetical content (e.g., "Python (3.9)" -> "Python")
    }
    
    # Fuzzy matching threshold
    FUZZY_THRESHOLD = 0.75  # 75% similarity for fuzzy match (lowered from 0.85 for better matching)
    
    # Match type priority (higher = better match)
    MATCH_PRIORITY = {
        "exact": 5,
        "synonym": 4,
        "fuzzy": 3,
        "cross_category": 2,  # Cross-category match (same name, different category)
        "category": 1
    }
    
    @staticmethod
    def normalize_skill_name(skill_name: str) -> str:
        """
        Normalize skill name for comparison.
        
        Args:
            skill_name: Skill name to normalize
            
        Returns:
            Normalized skill name
        """
        if not skill_name:
            return ""
        
        normalized = skill_name.lower().strip()
        
        # Apply normalization rules
        for pattern, replacement in SkillMatcher.NORMALIZATION_RULES.items():
            normalized = re.sub(pattern, replacement, normalized)
        
        # Remove extra whitespace
        normalized = re.sub(r'\s+', ' ', normalized).strip()
        
        # Remove common prefixes/suffixes
        normalized = re.sub(r'^(proficient|experienced|skilled|expert|knowledge|familiar|working|hands-on)\s+', '', normalized)
        normalized = re.sub(r'\s+(experience|proficiency|skills?|knowledge|framework|library|tool|platform|technology)$', '', normalized)
        
        # Remove trailing version info that might have been missed
        normalized = re.sub(r'\s+\d+\.?\d*$', '', normalized)
        
        return normalized
    
    @staticmethod
    def get_synonyms(skill_name: str) -> Set[str]:
        """
        Get synonyms for a skill name.
        
        Args:
            skill_name: Skill name
            
        Returns:
            Set of synonyms including the skill name itself
        """
        normalized = SkillMatcher.normalize_skill_name(skill_name)
        synonyms = {normalized}
        
        # Check direct synonym mapping
        for key, values in SkillMatcher.SKILL_SYNONYMS.items():
            if normalized == key or normalized in values:
                synonyms.add(key)
                synonyms.update(values)
            elif normalized in [SkillMatcher.normalize_skill_name(k) for k in [key] + list(values)]:
                synonyms.add(key)
                synonyms.update(values)
        
        # Reverse lookup: find if normalized name matches any synonym
        for key, values in SkillMatcher.SKILL_SYNONYMS.items():
            if normalized == SkillMatcher.normalize_skill_name(key):
                synonyms.add(key)
                synonyms.update(values)
        
        return synonyms
    
    @staticmethod
    def exact_match(skill1: Skill, skill2: Skill) -> bool:
        """
        Check if two skills are exact matches.
        
        Args:
            skill1: First skill
            skill2: Second skill
            
        Returns:
            True if exact match
        """
        name1 = SkillMatcher.normalize_skill_name(skill1.name)
        name2 = SkillMatcher.normalize_skill_name(skill2.name)
        
        return name1 == name2
    
    @staticmethod
    def synonym_match(skill1: Skill, skill2: Skill) -> bool:
        """
        Check if two skills are synonyms.
        
        Args:
            skill1: First skill
            skill2: Second skill
            
        Returns:
            True if synonym match
        """
        synonyms1 = SkillMatcher.get_synonyms(skill1.name)
        synonyms2 = SkillMatcher.get_synonyms(skill2.name)
        
        return bool(synonyms1 & synonyms2)  # Check intersection
    
    @staticmethod
    def fuzzy_match(skill1: Skill, skill2: Skill, threshold: float = None) -> Tuple[bool, float]:
        """
        Check if two skills match using fuzzy matching.
        
        Args:
            skill1: First skill
            skill2: Second skill
            threshold: Similarity threshold (default: FUZZY_THRESHOLD)
            
        Returns:
            Tuple of (is_match, similarity_score)
        """
        if threshold is None:
            threshold = SkillMatcher.FUZZY_THRESHOLD
        
        name1 = SkillMatcher.normalize_skill_name(skill1.name)
        name2 = SkillMatcher.normalize_skill_name(skill2.name)
        
        similarity = levenshtein_ratio(name1, name2)
        
        return similarity >= threshold, similarity
    
    @staticmethod
    def category_match(skill1: Skill, skill2: Skill) -> bool:
        """
        Check if two skills match at category level.
        
        Args:
            skill1: First skill
            skill2: Second skill
            
        Returns:
            True if same category
        """
        return skill1.category == skill2.category
    
    @staticmethod
    def match_skills(skill1: Skill, skill2: Skill) -> Optional[SkillMatch]:
        """
        Match two skills and return match result.
        Uses a cascading approach: tries each match type in order until one succeeds.
        Now includes cross-category matching for better accuracy.
        
        Args:
            skill1: First skill
            skill2: Second skill
            
        Returns:
            SkillMatch if match found, None otherwise
        """
        # Define match strategies in priority order (highest to lowest)
        match_strategies = [
            {
                "name": "exact",
                "check": lambda: SkillMatcher.exact_match(skill1, skill2)
            },
            {
                "name": "synonym",
                "check": lambda: SkillMatcher.synonym_match(skill1, skill2)
            },
            {
                "name": "fuzzy",
                "check": lambda: SkillMatcher.fuzzy_match(skill1, skill2)[0]
            },
            {
                "name": "cross_category",
                "check": lambda: (
                    # Cross-category matching: same normalized name but different categories
                    # This handles cases where LLM categorizes the same skill differently
                    SkillMatcher.normalize_skill_name(skill1.name) == SkillMatcher.normalize_skill_name(skill2.name) and
                    skill1.category != skill2.category
                )
            },
            {
                "name": "category",
                "check": lambda: (
                    SkillMatcher.category_match(skill1, skill2) and
                    levenshtein_ratio(
                        SkillMatcher.normalize_skill_name(skill1.name),
                        SkillMatcher.normalize_skill_name(skill2.name)
                    ) >= 0.6
                )
            }
        ]
        
        # Try each strategy in order until one succeeds
        for strategy in match_strategies:
            if strategy["check"]():
                # Return match result (no confidence calculation)
                return SkillMatch(
                    skill=skill1,
                    match_type=strategy["name"]
                )
        
        # No match found
        return None
    
    @staticmethod
    def find_matches(resume_skills: List[Skill], jd_skills: List[Skill]) -> List[SkillMatch]:
        """
        Find all matches between resume skills and JD skills.
        
        Args:
            resume_skills: Skills from resume
            jd_skills: Skills from job description
            
        Returns:
            List of SkillMatch objects
        """
        matches = []
        matched_resume_indices = set()
        
        # Try to match each JD skill with resume skills
        for jd_skill in jd_skills:
            best_match = None
            best_match_index = -1
            best_priority = 0
            
            for idx, resume_skill in enumerate(resume_skills):
                if idx in matched_resume_indices:
                    continue
                
                match = SkillMatcher.match_skills(resume_skill, jd_skill)
                
                # Use match type priority instead of confidence
                if match:
                    match_priority = SkillMatcher.MATCH_PRIORITY.get(match.match_type, 0)
                    if match_priority > best_priority:
                        best_match = match
                        best_match_index = idx
                        best_priority = match_priority
            
            if best_match:
                matches.append(best_match)
                matched_resume_indices.add(best_match_index)
        
        return matches
    
    @staticmethod
    def find_missing_skills(resume_skills: List[Skill], jd_skills: List[Skill]) -> List[Skill]:
        """
        Find skills in JD that are not in resume.
        
        Args:
            resume_skills: Skills from resume
            jd_skills: Skills from job description
            
        Returns:
            List of missing skills
        """
        # Build normalized sets for fast lookup
        resume_normalized_names = {
            SkillMatcher.normalize_skill_name(skill.name)
            for skill in resume_skills
        }
        
        # Track which resume skills have been matched
        matched_resume_normalized = set()
        
        missing = []
        seen_missing = set()
        
        # First pass: find all possible matches (not just greedy best)
        for jd_skill in jd_skills:
            normalized_name = SkillMatcher.normalize_skill_name(jd_skill.name)
            
            # Skip if already processed
            if normalized_name in seen_missing:
                continue
            
            # Check for exact normalized match first (fastest)
            if normalized_name in resume_normalized_names:
                # Mark this resume skill as matched
                matched_resume_normalized.add(normalized_name)
                continue
            
            # Try matching algorithm
            is_matched = False
            for resume_skill in resume_skills:
                resume_normalized = SkillMatcher.normalize_skill_name(resume_skill.name)
                
                # Skip if this resume skill was already matched
                if resume_normalized in matched_resume_normalized:
                    continue
                
                if SkillMatcher.match_skills(resume_skill, jd_skill):
                    is_matched = True
                    matched_resume_normalized.add(resume_normalized)
                    break
            
            if not is_matched:
                missing.append(jd_skill)
                seen_missing.add(normalized_name)
        
        return missing
    
    @staticmethod
    def find_extra_skills(resume_skills: List[Skill], jd_skills: List[Skill]) -> List[Skill]:
        """
        Find skills in resume that are not in JD.
        
        Args:
            resume_skills: Skills from resume
            jd_skills: Skills from job description
            
        Returns:
            List of extra skills
        """
        # Build normalized sets for fast lookup
        jd_normalized_names = {
            SkillMatcher.normalize_skill_name(skill.name)
            for skill in jd_skills
        }
        
        # Track which JD skills have been matched
        matched_jd_normalized = set()
        
        extra = []
        seen_extra = set()
        
        # First pass: find all possible matches (not just greedy best)
        for resume_skill in resume_skills:
            normalized_name = SkillMatcher.normalize_skill_name(resume_skill.name)
            
            # Skip if already processed
            if normalized_name in seen_extra:
                continue
            
            # Check for exact normalized match first (fastest)
            if normalized_name in jd_normalized_names:
                # Mark this JD skill as matched
                matched_jd_normalized.add(normalized_name)
                continue
            
            # Try matching algorithm
            is_matched = False
            for jd_skill in jd_skills:
                jd_normalized = SkillMatcher.normalize_skill_name(jd_skill.name)
                
                # Skip if this JD skill was already matched
                if jd_normalized in matched_jd_normalized:
                    continue
                
                if SkillMatcher.match_skills(resume_skill, jd_skill):
                    is_matched = True
                    matched_jd_normalized.add(jd_normalized)
                    break
            
            if not is_matched:
                extra.append(resume_skill)
                seen_extra.add(normalized_name)
        
        return extra


# Global skill matcher instance
skill_matcher = SkillMatcher()

