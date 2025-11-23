"""
Database migration script to add email verification fields.
This adds email_verified, verification_code, and verification_code_expires columns to users table.
"""
import sqlite3
import os
from datetime import datetime

# Database path
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./data/skillsync.db")
db_path = DATABASE_URL.replace("sqlite:///", "")

if not os.path.exists(db_path):
    print(f"Database file not found at {db_path}. Creating new database...")
    from app.models.database import init_db
    init_db()
    print("Database initialized with new schema.")
    exit(0)

print(f"Migrating database at {db_path}...")

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

try:
    # Get existing columns
    cursor.execute("PRAGMA table_info(users)")
    columns = [col[1] for col in cursor.fetchall()]
    
    # Add email_verified column if it doesn't exist
    if 'email_verified' not in columns:
        print("Adding email_verified column to users table...")
        cursor.execute("ALTER TABLE users ADD COLUMN email_verified BOOLEAN DEFAULT 0")
        # Set existing users as verified (for backward compatibility)
        cursor.execute("UPDATE users SET email_verified = 1 WHERE email_verified IS NULL")
        print("✓ Added email_verified column")
    else:
        print("✓ email_verified column already exists")
    
    # Add verification_code column if it doesn't exist
    if 'verification_code' not in columns:
        print("Adding verification_code column to users table...")
        cursor.execute("ALTER TABLE users ADD COLUMN verification_code VARCHAR")
        print("✓ Added verification_code column")
    else:
        print("✓ verification_code column already exists")
    
    # Add verification_code_expires column if it doesn't exist
    if 'verification_code_expires' not in columns:
        print("Adding verification_code_expires column to users table...")
        cursor.execute("ALTER TABLE users ADD COLUMN verification_code_expires DATETIME")
        print("✓ Added verification_code_expires column")
    else:
        print("✓ verification_code_expires column already exists")
    
    conn.commit()
    print("\n✓ Database migration completed successfully!")
    
except Exception as e:
    conn.rollback()
    print(f"\n❌ Error during migration: {e}")
    raise
finally:
    conn.close()

