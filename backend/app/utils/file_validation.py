"""
File upload utilities for validation and processing.
"""
import os
import uuid
from typing import Tuple, Optional
from fastapi import UploadFile, HTTPException
from app.config import settings


def validate_file_extension(filename: str) -> Tuple[bool, Optional[str]]:
    """
    Validate file extension against allowed extensions.
    
    Args:
        filename: Name of the file
        
    Returns:
        Tuple of (is_valid, file_type)
    """
    if not filename:
        return False, None
    
    filename_lower = filename.lower()
    allowed_extensions = settings.allowed_extensions_list
    
    for ext in allowed_extensions:
        if filename_lower.endswith(ext.lower()):
            file_type = ext.lstrip('.')
            return True, file_type
    
    return False, None


def validate_file_size(file_size: int) -> Tuple[bool, Optional[str]]:
    """
    Validate file size against maximum allowed size.
    
    Args:
        file_size: Size of the file in bytes
        
    Returns:
        Tuple of (is_valid, error_message)
    """
    max_size_bytes = settings.max_file_size_mb * 1024 * 1024
    
    if file_size > max_size_bytes:
        error_msg = (
            f"File size ({file_size / (1024 * 1024):.2f} MB) exceeds "
            f"maximum allowed size ({settings.max_file_size_mb} MB)"
        )
        return False, error_msg
    
    if file_size == 0:
        return False, "File is empty"
    
    return True, None


async def validate_upload_file(file: UploadFile) -> Tuple[bool, Optional[str], Optional[str]]:
    """
    Validate an uploaded file.
    
    Args:
        file: FastAPI UploadFile object
        
    Returns:
        Tuple of (is_valid, file_type, error_message)
    """
    # Check if file is provided
    if not file.filename:
        return False, None, "No file provided"
    
    # Validate file extension
    is_valid_ext, file_type = validate_file_extension(file.filename)
    if not is_valid_ext:
        allowed = ", ".join(settings.allowed_extensions_list)
        return False, None, f"File type not allowed. Allowed types: {allowed}"
    
    # Read file content to get size
    try:
        # Read file content
        content = await file.read()
        file_size = len(content)
        
        # Reset file pointer for later use
        await file.seek(0)
        
        # Validate file size
        is_valid_size, error_msg = validate_file_size(file_size)
        if not is_valid_size:
            return False, None, error_msg
        
        return True, file_type, None
        
    except Exception as e:
        return False, None, f"Error reading file: {str(e)}"


def generate_file_id() -> str:
    """Generate a unique file ID."""
    return str(uuid.uuid4())


def get_file_extension(filename: str) -> str:
    """Extract file extension from filename."""
    return os.path.splitext(filename)[1].lower().lstrip('.')

