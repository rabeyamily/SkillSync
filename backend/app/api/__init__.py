# API routes package
from fastapi import APIRouter
from app.api import upload, parse, text_input, extract, analyze, report, auth, profile

router = APIRouter()

# Include route modules
router.include_router(auth.router, prefix="/auth", tags=["auth"])
router.include_router(profile.router, prefix="/profile", tags=["profile"])
router.include_router(upload.router, prefix="/upload", tags=["upload"])
router.include_router(parse.router, prefix="/parse", tags=["parse"])
router.include_router(text_input.router, prefix="/text", tags=["text-input"])
router.include_router(extract.router, prefix="/extract", tags=["extract"])
router.include_router(analyze.router, prefix="/analyze", tags=["analyze"])
router.include_router(report.router, prefix="/report", tags=["report"])


@router.get("/test")
async def test_endpoint():
    """Test endpoint to verify API is working."""
    return {"message": "API is working!", "status": "success"}

