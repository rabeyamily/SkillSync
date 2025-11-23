"""
Authentication API endpoints.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from typing import Optional
from app.models.database import get_db, init_db
from app.services.auth_service import (
    create_user,
    authenticate_user,
    create_or_get_google_user,
    create_access_token,
    verify_token,
    get_user_by_id,
    get_user_by_email
)
from app.config import settings
from app.utils.password_validation import validate_password
from google.oauth2 import id_token
from google.auth.transport import requests

router = APIRouter()
security = HTTPBearer(auto_error=False)  # Don't auto-raise error, let us handle it

# Initialize database on startup
init_db()


# Request/Response models
class SignupRequest(BaseModel):
    email: EmailStr
    password: str
    full_name: Optional[str] = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class GoogleAuthRequest(BaseModel):
    id_token: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict


class UserResponse(BaseModel):
    id: int
    email: str
    full_name: Optional[str]
    auth_provider: str


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> dict:
    """Dependency to get current authenticated user."""
    try:
        if not credentials:
            print("get_current_user: No credentials provided (HTTPBearer returned None)")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="No authentication token provided",
                headers={"WWW-Authenticate": "Bearer"},
            )
        token = credentials.credentials
        if not token:
            print("get_current_user: No token provided in credentials")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="No authentication token provided",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        payload = verify_token(token)
        if payload is None:
            print(f"get_current_user: Token verification failed for token: {token[:20]}...")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )
        user_id: int = payload.get("sub")
        if user_id is None:
            print("get_current_user: No user_id in token payload")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication credentials",
            )
        user = get_user_by_id(db, user_id)
        if user is None:
            print(f"get_current_user: User not found for user_id: {user_id}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found",
            )
        return {"id": user.id, "email": user.email, "full_name": user.full_name, "auth_provider": user.auth_provider}
    except HTTPException:
        raise
    except Exception as e:
        print(f"get_current_user: Unexpected error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Authentication error: {str(e)}",
        )


@router.post("/signup", response_model=TokenResponse)
async def signup(request: SignupRequest, db: Session = Depends(get_db)):
    """Register a new user with email and password."""
    # Validate password with strong requirements
    is_valid, errors = validate_password(
        request.password,
        user_info={
            'email': request.email,
            'full_name': request.full_name
        }
    )
    
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=errors[0] if errors else "Password does not meet security requirements"
        )
    
    # Check if user already exists
    existing_user = get_user_by_email(db, request.email)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Create user
    user = create_user(db, request.email, request.password, request.full_name)
    
    # Create token
    access_token = create_access_token(data={"sub": user.id})
    
    return TokenResponse(
        access_token=access_token,
        user={
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "auth_provider": user.auth_provider
        }
    )


@router.post("/login", response_model=TokenResponse)
async def login(request: LoginRequest, db: Session = Depends(get_db)):
    """Login with email and password."""
    print(f"[LOGIN] Login attempt for email: {request.email}")
    
    # Normalize email (authenticate_user already does this, but we do it here for consistency)
    email_lower = request.email.lower().strip()
    print(f"[LOGIN] Normalized email: {email_lower}")
    
    # Check if user exists first
    user_by_email = get_user_by_email(db, email_lower)
    if user_by_email:
        print(f"[LOGIN] User found: {user_by_email.email}, has_password: {user_by_email.hashed_password is not None}, auth_provider: {user_by_email.auth_provider}")
        if not user_by_email.hashed_password:
            print(f"[LOGIN] User has no password - created via Google OAuth")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="This account was created with Google. Please sign in with Google instead.",
                headers={"WWW-Authenticate": "Bearer"},
            )
    else:
        print(f"[LOGIN] User not found in database")
    
    # Authenticate user (this checks email, password, and if user has password)
    print(f"[LOGIN] Attempting authentication...")
    user = authenticate_user(db, email_lower, request.password)
    if not user:
        print(f"[LOGIN] Authentication failed - incorrect credentials")
        # Check if user exists to give better error message
        user_exists = get_user_by_email(db, email_lower)
        if not user_exists:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Account not found. Please sign up first.",
                headers={"WWW-Authenticate": "Bearer"},
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password",
                headers={"WWW-Authenticate": "Bearer"},
            )
    
    print(f"[LOGIN] Authentication successful for user: {user.email}")
    
    # Create token
    access_token = create_access_token(data={"sub": user.id})
    
    return TokenResponse(
        access_token=access_token,
        user={
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "auth_provider": user.auth_provider
        }
    )


@router.post("/google", response_model=TokenResponse)
async def google_auth(request: GoogleAuthRequest, db: Session = Depends(get_db)):
    """Authenticate user with Google OAuth ID token."""
    try:
        # Verify Google ID token
        # Use Google Client ID for verification if available
        CLIENT_ID = settings.google_client_id if settings.google_client_id else None
        
        idinfo = id_token.verify_oauth2_token(
            request.id_token,
            requests.Request(),
            CLIENT_ID
        )
        
        # Extract user info from Google token
        google_id = idinfo.get('sub')
        email = idinfo.get('email')
        name = idinfo.get('name')
        
        if not google_id or not email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid Google token: missing required fields"
            )
        
        # Create or get user
        user = create_or_get_google_user(db, google_id, email, name)
        
        # Create access token
        access_token = create_access_token(data={"sub": user.id})
        
        return TokenResponse(
            access_token=access_token,
            user={
                "id": user.id,
                "email": user.email,
                "full_name": user.full_name,
                "auth_provider": user.auth_provider
            }
        )
        
    except ValueError as e:
        # Invalid token
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid Google token: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error authenticating with Google: {str(e)}"
        )


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user: dict = Depends(get_current_user)):
    """Get current authenticated user information."""
    return UserResponse(**current_user)


@router.post("/verify-token")
async def verify_token_endpoint(
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Verify if a token is valid."""
    token = credentials.credentials
    payload = verify_token(token)
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token"
        )
    return {"valid": True, "user_id": payload.get("sub")}

