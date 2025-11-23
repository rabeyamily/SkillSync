"""
File upload API endpoints.
"""
from fastapi import APIRouter, UploadFile, File, HTTPException, Form
from typing import Optional
from app.models.api_models import UploadResumeResponse
from app.utils.file_validation import validate_upload_file, generate_file_id
from app.utils.file_storage import file_storage

router = APIRouter()


@router.post("/upload-resume", response_model=UploadResumeResponse)
async def upload_resume(
    file: UploadFile = File(...),
    source_type: str = Form(default="resume")
):
    """
    Upload a resume file (PDF, DOCX, or TXT).
    
    Args:
        file: The uploaded file
        source_type: Type of file - 'resume' or 'job_description'
        
    Returns:
        UploadResumeResponse with file metadata
    """
    # Validate source_type
    if source_type not in ["resume", "job_description"]:
        raise HTTPException(
            status_code=400,
            detail="source_type must be either 'resume' or 'job_description'"
        )
    
    # Validate file
    is_valid, file_type, error_message = await validate_upload_file(file)
    
    if not is_valid:
        raise HTTPException(
            status_code=400,
            detail=error_message or "Invalid file"
        )
    
    try:
        # Read file content
        content = await file.read()
        file_size = len(content)
        
        # Generate unique file ID
        file_id = generate_file_id()
        
        # Store file in memory
        file_data = file_storage.store_file(
            file_id=file_id,
            filename=file.filename,
            file_type=file_type,
            content=content,
            file_size=file_size,
            source_type=source_type
        )
        
        # Return response
        return UploadResumeResponse(
            file_id=file_id,
            filename=file.filename,
            file_size=file_size,
            file_type=file_type,
            status="success"
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error uploading file: {str(e)}"
        )


@router.get("/file/{file_id}")
async def get_file_info(file_id: str):
    """
    Get file information by ID.
    
    Args:
        file_id: Unique file identifier
        
    Returns:
        File metadata
    """
    file_data = file_storage.get_file(file_id)
    
    if not file_data:
        raise HTTPException(
            status_code=404,
            detail="File not found or session expired"
        )
    
    return {
        "file_id": file_data["file_id"],
        "filename": file_data["filename"],
        "file_type": file_data["file_type"],
        "file_size": file_data["file_size"],
        "source_type": file_data["source_type"],
        "uploaded_at": file_data["uploaded_at"].isoformat(),
        "has_parsed_text": file_data["parsed_text"] is not None,
        "has_parsed_data": file_data["parsed_data"] is not None,
    }


@router.delete("/file/{file_id}")
async def delete_file(file_id: str):
    """
    Delete a file from storage.
    
    Args:
        file_id: Unique file identifier
        
    Returns:
        Deletion status
    """
    deleted = file_storage.delete_file(file_id)
    
    if not deleted:
        raise HTTPException(
            status_code=404,
            detail="File not found"
        )
    
    return {
        "message": "File deleted successfully",
        "file_id": file_id,
        "status": "success"
    }


@router.get("/storage/stats")
async def get_storage_stats():
    """
    Get file storage statistics.
    
    Returns:
        Storage statistics
    """
    return {
        "total_files": file_storage.get_file_count(),
        "max_file_size_mb": 10,  # From settings
        "allowed_extensions": [".pdf", ".docx", ".txt"],
        "session_timeout_hours": 1,
    }

