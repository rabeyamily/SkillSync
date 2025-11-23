"""
User profile API endpoints.
"""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from app.models.database import get_db, UserProfile, UserCV
from app.api.auth import get_current_user
import base64

router = APIRouter()


class ProfileUpdateRequest(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    location: Optional[str] = None
    education: Optional[str] = None
    bio: Optional[str] = None
    linkedin_url: Optional[str] = None
    github_url: Optional[str] = None
    website_url: Optional[str] = None


class ProfileResponse(BaseModel):
    user_id: int
    email: str
    first_name: Optional[str]
    last_name: Optional[str]
    location: Optional[str]
    education: Optional[str]
    bio: Optional[str]
    linkedin_url: Optional[str]
    github_url: Optional[str]
    website_url: Optional[str]
    has_cv: bool


class CVResponse(BaseModel):
    id: int
    filename: str
    file_type: str
    file_size: int
    uploaded_at: str
    is_active: bool


@router.get("/", response_model=ProfileResponse)
async def get_profile(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get user profile."""
    user_id = current_user["id"]
    
    # Get user from database to get email
    from app.services.auth_service import get_user_by_id
    user = get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get or create profile
    profile = db.query(UserProfile).filter(UserProfile.user_id == user_id).first()
    
    # Check if user has CV
    cv = db.query(UserCV).filter(
        UserCV.user_id == user_id,
        UserCV.is_active == True
    ).first()
    
    return ProfileResponse(
        user_id=user_id,
        email=user.email,
        first_name=user.first_name,
        last_name=user.last_name,
        location=profile.location if profile else None,
        education=profile.education if profile else None,
        bio=profile.bio if profile else None,
        linkedin_url=profile.linkedin_url if profile else None,
        github_url=profile.github_url if profile else None,
        website_url=profile.website_url if profile else None,
        has_cv=cv is not None
    )


@router.put("/", response_model=ProfileResponse)
async def update_profile(
    request: ProfileUpdateRequest,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update user profile."""
    user_id = current_user["id"]
    
    # Get user
    from app.services.auth_service import get_user_by_id
    user = get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Validate mandatory fields: first_name and last_name
    if request.first_name is not None and not request.first_name.strip():
        raise HTTPException(status_code=400, detail="First name is required")
    if request.last_name is not None and not request.last_name.strip():
        raise HTTPException(status_code=400, detail="Last name is required")
    
    # Check if CV is uploaded (mandatory for profile completion)
    cv = db.query(UserCV).filter(
        UserCV.user_id == user_id,
        UserCV.is_active == True
    ).first()
    if not cv:
        raise HTTPException(
            status_code=400,
            detail="CV upload is required to complete your profile"
        )
    
    # Update user first_name and last_name if provided
    if request.first_name is not None:
        user.first_name = request.first_name
    if request.last_name is not None:
        user.last_name = request.last_name
    # Update full_name for backward compatibility
    if request.first_name is not None or request.last_name is not None:
        user.full_name = f"{user.first_name or ''} {user.last_name or ''}".strip() or None
    
    # Get or create profile
    profile = db.query(UserProfile).filter(UserProfile.user_id == user_id).first()
    if not profile:
        profile = UserProfile(user_id=user_id)
        db.add(profile)
    
    # Update profile fields
    if request.location is not None:
        profile.location = request.location
    if request.education is not None:
        profile.education = request.education
    if request.bio is not None:
        profile.bio = request.bio
    if request.linkedin_url is not None:
        profile.linkedin_url = request.linkedin_url
    if request.github_url is not None:
        profile.github_url = request.github_url
    if request.website_url is not None:
        profile.website_url = request.website_url
    
    db.commit()
    db.refresh(profile)
    db.refresh(user)
    
    # Check if user has CV
    cv = db.query(UserCV).filter(
        UserCV.user_id == user_id,
        UserCV.is_active == True
    ).first()
    
    return ProfileResponse(
        user_id=user_id,
        email=user.email,
        first_name=user.first_name,
        last_name=user.last_name,
        location=profile.location,
        education=profile.education,
        bio=profile.bio,
        linkedin_url=profile.linkedin_url,
        github_url=profile.github_url,
        website_url=profile.website_url,
        has_cv=cv is not None
    )


@router.post("/cv", response_model=CVResponse)
async def upload_cv(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Upload user CV/resume."""
    user_id = current_user["id"]
    
    # Validate file type - check both MIME type and file extension
    allowed_types = ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "text/plain"]
    allowed_extensions = [".pdf", ".docx", ".txt"]
    
    # Get file extension
    filename_lower = file.filename.lower() if file.filename else ""
    file_extension = "." + filename_lower.split(".")[-1] if "." in filename_lower else ""
    
    # Check if file type is allowed (either by MIME type or extension)
    if file.content_type not in allowed_types and file_extension not in allowed_extensions:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type. Only PDF, DOCX, and TXT files are allowed. Got: {file.content_type or 'unknown'}, extension: {file_extension or 'none'}"
        )
    
    # Read file content
    content = await file.read()
    file_size = len(content)
    
    # Encode to base64 for storage
    file_content_b64 = base64.b64encode(content).decode('utf-8')
    
    # Determine file type - use extension if MIME type is unknown
    file_type_map = {
        "application/pdf": "pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
        "text/plain": "txt"
    }
    file_type = file_type_map.get(file.content_type, "unknown")
    
    # If MIME type is unknown, try to determine from extension
    if file_type == "unknown" and file_extension:
        extension_map = {".pdf": "pdf", ".docx": "docx", ".txt": "txt"}
        file_type = extension_map.get(file_extension, "unknown")
    
    # Final check - if still unknown, reject
    if file_type == "unknown":
        raise HTTPException(
            status_code=400,
            detail=f"Could not determine file type. Please ensure the file is PDF, DOCX, or TXT."
        )
    
    # Deactivate existing CVs
    db.query(UserCV).filter(
        UserCV.user_id == user_id,
        UserCV.is_active == True
    ).update({"is_active": False})
    
    # Create new CV record
    cv = UserCV(
        user_id=user_id,
        filename=file.filename or "resume",
        file_type=file_type,
        file_content=file_content_b64,
        file_size=file_size,
        is_active=True
    )
    db.add(cv)
    db.commit()
    db.refresh(cv)
    
    return CVResponse(
        id=cv.id,
        filename=cv.filename,
        file_type=cv.file_type,
        file_size=cv.file_size,
        uploaded_at=cv.uploaded_at.isoformat(),
        is_active=cv.is_active
    )


@router.get("/cv", response_model=CVResponse)
async def get_cv(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get user's active CV."""
    user_id = current_user["id"]
    
    cv = db.query(UserCV).filter(
        UserCV.user_id == user_id,
        UserCV.is_active == True
    ).first()
    
    if not cv:
        raise HTTPException(status_code=404, detail="No CV found")
    
    return CVResponse(
        id=cv.id,
        filename=cv.filename,
        file_type=cv.file_type,
        file_size=cv.file_size,
        uploaded_at=cv.uploaded_at.isoformat(),
        is_active=cv.is_active
    )


@router.get("/cv/download")
async def download_cv(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Download user's active CV."""
    from fastapi.responses import Response
    
    user_id = current_user["id"]
    
    cv = db.query(UserCV).filter(
        UserCV.user_id == user_id,
        UserCV.is_active == True
    ).first()
    
    if not cv:
        raise HTTPException(status_code=404, detail="No CV found")
    
    # Decode base64 content
    file_content = base64.b64decode(cv.file_content)
    
    # Determine content type
    content_type_map = {
        "pdf": "application/pdf",
        "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "txt": "text/plain"
    }
    content_type = content_type_map.get(cv.file_type, "application/octet-stream")
    
    return Response(
        content=file_content,
        media_type=content_type,
        headers={"Content-Disposition": f'attachment; filename="{cv.filename}"'}
    )

