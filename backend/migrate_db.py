"""
Database migration script to add new columns to existing database.
This adds first_name, last_name to users table and education to user_profiles table,
and removes phone from user_profiles if it exists.
"""
import sqlite3
import os

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
    # Check if columns exist
    cursor.execute("PRAGMA table_info(users)")
    user_columns = [col[1] for col in cursor.fetchall()]
    
    cursor.execute("PRAGMA table_info(user_profiles)")
    profile_columns = [col[1] for col in cursor.fetchall()]
    
    # Add first_name to users if it doesn't exist
    if 'first_name' not in user_columns:
        print("Adding first_name column to users table...")
        cursor.execute("ALTER TABLE users ADD COLUMN first_name VARCHAR")
        print("✓ Added first_name column")
    else:
        print("✓ first_name column already exists")
    
    # Add last_name to users if it doesn't exist
    if 'last_name' not in user_columns:
        print("Adding last_name column to users table...")
        cursor.execute("ALTER TABLE users ADD COLUMN last_name VARCHAR")
        print("✓ Added last_name column")
    else:
        print("✓ last_name column already exists")
    
    # Add education to user_profiles if it doesn't exist
    if 'education' not in profile_columns:
        print("Adding education column to user_profiles table...")
        cursor.execute("ALTER TABLE user_profiles ADD COLUMN education VARCHAR")
        print("✓ Added education column")
    else:
        print("✓ education column already exists")
    
    # Note: We won't remove phone column as it might have data
    # SQLite doesn't support DROP COLUMN easily, so we'll just ignore it
    
    conn.commit()
    print("\n✓ Database migration completed successfully!")
    
except sqlite3.Error as e:
    print(f"\n✗ Error during migration: {e}")
    conn.rollback()
    raise
finally:
    conn.close()

