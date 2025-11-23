"""
Integration tests for API endpoints.
"""
import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


class TestAPIEndpoints:
    """Integration tests for API endpoints."""

    def test_root_endpoint(self):
        """Test root endpoint."""
        response = client.get("/")
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert "version" in data
        assert "status" in data

    def test_upload_resume(self):
        """Test resume upload endpoint."""
        # Create a test file
        test_content = b"Test resume content"
        files = {"file": ("test_resume.txt", test_content, "text/plain")}
        data = {"source_type": "resume"}
        
        response = client.post("/api/upload/upload-resume", files=files, data=data)
        assert response.status_code == 200
        data = response.json()
        assert "file_id" in data
        assert "filename" in data

    def test_text_input(self):
        """Test text input endpoint."""
        payload = {
            "text": "Python developer with 5 years experience",
            "source_type": "resume"
        }
        
        response = client.post("/api/text/text", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert "text_id" in data

    def test_extract_skills(self):
        """Test skill extraction endpoint."""
        # First upload a file
        test_content = b"Python, JavaScript, React, AWS"
        files = {"file": ("test_resume.txt", test_content, "text/plain")}
        data = {"source_type": "resume"}
        
        upload_response = client.post("/api/upload/upload-resume", files=files, data=data)
        file_id = upload_response.json()["file_id"]
        
        # Then extract skills
        payload = {"resume_id": file_id}
        response = client.post("/api/extract/extract", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert "resume_skills" in data

    def test_analyze_gap(self):
        """Test gap analysis endpoint."""
        # Create test skill extraction results
        from app.models.schemas import Skill, SkillExtractionResult
        from app.models.skill_taxonomy import SkillCategory
        
        resume_skills = SkillExtractionResult(
            skills=[Skill(name="Python", category=SkillCategory.PROGRAMMING_LANGUAGES)],
            raw_text="Python developer"
        )
        jd_skills = SkillExtractionResult(
            skills=[
                Skill(name="Python", category=SkillCategory.PROGRAMMING_LANGUAGES),
                Skill(name="Java", category=SkillCategory.PROGRAMMING_LANGUAGES),
            ],
            raw_text="Looking for Python and Java developer"
        )
        
        payload = {
            "resume_skills": resume_skills.model_dump(),
            "jd_skills": jd_skills.model_dump(),
        }
        
        response = client.post("/api/analyze/analyze-gap", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert "report" in data
        assert "analysis_time" in data
        assert "fit_score" in data["report"]
        assert "gap_analysis" in data["report"]

    def test_invalid_file_type(self):
        """Test upload with invalid file type."""
        test_content = b"Test content"
        files = {"file": ("test.exe", test_content, "application/x-msdownload")}
        data = {"source_type": "resume"}
        
        response = client.post("/api/upload/upload-resume", files=files, data=data)
        assert response.status_code == 400

    def test_missing_required_fields(self):
        """Test endpoint with missing required fields."""
        payload = {}
        response = client.post("/api/text/text", json=payload)
        assert response.status_code == 422  # Validation error

