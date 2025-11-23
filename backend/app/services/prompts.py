"""
Prompt templates for skill extraction from resumes and job descriptions.
"""
from typing import Dict, List
from app.models.skill_taxonomy import SkillCategory, SKILL_CATEGORY_DESCRIPTIONS


class SkillExtractionPrompts:
    """Prompt templates for skill extraction using LLM."""
    
    # System prompt with taxonomy guidelines
    SYSTEM_PROMPT = """You are an expert at extracting and categorizing skills from resumes and job descriptions. 
Your task is to identify technical skills, soft skills, education requirements, and certifications from text with high accuracy and consistency.

SKILL CATEGORIES (with detailed examples):
- programming_languages: Python, Java, JavaScript, C++, Go, Rust, TypeScript, Ruby, PHP, Swift, Kotlin, Scala, R, MATLAB, etc.
- frameworks_libraries: React, Angular, Vue.js, Django, Flask, Spring Boot, Express.js, TensorFlow, PyTorch, NumPy, Pandas, etc.
- tools_platforms: Git, Docker, Jira, VS Code, IntelliJ IDEA, Eclipse, Postman, Jenkins, GitHub Actions, etc.
- databases: PostgreSQL, MySQL, MongoDB, Redis, Oracle, SQL Server, Cassandra, DynamoDB, Elasticsearch, etc.
- cloud_services: AWS (EC2, S3, Lambda, etc.), Azure, Google Cloud Platform (GCP), Heroku, DigitalOcean, etc.
- devops: Kubernetes, Docker Swarm, Terraform, Ansible, Jenkins, GitLab CI, GitHub Actions, Prometheus, Grafana, etc.
- software_architecture: Microservices, REST APIs, GraphQL, Design Patterns, System Design, SOA, Event-Driven Architecture, etc.
- machine_learning: Neural Networks, NLP, Computer Vision, Deep Learning, Reinforcement Learning, Scikit-learn, etc.
- blockchain: Solidity, Ethereum, Smart Contracts, Web3, Hyperledger, Bitcoin, etc.
- cybersecurity: Penetration Testing, Security Protocols, Encryption, OWASP, Firewall, IDS/IPS, Vulnerability Assessment, etc.
- data_science: Data Analysis, Statistics, Data Visualization, ETL, Data Warehousing, Business Intelligence, etc.
- leadership: Team Management, Mentoring, Strategic Planning, Project Management, People Management, etc.
- communication: Technical Writing, Presentations, Public Speaking, Cross-functional Collaboration, Client Communication, etc.
- collaboration: Teamwork, Pair Programming, Code Reviews, Cross-team Collaboration, Stakeholder Management, etc.
- problem_solving: Debugging, Troubleshooting, Critical Thinking, Root Cause Analysis, Algorithm Design, etc.
- analytical_thinking: Data Analysis, Logical Reasoning, Pattern Recognition, Systems Thinking, etc.
- agile: Agile Development, Sprint Planning, User Stories, Kanban, Lean, etc.
- scrum: Scrum Master, Sprint Retrospectives, Daily Standups, Product Owner, etc.
- ci_cd: Continuous Integration, Continuous Deployment, Pipeline Automation, Build Automation, etc.
- design_thinking: User-Centered Design, Prototyping, User Research, UX/UI Design, Wireframing, etc.
- fintech: Payment Systems, Banking Software, Financial APIs, Trading Platforms, Risk Management, etc.
- healthcare_it: EHR Systems, HIPAA Compliance, Medical Software, Health Information Systems, etc.
- e_commerce: Online Retail, Payment Processing, Inventory Management, Shopping Cart Systems, etc.
- other: Any skills that don't fit the above categories

CRITICAL EXTRACTION RULES:
1. EXACT MATCHING: Extract only skills that are EXPLICITLY mentioned in the text. Do NOT infer or assume skills.
2. SKILL NORMALIZATION: 
   - Use standard capitalization (e.g., "Python" not "python" or "PYTHON")
   - Handle variations: "React.js" → "React", "Node.js" → "Node.js", "C++" → "C++"
   - Expand common abbreviations: "JS" → "JavaScript" (if context is clear), "SQL" → "SQL" (keep as is)
   - Keep version numbers if specific: "Python 3.9" → "Python 3.9", but "Python" is preferred if version is not critical
3. DUPLICATE PREVENTION:
   - Check for duplicates using normalized names (case-insensitive, ignoring punctuation variations)
   - "Python" and "python" are the same → include only once
   - "React" and "React.js" are the same → include only once as "React"
   - "AWS" and "Amazon Web Services" are the same → include as "AWS"
4. CATEGORIZATION:
   - Choose the MOST SPECIFIC category that fits
   - If a skill could fit multiple categories, choose the most technical/primary one
   - Cloud platforms go in "cloud_services", not "tools_platforms"
   - CI/CD tools can be "devops" or "ci_cd" - prefer "ci_cd" for practices, "devops" for tools
5. AMBIGUITY HANDLING:
   - If a skill mention is unclear or ambiguous, extract it but use the most likely interpretation
   - If you're uncertain about a category, choose the closest match
   - When in doubt, prefer more specific categories over "other"
6. JOB DESCRIPTION SPECIFICS:
   - Mark skills as "required" only if explicitly stated as "required", "must have", "essential", or "mandatory"
   - Mark skills as "preferred" if stated as "preferred", "nice to have", "bonus", "plus", or "advantageous"
   - If not specified, default to required=false, preferred=false
7. EDUCATION EXTRACTION:
   - Extract degree types: Bachelor's, Master's, PhD, Doctorate, Associate's, etc.
   - Extract field of study: Computer Science, Engineering, Business, etc.
   - Include level if mentioned: "Bachelor's degree" not just "degree"
8. CERTIFICATION EXTRACTION:
   - Extract full certification name: "AWS Certified Solutions Architect" not just "AWS Certified"
   - Extract issuer when mentioned: AWS, Microsoft, Google, etc.
   - Include certification level if specified: "AWS Certified Solutions Architect - Associate"
9. JSON FORMAT:
   - Return ONLY valid JSON, no markdown, no code blocks, no explanations
   - Ensure all strings are properly escaped
   - Use null for missing optional fields, not empty strings
10. QUALITY CHECK:
    - Review extracted skills for accuracy before returning
    - Ensure no duplicates exist
    - Verify categories are appropriate
    - Confirm all required fields are present"""

    # Few-shot examples for better accuracy
    FEW_SHOT_EXAMPLES = [
        {
            "input": "I have 5 years of experience with Python, Django, and PostgreSQL. I'm proficient in Docker and AWS.",
            "output": {
                "skills": [
                    {"name": "Python", "category": "programming_languages"},
                    {"name": "Django", "category": "frameworks_libraries"},
                    {"name": "PostgreSQL", "category": "databases"},
                    {"name": "Docker", "category": "tools_platforms"},
                    {"name": "AWS", "category": "cloud_services"}
                ],
                "education": [],
                "certifications": []
            }
        },
        {
            "input": "Required: Bachelor's degree in Computer Science. Preferred: Master's degree. AWS Certified Solutions Architect preferred.",
            "output": {
                "skills": [],
                "education": [
                    {"degree": "Bachelor's", "field": "Computer Science", "required": True, "preferred": False},
                    {"degree": "Master's", "field": "Computer Science", "required": False, "preferred": True}
                ],
                "certifications": [
                    {"name": "AWS Certified Solutions Architect", "issuer": "AWS", "required": False, "preferred": True}
                ]
            }
        },
        {
            "input": "Strong leadership skills, excellent communication, and ability to work in cross-functional teams.",
            "output": {
                "skills": [
                    {"name": "Leadership", "category": "leadership"},
                    {"name": "Communication", "category": "communication"},
                    {"name": "Cross-functional Collaboration", "category": "collaboration"}
                ],
                "education": [],
                "certifications": []
            }
        },
        {
            "input": "Experience with React.js, Node.js, and MongoDB. Knowledge of JavaScript and TypeScript. Familiar with AWS EC2 and S3.",
            "output": {
                "skills": [
                    {"name": "React", "category": "frameworks_libraries"},
                    {"name": "Node.js", "category": "frameworks_libraries"},
                    {"name": "MongoDB", "category": "databases"},
                    {"name": "JavaScript", "category": "programming_languages"},
                    {"name": "TypeScript", "category": "programming_languages"},
                    {"name": "AWS", "category": "cloud_services"}
                ],
                "education": [],
                "certifications": []
            }
        },
        {
            "input": "Must have: Python, SQL, and Git. Nice to have: Docker, Kubernetes, and Terraform experience.",
            "output": {
                "skills": [
                    {"name": "Python", "category": "programming_languages", "required": True, "preferred": False},
                    {"name": "SQL", "category": "databases", "required": True, "preferred": False},
                    {"name": "Git", "category": "tools_platforms", "required": True, "preferred": False},
                    {"name": "Docker", "category": "tools_platforms", "required": False, "preferred": True},
                    {"name": "Kubernetes", "category": "devops", "required": False, "preferred": True},
                    {"name": "Terraform", "category": "devops", "required": False, "preferred": True}
                ],
                "education": [],
                "certifications": []
            }
        }
    ]
    
    @staticmethod
    def build_skill_extraction_prompt(text: str, source_type: str = "resume") -> List[Dict[str, str]]:
        """
        Build prompt for skill extraction.
        
        Args:
            text: Text to extract skills from
            source_type: Type of source ('resume' or 'job_description')
            
        Returns:
            List of message dictionaries for LLM API
        """
        source_context = "resume" if source_type == "resume" else "job description"
        
        user_prompt = f"""Extract all skills, education requirements, and certifications from the following {source_context} text.

CRITICAL INSTRUCTIONS:
1. Extract ONLY skills explicitly mentioned - do not infer or assume
2. Normalize skill names (standard capitalization, handle variations)
3. Check for duplicates before adding skills
4. Choose the most specific category for each skill
5. For job descriptions, mark required/preferred status based on explicit language
6. Return ONLY valid JSON - no markdown, no code blocks, no explanations

REQUIRED JSON STRUCTURE:
{{
    "skills": [
        {{"name": "skill_name", "category": "category_name", "required": false, "preferred": false}},
        ...
    ],
    "education": [
        {{"degree": "degree_type", "field": "field_of_study", "required": false, "preferred": false}},
        ...
    ],
    "certifications": [
        {{"name": "certification_name", "issuer": "issuer_name", "required": false, "preferred": false}},
        ...
    ]
}}

FIELD REQUIREMENTS:
- skills: Array of skill objects. Each skill must have "name" and "category". Include "required" and "preferred" for job descriptions.
- education: Array of education objects. Include "degree" (required), "field" (if mentioned), "required" and "preferred" for job descriptions.
- certifications: Array of certification objects. Include "name" (required), "issuer" (if mentioned), "required" and "preferred" for job descriptions.

SKILL NORMALIZATION EXAMPLES:
- "react.js" or "React.js" → "React"
- "python" or "PYTHON" → "Python"
- "Amazon Web Services" or "AWS" → "AWS"
- "JS" (in context) → "JavaScript"
- "Node.js" → "Node.js" (keep .js for Node.js)

CATEGORY SELECTION GUIDELINES:
- Programming languages → "programming_languages"
- Frameworks/Libraries → "frameworks_libraries"
- Tools/Platforms → "tools_platforms"
- Databases → "databases"
- Cloud services → "cloud_services"
- DevOps tools → "devops"
- CI/CD practices → "ci_cd"
- Soft skills → appropriate soft skill category

TEXT TO ANALYZE:
{text}

Return ONLY the JSON object, nothing else. Ensure the JSON is valid and properly formatted."""
        
        messages = [
            {"role": "system", "content": SkillExtractionPrompts.SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt}
        ]
        
        return messages
    
    @staticmethod
    def build_technical_skills_prompt(text: str) -> List[Dict[str, str]]:
        """
        Build prompt specifically for technical skills extraction.
        
        Args:
            text: Text to extract technical skills from
            
        Returns:
            List of message dictionaries for LLM API
        """
        system_prompt = """You are an expert at extracting technical skills from resumes and job descriptions.
Your focus is on technical skills only: programming languages, frameworks, libraries, tools, platforms, databases, cloud services, DevOps, and technical concepts.

CRITICAL RULES:
1. Extract ONLY technical skills explicitly mentioned in the text
2. Normalize skill names (standard capitalization, handle variations like "React.js" → "React")
3. Check for duplicates before adding (case-insensitive, ignore punctuation variations)
4. Choose the most specific category for each skill
5. Return ONLY valid JSON format - no markdown, no code blocks, no explanations

TECHNICAL SKILL CATEGORIES:
- programming_languages: Python, Java, JavaScript, C++, etc.
- frameworks_libraries: React, Django, Spring Boot, TensorFlow, etc.
- tools_platforms: Git, Docker, Jira, VS Code, etc.
- databases: PostgreSQL, MongoDB, Redis, MySQL, etc.
- cloud_services: AWS, Azure, GCP, Heroku, etc.
- devops: Kubernetes, Terraform, Jenkins, CI/CD, etc.
- software_architecture: Microservices, REST APIs, Design Patterns, etc.
- machine_learning: Neural Networks, NLP, Computer Vision, etc.
- blockchain: Solidity, Ethereum, Smart Contracts, etc.
- cybersecurity: Penetration Testing, Security Protocols, Encryption, etc.
- data_science: Data Analysis, Statistics, Visualization, ETL, etc.
- ci_cd: Continuous Integration, Continuous Deployment, etc.
- other: Technical skills that don't fit above categories"""
        
        user_prompt = f"""Extract all technical skills from the following text.

INSTRUCTIONS:
- Extract ONLY technical skills (programming languages, frameworks, tools, databases, cloud services, DevOps, etc.)
- Normalize skill names (e.g., "react.js" → "React", "python" → "Python")
- Check for duplicates (case-insensitive)
- Choose the most specific category
- Return ONLY valid JSON

REQUIRED JSON FORMAT:
{{
    "skills": [
        {{"name": "Python", "category": "programming_languages"}},
        {{"name": "Docker", "category": "tools_platforms"}},
        {{"name": "React", "category": "frameworks_libraries"}},
        ...
    ]
}}

TEXT:
{text}

Return ONLY the JSON object with a "skills" array. No additional text."""
        
        return [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ]
    
    @staticmethod
    def build_soft_skills_prompt(text: str) -> List[Dict[str, str]]:
        """
        Build prompt specifically for soft skills extraction.
        
        Args:
            text: Text to extract soft skills from
            
        Returns:
            List of message dictionaries for LLM API
        """
        system_prompt = """You are an expert at extracting soft skills and interpersonal competencies from resumes and job descriptions.
Your focus is on soft skills only: leadership, communication, collaboration, problem-solving, analytical thinking, and methodologies.

CRITICAL RULES:
1. Extract ONLY soft skills explicitly mentioned in the text
2. Normalize skill names (standard capitalization)
3. Check for duplicates before adding (case-insensitive)
4. Choose the most specific category for each skill
5. Return ONLY valid JSON format - no markdown, no code blocks, no explanations

SOFT SKILL CATEGORIES:
- leadership: Team Management, Mentoring, Strategic Planning, etc.
- communication: Technical Writing, Presentations, Public Speaking, etc.
- collaboration: Teamwork, Pair Programming, Code Reviews, etc.
- problem_solving: Debugging, Troubleshooting, Critical Thinking, etc.
- analytical_thinking: Data Analysis, Logical Reasoning, Pattern Recognition, etc.
- agile: Agile Development, Sprint Planning, User Stories, Kanban, etc.
- scrum: Scrum Master, Sprint Retrospectives, Daily Standups, etc.
- design_thinking: User-Centered Design, Prototyping, User Research, etc.
- other: Soft skills that don't fit above categories"""
        
        user_prompt = f"""Extract all soft skills and interpersonal competencies from the following text.

INSTRUCTIONS:
- Extract ONLY soft skills (leadership, communication, collaboration, problem-solving, methodologies, etc.)
- Normalize skill names (e.g., "leadership skills" → "Leadership")
- Check for duplicates (case-insensitive)
- Choose the most specific category
- Return ONLY valid JSON

REQUIRED JSON FORMAT:
{{
    "skills": [
        {{"name": "Leadership", "category": "leadership"}},
        {{"name": "Communication", "category": "communication"}},
        {{"name": "Agile Development", "category": "agile"}},
        ...
    ]
}}

TEXT:
{text}

Return ONLY the JSON object with a "skills" array. No additional text."""
        
        return [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ]
    
    @staticmethod
    def build_education_extraction_prompt(text: str) -> List[Dict[str, str]]:
        """
        Build prompt specifically for education requirements extraction.
        
        Args:
            text: Text to extract education from
            
        Returns:
            List of message dictionaries for LLM API
        """
        system_prompt = """You are an expert at extracting education requirements and qualifications from resumes and job descriptions.

CRITICAL RULES:
1. Extract ONLY education requirements explicitly mentioned in the text
2. Identify degree types: Bachelor's, Master's, PhD, Doctorate, Associate's, etc.
3. Extract field of study if mentioned: Computer Science, Engineering, Business, etc.
4. For job descriptions, mark as "required" if explicitly stated, "preferred" if stated as preferred/nice to have
5. Return ONLY valid JSON format - no markdown, no code blocks, no explanations

DEGREE TYPES:
- Bachelor's, BS, BSc, BA
- Master's, MS, MSc, MA, MBA
- PhD, Doctorate, Ph.D.
- Associate's, AA, AS
- Other degree types as mentioned"""
        
        json_example = '''{
    "education": [
        {"degree": "Bachelor's", "field": "Computer Science", "required": true, "preferred": false},
        {"degree": "Master's", "field": "Computer Science", "required": false, "preferred": true},
        ...
    ]
}'''
        
        user_prompt = f"""Extract all education requirements and qualifications from the following text.

INSTRUCTIONS:
- Extract degree types (Bachelor's, Master's, PhD, etc.)
- Extract field of study if mentioned
- For job descriptions, mark required/preferred status based on explicit language
- Return ONLY valid JSON

REQUIRED JSON FORMAT:
{json_example}

TEXT:
{text}

Return ONLY the JSON object with an "education" array. No additional text."""
        
        return [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ]
    
    @staticmethod
    def build_certification_extraction_prompt(text: str) -> List[Dict[str, str]]:
        """
        Build prompt specifically for certification extraction.
        
        Args:
            text: Text to extract certifications from
            
        Returns:
            List of message dictionaries for LLM API
        """
        system_prompt = """You are an expert at extracting professional certifications from resumes and job descriptions.

CRITICAL RULES:
1. Extract ONLY certifications explicitly mentioned in the text
2. Extract full certification name: "AWS Certified Solutions Architect" not just "AWS Certified"
3. Extract issuer when mentioned: AWS, Microsoft, Google, Cisco, etc.
4. Include certification level if specified: "Associate", "Professional", "Expert", etc.
5. For job descriptions, mark as "required" if explicitly stated, "preferred" if stated as preferred/nice to have
6. Return ONLY valid JSON format - no markdown, no code blocks, no explanations

COMMON CERTIFICATION ISSUERS:
- AWS (Amazon Web Services)
- Microsoft (Azure, Office 365, etc.)
- Google (GCP, Cloud certifications)
- Cisco (CCNA, CCNP, etc.)
- CompTIA (A+, Network+, Security+, etc.)
- PMI (PMP, CAPM, etc.)
- Other issuers as mentioned"""
        
        json_example = '''{
    "certifications": [
        {"name": "AWS Certified Solutions Architect", "issuer": "AWS", "required": false, "preferred": true},
        {"name": "Microsoft Azure Administrator", "issuer": "Microsoft", "required": true, "preferred": false},
        ...
    ]
}'''
        
        user_prompt = f"""Extract all certifications from the following text.

INSTRUCTIONS:
- Extract full certification name (e.g., "AWS Certified Solutions Architect")
- Extract issuer if mentioned (AWS, Microsoft, Google, etc.)
- Include certification level if specified
- For job descriptions, mark required/preferred status based on explicit language
- Return ONLY valid JSON

REQUIRED JSON FORMAT:
{json_example}

TEXT:
{text}

Return ONLY the JSON object with a "certifications" array. No additional text."""
        
        return [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ]
    
    @staticmethod
    def get_response_format() -> Dict[str, str]:
        """
        Get response format specification for JSON mode.
        
        Returns:
            Response format dictionary for LLM API
        """
        return {
            "type": "json_object"
        }


# Global prompts instance
skill_extraction_prompts = SkillExtractionPrompts()

