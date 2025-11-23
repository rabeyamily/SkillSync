"""
Email service for sending verification codes and notifications.
"""
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional
import secrets
from datetime import datetime, timedelta
from app.config import settings


def generate_verification_code() -> str:
    """Generate a 6-digit verification code."""
    return ''.join([str(secrets.randbelow(10)) for _ in range(6)])


def send_verification_email(email: str, code: str) -> bool:
    """
    Send verification code email to user.
    
    Args:
        email: Recipient email address
        code: Verification code to send
        
    Returns:
        True if email sent successfully, False otherwise
    """
    try:
        # Check if email settings are configured
        if not settings.smtp_user or not settings.smtp_password:
            print("Email settings not configured. Skipping email send.")
            # In development, print the code instead
            if settings.debug:
                print(f"[DEV] Verification code for {email}: {code}")
            return True  # Return True in dev mode to allow testing
        
        # Create message
        msg = MIMEMultipart('alternative')
        msg['Subject'] = "Verify Your SkillSync Account"
        msg['From'] = f"{settings.smtp_from_name} <{settings.smtp_from_email or settings.smtp_user}>"
        msg['To'] = email
        
        # Create email content
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background: linear-gradient(to right, #0077b5, #00a0dc); color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }}
                .content {{ background: #f9f9f9; padding: 30px; border-radius: 0 0 5px 5px; }}
                .code {{ background: #fff; border: 2px dashed #0077b5; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 5px; margin: 20px 0; color: #0077b5; }}
                .footer {{ text-align: center; margin-top: 20px; color: #666; font-size: 12px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>SkillSync</h1>
                </div>
                <div class="content">
                    <h2>Verify Your Email Address</h2>
                    <p>Thank you for signing up for SkillSync! Please use the verification code below to complete your registration:</p>
                    <div class="code">{code}</div>
                    <p>This code will expire in {settings.email_verification_code_expiry_minutes} minutes.</p>
                    <p>If you didn't create an account with SkillSync, please ignore this email.</p>
                </div>
                <div class="footer">
                    <p>© 2024 SkillSync. All rights reserved.</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        text_content = f"""
        SkillSync - Verify Your Email Address
        
        Thank you for signing up for SkillSync!
        
        Your verification code is: {code}
        
        This code will expire in {settings.email_verification_code_expiry_minutes} minutes.
        
        If you didn't create an account with SkillSync, please ignore this email.
        """
        
        # Attach parts
        part1 = MIMEText(text_content, 'plain')
        part2 = MIMEText(html_content, 'html')
        
        msg.attach(part1)
        msg.attach(part2)
        
        # Send email
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port) as server:
            server.starttls()
            server.login(settings.smtp_user, settings.smtp_password)
            server.send_message(msg)
        
        print(f"Verification email sent to {email}")
        return True
        
    except Exception as e:
        print(f"Error sending verification email to {email}: {str(e)}")
        # In development, still print the code
        if settings.debug:
            print(f"[DEV] Verification code for {email}: {code}")
        return False


def get_verification_code_expiry() -> datetime:
    """Get the expiration time for a verification code."""
    return datetime.utcnow() + timedelta(minutes=settings.email_verification_code_expiry_minutes)


def is_verification_code_expired(expires_at: Optional[datetime]) -> bool:
    """Check if a verification code has expired."""
    if expires_at is None:
        return True
    return datetime.utcnow() > expires_at

