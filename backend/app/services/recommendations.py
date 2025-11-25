"""
Recommendations generator for skill gap analysis.
"""
from typing import List, Dict, Any
from urllib.parse import quote
from app.models.schemas import GapAnalysis, SkillMatch, Skill


class RecommendationsGenerator:
    """Generate personalized recommendations based on gap analysis."""
    
    @staticmethod
    def _generate_linkedin_learning_url(skill_name: str) -> str:
        """
        Generate Coursera search URL for a skill. (Currently using Coursera instead of LinkedIn Learning)
        
        Args:
            skill_name: Name of the skill to search for
            
        Returns:
            Coursera search URL
        """
        encoded_skill = quote(skill_name)
        return f"https://www.coursera.org/search?query={encoded_skill}"

    @staticmethod
    def _generate_coursera_search_url(skill_name: str) -> str:
        """Generate a Coursera search URL; kept separate for clarity/compat."""
        return RecommendationsGenerator._generate_linkedin_learning_url(skill_name)
    
    @staticmethod
    def generate_recommendations(
        gap_analysis: GapAnalysis,
        overall_score: float
    ) -> List[str]:
        """
        Generate personalized recommendations based on gap analysis.
        
        Args:
            gap_analysis: GapAnalysis result
            overall_score: Overall fit score (0-100)
            
        Returns:
            List of recommendation strings
        """
        recommendations = []
        
        # Overall score recommendations
        if overall_score >= 80:
            recommendations.append(
                "🎉 Excellent match! Your skills align well with the job requirements. "
                "Focus on highlighting your strengths in your application."
            )
        elif overall_score >= 60:
            recommendations.append(
                "✅ Good match! You have a solid foundation. Consider focusing on "
                "the missing skills below to improve your fit."
            )
        elif overall_score >= 40:
            recommendations.append(
                "⚠️ Moderate match. You have some relevant skills, but there are "
                "significant gaps. Consider upskilling in the areas below."
            )
        else:
            recommendations.append(
                "❌ Low match. This role may require significant skill development. "
                "Consider whether this is the right opportunity or if you're willing "
                "to invest in learning the required skills."
            )
        
        # Missing skills recommendations
        missing_skills = gap_analysis.missing_skills
        
        if missing_skills:
            # Categorize missing skills
            technical_missing = [
                s for s in missing_skills
                if s.category in [
                    "programming_languages", "frameworks_libraries", "tools_platforms",
                    "databases", "cloud_services", "devops", "software_architecture",
                    "machine_learning", "data_science"
                ]
            ]
            
            soft_missing = [
                s for s in missing_skills
                if s.category in [
                    "leadership", "communication", "collaboration",
                    "problem_solving", "analytical_thinking"
                ]
            ]
            
            # Technical skills recommendations with Coursera links
            if technical_missing:
                top_missing = technical_missing[:5]  # Top 5 missing technical skills
                skill_names = [s.name for s in top_missing]
                skill_links = [RecommendationsGenerator._generate_linkedin_learning_url(s.name) for s in top_missing]
                
                # Create recommendation with links
                rec_text = f"📚 Prioritize learning these technical skills: {', '.join(skill_names)}. "
                rec_text += "Search Coursera for high-quality courses to build proficiency."
                recommendations.append(rec_text)
            
            # Soft skills recommendations
            if soft_missing:
                skill_names = [s.name for s in soft_missing]
                recommendations.append(
                    f"🤝 Develop these soft skills: {', '.join(skill_names)}. "
                    "Consider joining professional groups, taking communication courses, "
                    "or seeking mentorship opportunities."
                )
            
            # Methodology recommendations
            methodology_missing = [
                s for s in missing_skills
                if s.category in ["agile", "scrum", "ci_cd", "design_thinking"]
            ]
            
            if methodology_missing:
                skill_names = [s.name for s in methodology_missing]
                recommendations.append(
                    f"🔄 Learn these methodologies: {', '.join(skill_names)}. "
                    "Consider certifications or training programs to demonstrate proficiency."
                )
        
        # Extra skills recommendations
        extra_skills = gap_analysis.extra_skills
        
        if extra_skills:
            top_extra = extra_skills[:3]  # Top 3 extra skills
            skill_names = [s.name for s in top_extra]
            recommendations.append(
                f"💡 Highlight these additional skills in your application: {', '.join(skill_names)}. "
                "These can differentiate you from other candidates."
            )
        
        # Match quality recommendations
        matched_skills = gap_analysis.matched_skills
        
        if matched_skills:
            # Count match types
            exact_matches = sum(1 for m in matched_skills if m.match_type == "exact")
            fuzzy_matches = sum(1 for m in matched_skills if m.match_type == "fuzzy")
            
            if fuzzy_matches > 0:
                recommendations.append(
                    f"📝 Note: {fuzzy_matches} of your skills matched with lower confidence. "
                    "Consider updating your resume to use the exact terminology from the job description "
                    "to improve keyword matching."
                )
        
        # Category-specific recommendations
        category_breakdown = gap_analysis.category_breakdown
        
        # Find categories with high missing counts
        high_missing_categories = [
            cat for cat, counts in category_breakdown.items()
            if counts.get("missing", 0) >= 3
        ]
        
        if high_missing_categories:
            recommendations.append(
                f"🎯 Focus areas: {', '.join(high_missing_categories)}. "
                "These categories have multiple missing skills—prioritize learning in these areas."
            )
        
        # Ensure we have at least some recommendations
        if not recommendations:
            recommendations.append(
                "📊 Review the detailed breakdown above to identify specific areas for improvement."
            )
        
        return recommendations
    
    @staticmethod
    def generate_course_recommendations(
        gap_analysis: GapAnalysis
    ) -> List[Dict[str, Any]]:
        """
        Generate course recommendations with Coursera links for all missing skills.
        
        Args:
            gap_analysis: GapAnalysis result
            
        Returns:
            List of course recommendation dictionaries with skill name and Coursera search URL
            for ALL missing skills (no prioritization or limits)
        """
        course_recommendations = []
        missing_skills = gap_analysis.missing_skills
        
        # Generate recommendations for ALL missing skills without any prioritization or limits
        for skill in missing_skills:
            course_recommendations.append({
                "skill_name": skill.name,
                "category": str(skill.category) if skill.category else "other",
                "course_url": RecommendationsGenerator._generate_coursera_search_url(skill.name),
                "platform": "Coursera"
            })
        
        return course_recommendations


# Global recommendations generator instance
recommendations_generator = RecommendationsGenerator()

