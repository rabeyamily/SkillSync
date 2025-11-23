"""
Skill taxonomy and categories.
"""
from enum import Enum


class SkillCategory(str, Enum):
    """Skill categories for classification."""
    
    # Technical Skills
    PROGRAMMING_LANGUAGES = "programming_languages"
    FRAMEWORKS_LIBRARIES = "frameworks_libraries"
    TOOLS_PLATFORMS = "tools_platforms"
    DATABASES = "databases"
    CLOUD_SERVICES = "cloud_services"
    DEVOPS = "devops"
    
    # Conceptual Skills
    SOFTWARE_ARCHITECTURE = "software_architecture"
    MACHINE_LEARNING = "machine_learning"
    BLOCKCHAIN = "blockchain"
    CYBERSECURITY = "cybersecurity"
    DATA_SCIENCE = "data_science"
    
    # Soft Skills
    LEADERSHIP = "leadership"
    COMMUNICATION = "communication"
    COLLABORATION = "collaboration"
    PROBLEM_SOLVING = "problem_solving"
    ANALYTICAL_THINKING = "analytical_thinking"
    
    # Methodologies
    AGILE = "agile"
    SCRUM = "scrum"
    CI_CD = "ci_cd"
    DESIGN_THINKING = "design_thinking"
    
    # Education & Certifications
    EDUCATION = "education"
    CERTIFICATIONS = "certifications"
    
    # Domain Knowledge
    FINTECH = "fintech"
    HEALTHCARE_IT = "healthcare_it"
    E_COMMERCE = "e_commerce"
    OTHER = "other"


SKILL_CATEGORY_DESCRIPTIONS = {
    SkillCategory.PROGRAMMING_LANGUAGES: "Programming languages (Python, Java, JavaScript, etc.)",
    SkillCategory.FRAMEWORKS_LIBRARIES: "Frameworks and libraries (React, Django, Spring Boot, etc.)",
    SkillCategory.TOOLS_PLATFORMS: "Development tools and platforms (Git, Docker, AWS, etc.)",
    SkillCategory.DATABASES: "Database technologies (PostgreSQL, MongoDB, Redis, etc.)",
    SkillCategory.CLOUD_SERVICES: "Cloud services (AWS, Azure, GCP, etc.)",
    SkillCategory.DEVOPS: "DevOps tools and practices (Kubernetes, Terraform, Jenkins, etc.)",
    SkillCategory.SOFTWARE_ARCHITECTURE: "Software architecture patterns and concepts",
    SkillCategory.MACHINE_LEARNING: "Machine learning and AI technologies",
    SkillCategory.BLOCKCHAIN: "Blockchain technologies (Solidity, Ethereum, etc.)",
    SkillCategory.CYBERSECURITY: "Cybersecurity skills and tools",
    SkillCategory.DATA_SCIENCE: "Data science and analytics",
    SkillCategory.LEADERSHIP: "Leadership skills",
    SkillCategory.COMMUNICATION: "Communication skills",
    SkillCategory.COLLABORATION: "Collaboration and teamwork",
    SkillCategory.PROBLEM_SOLVING: "Problem-solving abilities",
    SkillCategory.ANALYTICAL_THINKING: "Analytical thinking",
    SkillCategory.AGILE: "Agile methodologies",
    SkillCategory.SCRUM: "Scrum practices",
    SkillCategory.CI_CD: "CI/CD practices",
    SkillCategory.DESIGN_THINKING: "Design thinking",
    SkillCategory.EDUCATION: "Education requirements",
    SkillCategory.CERTIFICATIONS: "Professional certifications",
    SkillCategory.FINTECH: "Financial technology domain",
    SkillCategory.HEALTHCARE_IT: "Healthcare IT domain",
    SkillCategory.E_COMMERCE: "E-commerce domain",
    SkillCategory.OTHER: "Other skills",
}

