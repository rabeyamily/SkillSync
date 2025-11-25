"""
Quick script to check user account in database.
Run this to diagnose login issues.
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.models.database import get_db, User

def check_user(email: str):
    """Check user account details."""
    db = next(get_db())
    email_lower = email.lower().strip()
    user = db.query(User).filter(User.email == email_lower).first()
    
    if not user:
        print(f"❌ User not found: {email_lower}")
        return
    
    print(f"✅ User found: {email_lower}")
    print(f"   ID: {user.id}")
    print(f"   Email: {user.email}")
    print(f"   Full Name: {user.full_name}")
    print(f"   Auth Provider: {user.auth_provider}")
    print(f"   Has Password: {user.hashed_password is not None}")
    
    if user.hashed_password:
        print(f"   Password Hash: {user.hashed_password[:50]}...")
    else:
        print("   ⚠️  This account has no password (likely created via Google OAuth)")
        print("   → Use 'Sign in with Google' instead")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python check_user.py <email>")
        sys.exit(1)
    
    check_user(sys.argv[1])

