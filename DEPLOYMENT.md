# 🚀 Deployment Guide - SkillSync

## Database Deployment Options

### Current Setup (Development)
- **Database**: SQLite
- **Location**: `backend/data/skillsync.db` (local file)
- **Configuration**: Uses default SQLite connection

### Production Database Options

#### Option 1: Managed Cloud Databases (Recommended) ⭐

**PostgreSQL is recommended for production** - it's more robust, scalable, and feature-rich than SQLite.

##### Popular Options:

1. **Heroku Postgres**
   ```bash
   # After creating Heroku app and adding Postgres addon
   DATABASE_URL=postgresql://user:pass@host:5432/dbname
   ```

2. **AWS RDS (PostgreSQL)**
   ```bash
   DATABASE_URL=postgresql://username:password@your-rds-endpoint.region.rds.amazonaws.com:5432/skillsync
   ```

3. **Google Cloud SQL**
   ```bash
   DATABASE_URL=postgresql://user:pass@/dbname?host=/cloudsql/project:region:instance
   ```

4. **Railway PostgreSQL**
   ```bash
   # Railway automatically provides DATABASE_URL
   DATABASE_URL=postgresql://postgres:password@containers-us-west-xxx.railway.app:5432/railway
   ```

5. **Render PostgreSQL**
   ```bash
   DATABASE_URL=postgresql://user:password@dpg-xxxxx-a.oregon-postgres.render.com/skillsync
   ```

6. **Supabase**
   ```bash
   DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.xxxxx.supabase.co:5432/postgres
   ```

#### Option 2: Self-Hosted PostgreSQL

If you have your own server:

```bash
DATABASE_URL=postgresql://username:password@your-server-ip:5432/skillsync
```

#### Option 3: Docker PostgreSQL

```yaml
# docker-compose.yml
services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_USER: skillsync
      POSTGRES_PASSWORD: yourpassword
      POSTGRES_DB: skillsync
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

Then use:
```bash
DATABASE_URL=postgresql://skillsync:yourpassword@localhost:5432/skillsync
```

## Configuration

### Environment Variables

Set the `DATABASE_URL` environment variable in your production environment:

**For PostgreSQL:**
```bash
DATABASE_URL=postgresql://username:password@host:port/database_name
```

**For SQLite (not recommended for production):**
```bash
DATABASE_URL=sqlite:///./data/skillsync.db
```

### Where to Set Environment Variables

1. **Heroku**: `heroku config:set DATABASE_URL=...`
2. **AWS/Railway/Render**: Set in dashboard under "Environment Variables"
3. **Docker**: In `docker-compose.yml` or `.env` file
4. **VPS/Server**: In `.env` file or system environment variables

## Database Migration

When deploying to production:

1. **First-time setup**: Tables are automatically created via `init_db()` when the app starts
2. **Existing database**: If you have existing data, you may need to:
   - Export from SQLite: `sqlite3 skillsync.db .dump > backup.sql`
   - Import to PostgreSQL (requires conversion)
   - Or use a migration tool like Alembic

## Important Notes

### SQLite vs PostgreSQL

- **SQLite**: Good for development, single-user apps, or very small deployments
- **PostgreSQL**: Recommended for production - better concurrency, scalability, and features

### Security Considerations

1. **Never commit database credentials** to version control
2. Use **environment variables** for all sensitive data
3. Use **connection pooling** for production (SQLAlchemy handles this)
4. Enable **SSL/TLS** for database connections in production

### File Storage

Currently, CV files are stored as Base64 in the database. For production with large files, consider:
- Using object storage (AWS S3, Google Cloud Storage, etc.)
- Storing file paths in database instead of file content
- Using a dedicated file storage service

## Quick Deployment Checklist

- [ ] Choose a database provider (PostgreSQL recommended)
- [ ] Set `DATABASE_URL` environment variable
- [ ] Install PostgreSQL driver: `pip install psycopg2-binary`
- [ ] Test database connection
- [ ] Run database migrations if needed
- [ ] Set up database backups
- [ ] Configure SSL/TLS for database connections
- [ ] Update CORS settings for production domain
- [ ] Set production JWT secret key
- [ ] Configure proper logging

## Example Production .env

```env
# Database
DATABASE_URL=postgresql://user:password@host:5432/skillsync

# API Keys
OPENAI_API_KEY=your-openai-key

# JWT
JWT_SECRET_KEY=your-very-secure-secret-key-change-this
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=43200  # 30 days

# CORS
CORS_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

# Google OAuth (if using)
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=https://yourdomain.com/api/auth/google/callback

# Environment
DEBUG=False
```

