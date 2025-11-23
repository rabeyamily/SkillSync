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
    get_user_by_email,
    set_verification_code,
    verify_user_email
)
from app.services.email_service import (
    generate_verification_code,
    send_verification_email,
    get_verification_code_expiry,
    is_verification_code_expired
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


class VerifyEmailRequest(BaseModel):
    email: EmailStr
    code: str


class ResendVerificationRequest(BaseModel):
    email: EmailStr


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class GoogleAuthRequest(BaseModel):
    id_token: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict


class SignupResponse(BaseModel):
    message: str
    email: str
    requires_verification: bool = True


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
        # JWT 'sub' field is stored as string, convert back to int
        user_id_str = payload.get("sub")
        if user_id_str is None:
            print("get_current_user: No user_id in token payload")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication credentials",
            )
        try:
            user_id: int = int(user_id_str)
        except (ValueError, TypeError):
            print(f"get_current_user: Invalid user_id format in token: {user_id_str}")
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


@router.post("/signup", response_model=SignupResponse)
async def signup(request: SignupRequest, db: Session = Depends(get_db)):
    """Register a new user with email and password. Sends verification code."""
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
        if existing_user.email_verified:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
        else:
            # User exists but not verified - update password and resend code
            from app.services.auth_service import get_password_hash
            existing_user.hashed_password = get_password_hash(request.password)
            if request.full_name:
                existing_user.full_name = request.full_name
            db.commit()
            user = existing_user
    else:
        # Create new unverified user
        user = create_user(db, request.email, request.password, request.full_name, email_verified=False)
    
    # Generate verification code
    verification_code = generate_verification_code()
    expires_at = get_verification_code_expiry()
    
    # Store verification code
    set_verification_code(db, user, verification_code, expires_at)
    
    # Send verification email
    email_sent = send_verification_email(user.email, verification_code)
    
    if not email_sent and not settings.debug:
        # If email failed and not in debug mode, raise error
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to send verification email. Please try again later."
        )
    
    return SignupResponse(
        message="Registration successful! Please check your email for the verification code.",
        email=user.email,
        requires_verification=True
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
        # Check if email is verified
        if not user_by_email.email_verified:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Email not verified. Please check your email for the verification code.",
            )
    else:
        print(f"[LOGIN] User not found in database")
    
    # Authenticate user (this checks email, password, and if user has password)
    print(f"[LOGIN] Attempting authentication...")
    user = authenticate_user(db, email_lower, request.password, require_verified=True)
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
    
    # Create token - JWT 'sub' field must be a string
    access_token = create_access_token(data={"sub": str(user.id)})
    
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
        
        # Create access token - JWT 'sub' field must be a string
        access_token = create_access_token(data={"sub": str(user.id)})
        
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


@router.post("/verify-email", response_model=TokenResponse)
async def verify_email(request: VerifyEmailRequest, db: Session = Depends(get_db)):
    """Verify user email with verification code."""
    email_lower = request.email.lower().strip()
    user = get_user_by_email(db, email_lower)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    if user.email_verified:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already verified"
        )
    
    # Check if code matches
    if not user.verification_code or user.verification_code != request.code:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid verification code"
        )
    
    # Check if code expired
    if is_verification_code_expired(user.verification_code_expires):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Verification code has expired. Please request a new one."
        )
    
    # Verify user email
    verify_user_email(db, user)
    
    # Create token - JWT 'sub' field must be a string
    access_token = create_access_token(data={"sub": str(user.id)})
    
    return TokenResponse(
        access_token=access_token,
        user={
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "auth_provider": user.auth_provider
        }
    )


@router.post("/resend-verification")
async def resend_verification(request: ResendVerificationRequest, db: Session = Depends(get_db)):
    """Resend verification code to user's email."""
    email_lower = request.email.lower().strip()
    user = get_user_by_email(db, email_lower)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    if user.email_verified:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already verified"
        )
    
    # Generate new verification code
    verification_code = generate_verification_code()
    expires_at = get_verification_code_expiry()
    
    # Store verification code
    set_verification_code(db, user, verification_code, expires_at)
    
    # Send verification email
    email_sent = send_verification_email(user.email, verification_code)
    
    if not email_sent and not settings.debug:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to send verification email. Please try again later."
        )
    
    return {
        "message": "Verification code has been sent to your email.",
        "email": user.email
    }


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

