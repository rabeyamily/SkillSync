# 📧 Email Verification Setup Guide

## Overview

Email verification has been added to the SkillSync signup process. Users must verify their email address with a 6-digit code before they can log in.

## How It Works

1. **User Signs Up**: User enters email and password
2. **Verification Code Sent**: A 6-digit code is sent to their email
3. **User Enters Code**: User enters the code in the verification screen
4. **Account Activated**: Once verified, user can log in

## Backend Changes

### New Database Fields

- `email_verified` (Boolean) - Whether email is verified
- `verification_code` (String) - Current verification code
- `verification_code_expires` (DateTime) - Code expiration time

### New API Endpoints

- `POST /api/auth/verify-email` - Verify email with code
- `POST /api/auth/resend-verification` - Resend verification code

### Modified Endpoints

- `POST /api/auth/signup` - Now sends verification email instead of returning token
- `POST /api/auth/login` - Now requires email to be verified

## Configuration

### Environment Variables

Add these to your `.env` file or Railway environment variables:

```env
# Email Settings (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM_EMAIL=your-email@gmail.com
SMTP_FROM_NAME=SkillSync
EMAIL_VERIFICATION_CODE_EXPIRY_MINUTES=15
```

### Gmail Setup (Example)

1. **Enable 2-Factor Authentication** on your Google account
2. **Generate App Password**:

   - Go to Google Account → Security → 2-Step Verification
   - Click "App passwords"
   - Generate password for "Mail"
   - Use this password as `SMTP_PASSWORD`

3. **Configure in Railway**:
   ```env
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your-email@gmail.com
   SMTP_PASSWORD=your-16-char-app-password
   SMTP_FROM_EMAIL=your-email@gmail.com
   SMTP_FROM_NAME=SkillSync
   ```

### Other Email Providers

**SendGrid:**

```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASSWORD=your-sendgrid-api-key
SMTP_FROM_EMAIL=noreply@yourdomain.com
```

**Mailgun:**

```env
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_USER=your-mailgun-username
SMTP_PASSWORD=your-mailgun-password
SMTP_FROM_EMAIL=noreply@yourdomain.com
```

**AWS SES:**

```env
SMTP_HOST=email-smtp.us-east-1.amazonaws.com
SMTP_PORT=587
SMTP_USER=your-ses-smtp-username
SMTP_PASSWORD=your-ses-smtp-password
SMTP_FROM_EMAIL=noreply@yourdomain.com
```

## Development Mode

In development (`DEBUG=True`), if email settings are not configured:

- Email sending is skipped
- Verification code is printed to console
- Example: `[DEV] Verification code for user@example.com: 123456`

This allows testing without setting up email.

## Database Migration

Run the migration script to add new columns to existing database:

```bash
cd backend
python migrate_add_email_verification.py
```

Or for Railway/PostgreSQL, the columns will be added automatically when you deploy (SQLAlchemy handles it).

## Frontend Flow

1. User clicks "Sign up"
2. Enters email and password
3. After signup, verification screen appears
4. User enters 6-digit code
5. Can click "Resend code" if needed
6. Once verified, automatically logged in

## Testing

### Without Email Setup (Development)

1. Sign up with any email
2. Check backend console for verification code
3. Enter code in frontend

### With Email Setup

1. Sign up with real email
2. Check email inbox for code
3. Enter code in frontend

## Security Features

- ✅ 6-digit random codes
- ✅ Codes expire in 15 minutes (configurable)
- ✅ Codes are single-use
- ✅ Users cannot log in until verified
- ✅ Resend code available (generates new code)

## Troubleshooting

### Email Not Sending

1. Check SMTP credentials are correct
2. Verify SMTP port (587 for TLS, 465 for SSL)
3. Check firewall/network allows SMTP
4. In development, check console for code

### Code Not Working

1. Check code hasn't expired (15 minutes)
2. Ensure code is exactly 6 digits
3. Try resending code

### User Can't Login

1. Verify email is verified (`email_verified = true`)
2. Check error message for specific issue

## Next Steps

1. ✅ Configure SMTP settings in Railway
2. ✅ Run database migration (if needed)
3. ✅ Test signup flow
4. ✅ Test email delivery
5. ✅ Test verification code entry
