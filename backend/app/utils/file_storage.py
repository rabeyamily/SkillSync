"""
In-memory file storage for session-based file handling.
"""
from typing import Dict, Optional, Union
import uuid
from datetime import datetime, timedelta
from app.models.schemas import ResumeData, JobDescription


class FileStorage:
    """In-memory file storage for session-based processing."""
    
    def __init__(self):
        """Initialize file storage."""
        self._files: Dict[str, dict] = {}
        self._session_timeout = timedelta(hours=1)  # 1 hour session timeout
    
    def store_file(
        self,
        file_id: str,
        filename: str,
        file_type: str,
        content: bytes,
        file_size: int,
        source_type: str = "resume"
    ) -> dict:
        """
        Store file in memory.
        
        Args:
            file_id: Unique file identifier
            filename: Original filename
            file_type: File type (pdf, docx, txt)
            content: File content as bytes
            file_size: File size in bytes
            source_type: Type of file (resume or job_description)
            
        Returns:
            File metadata dictionary
        """
        file_data = {
            "file_id": file_id,
            "filename": filename,
            "file_type": file_type,
            "content": content,
            "file_size": file_size,
            "source_type": source_type,
            "uploaded_at": datetime.now(),
            "parsed_text": None,  # Will be populated after parsing
            "parsed_data": None,  # Will be populated after extraction
        }
        
        self._files[file_id] = file_data
        return file_data
    
    def get_file(self, file_id: str) -> Optional[dict]:
        """Get file by ID."""
        if file_id in self._files:
            file_data = self._files[file_id]
            # Check if session expired
            if datetime.now() - file_data["uploaded_at"] > self._session_timeout:
                del self._files[file_id]
                return None
            return file_data
        return None
    
    def update_file_text(self, file_id: str, parsed_text: str) -> bool:
        """Update parsed text for a file."""
        if file_id in self._files:
            self._files[file_id]["parsed_text"] = parsed_text
            return True
        return False
    
    def update_file_data(self, file_id: str, parsed_data: Union[ResumeData, JobDescription]) -> bool:
        """Update parsed data for a file."""
        if file_id in self._files:
            self._files[file_id]["parsed_data"] = parsed_data
            return True
        return False
    
    def delete_file(self, file_id: str) -> bool:
        """Delete file from storage."""
        if file_id in self._files:
            del self._files[file_id]
            return True
        return False
    
    def cleanup_expired(self) -> int:
        """Clean up expired files. Returns number of files cleaned."""
        now = datetime.now()
        expired_ids = [
            file_id for file_id, file_data in self._files.items()
            if now - file_data["uploaded_at"] > self._session_timeout
        ]
        
        for file_id in expired_ids:
            del self._files[file_id]
        
        return len(expired_ids)
    
    def get_file_count(self) -> int:
        """Get total number of stored files."""
        return len(self._files)


# Global file storage instance
file_storage = FileStorage()

