"""
Main FastAPI application entry point.
"""
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from app.api import router as api_router
from app.config import settings

app = FastAPI(
    title=settings.app_name,
    description="AI-powered application to analyze resume-job skill gaps, education alignment, and provide personalized recommendations",
    version=settings.app_version,
    debug=settings.debug,
)

# CORS middleware configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Exception handler to ensure error details are returned
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"detail": exc.errors(), "body": exc.body},
    )

# Include API routes
app.include_router(api_router, prefix="/api", tags=["api"])


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "message": settings.app_name,
        "version": settings.app_version,
        "status": "running"
    }


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy"}


# Debug endpoints - only available in debug mode
if settings.debug:
    @app.get("/debug/cors")
    async def debug_cors():
        """Debug endpoint to check CORS configuration."""
        return {
            "cors_origins": settings.cors_origins,
            "cors_origins_list": settings.cors_origins_list,
            "debug": settings.debug
        }

    @app.get("/debug/config")
    async def debug_config():
        """Debug endpoint to check configuration."""
        return {
            "openai_api_key_set": bool(settings.openai_api_key and settings.openai_api_key != ""),
            "openai_api_key_length": len(settings.openai_api_key) if settings.openai_api_key else 0,
            "openai_api_key_preview": settings.openai_api_key[:10] + "..." if settings.openai_api_key and len(settings.openai_api_key) > 10 else "NOT_SET",
            "llm_model": settings.llm_model,
            "debug": settings.debug
        }

