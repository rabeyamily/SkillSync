"""
Authentication service for user management and JWT tokens.
"""
from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
import bcrypt
from sqlalchemy.orm import Session
from app.models.database import User
import os

# Password hashing

# JWT settings - Import from config to ensure consistency
from app.config import settings

SECRET_KEY = settings.jwt_secret_key
ALGORITHM = settings.jwt_algorithm
ACCESS_TOKEN_EXPIRE_MINUTES = settings.jwt_access_token_expire_minutes


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash."""
    try:
        # bcrypt.checkpw expects bytes, so encode both
        # If hashed_password is already bytes, this will work fine
        if isinstance(hashed_password, str):
            hashed_bytes = hashed_password.encode('utf-8')
        else:
            hashed_bytes = hashed_password
        return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_bytes)
    except Exception as e:
        print(f"Password verification error: {e}")
        return False


def get_password_hash(password: str) -> str:
    """Hash a password using bcrypt with strong parameters.
    
    Uses cost factor of 12 (default is 12, which is good for production).
    Higher cost factors (13-14) are more secure but slower.
    """
    # Cost factor 12 is a good balance between security and performance
    # For production, consider 13-14 if performance allows
    salt = bcrypt.gensalt(rounds=12)
    hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
    return hashed.decode('utf-8')


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create a JWT access token."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        # Use minutes directly for more precise expiration
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def verify_token(token: str) -> Optional[dict]:
    """Verify and decode a JWT token."""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError as e:
        # Log the specific error for debugging
        error_msg = str(e)
        if "expired" in error_msg.lower():
            print(f"Token verification failed: Token has expired - {error_msg}")
        elif "invalid" in error_msg.lower():
            print(f"Token verification failed: Invalid token - {error_msg}")
        else:
            print(f"Token verification failed: {error_msg}")
        return None


def create_user(db: Session, email: str, password: str, full_name: Optional[str] = None) -> User:
    """Create a new user with email/password."""
    # Normalize email to lowercase for case-insensitive lookups
    email_lower = email.lower().strip()
    hashed_password = get_password_hash(password)
    db_user = User(
        email=email_lower,
        hashed_password=hashed_password,
        full_name=full_name,
        auth_provider="email"
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user


def authenticate_user(db: Session, email: str, password: str) -> Optional[User]:
    """Authenticate a user with email and password."""
    # Normalize email to lowercase for case-insensitive lookups
    email_lower = email.lower().strip()
    user = db.query(User).filter(User.email == email_lower).first()
    if not user:
        print(f"Authentication failed: User not found for email: {email_lower}")
        return None
    if not user.hashed_password:
        print(f"Authentication failed: User {email_lower} has no password set (likely created via Google OAuth)")
        return None
    password_valid = verify_password(password, user.hashed_password)
    if not password_valid:
        print(f"Authentication failed: Password verification failed for user: {email_lower}")
        return None
    print(f"Authentication successful for user: {email_lower}")
    return user


def get_user_by_email(db: Session, email: str) -> Optional[User]:
    """Get user by email (case-insensitive)."""
    email_lower = email.lower().strip()
    return db.query(User).filter(User.email == email_lower).first()


def get_user_by_id(db: Session, user_id: int) -> Optional[User]:
    """Get user by ID."""
    return db.query(User).filter(User.id == user_id).first()


def get_user_by_google_id(db: Session, google_id: str) -> Optional[User]:
    """Get user by Google ID."""
    return db.query(User).filter(User.google_id == google_id).first()


def create_or_get_google_user(db: Session, google_id: str, email: str, full_name: Optional[str] = None) -> User:
    """Create or get a user from Google OAuth."""
    # Normalize email to lowercase
    email_lower = email.lower().strip()
    
    user = get_user_by_google_id(db, google_id)
    if user:
        return user
    
    # Check if email already exists
    existing_user = get_user_by_email(db, email_lower)
    if existing_user:
        # Link Google account to existing email account
        existing_user.google_id = google_id
        existing_user.auth_provider = "google"
        if not existing_user.full_name and full_name:
            existing_user.full_name = full_name
        db.commit()
        db.refresh(existing_user)
        return existing_user
    
    # Create new user
    db_user = User(
        email=email_lower,
        google_id=google_id,
        full_name=full_name,
        auth_provider="google"
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

