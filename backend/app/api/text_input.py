"""
Text input API endpoints for plain text resume and job description input.
"""
from fastapi import APIRouter, HTTPException
from app.models.api_models import TextInputRequest, TextInputResponse
from app.services.file_parser import text_input_service

router = APIRouter()


@router.post("/text", response_model=TextInputResponse)
async def submit_text(request: TextInputRequest):
    """
    Submit plain text input (resume or job description).
    
    Args:
        request: TextInputRequest with text and source_type
        
    Returns:
        TextInputResponse with text_id and status
    """
    # Validate source_type
    if request.source_type not in ["resume", "job_description"]:
        raise HTTPException(
            status_code=400,
            detail="source_type must be either 'resume' or 'job_description'"
        )
    
    # Store text
    text_id, error_message = text_input_service.store_text(
        text=request.text,
        source_type=request.source_type
    )
    
    if error_message:
        raise HTTPException(
            status_code=400,
            detail=error_message
        )
    
    # Get stored text to return length
    stored_text, get_error = text_input_service.get_text(text_id)
    
    if get_error:
        # This shouldn't happen, but handle it gracefully
        text_length = len(request.text)
    else:
        text_length = len(stored_text) if stored_text else len(request.text)
    
    return TextInputResponse(
        text_id=text_id,
        text_length=text_length,
        status="success"
    )


@router.get("/text/{text_id}")
async def get_text_input(text_id: str):
    """
    Get stored text input by ID.
    
    Args:
        text_id: Text identifier
        
    Returns:
        Text content and metadata
    """
    text, error_message = text_input_service.get_text(text_id)
    
    if error_message:
        raise HTTPException(
            status_code=404,
            detail=error_message
        )
    
    # Get file metadata
    from app.utils.file_storage import file_storage
    file_data = file_storage.get_file(text_id)
    
    if not file_data:
        raise HTTPException(
            status_code=404,
            detail="Text not found"
        )
    
    return {
        "text_id": text_id,
        "text": text,
        "text_length": len(text) if text else 0,
        "source_type": file_data.get("source_type"),
        "filename": file_data.get("filename"),
        "status": "success"
    }


@router.post("/text/validate")
async def validate_text_input(request: TextInputRequest):
    """
    Validate text input without storing it.
    
    Args:
        request: TextInputRequest with text and source_type
        
    Returns:
        Validation result
    """
    # Validate source_type
    if request.source_type not in ["resume", "job_description"]:
        return {
            "valid": False,
            "error": "source_type must be either 'resume' or 'job_description'"
        }
    
    # Validate text
    is_valid, error_message = text_input_service.validate_text(request.text)
    
    return {
        "valid": is_valid,
        "error": error_message,
        "text_length": len(request.text) if request.text else 0,
        "source_type": request.source_type
    }

