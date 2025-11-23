"""
Password validation utility with strong password requirements.
"""
import re
from typing import Optional, List, Tuple

# Common breached passwords (top 100 most common)
COMMON_PASSWORDS = [
    '123456', 'password', '123456789', '12345678', '12345', '1234567', '1234567890',
    'qwerty', 'abc123', '111111', '123123', 'admin', 'letmein', 'welcome',
    'monkey', '1234567890', 'qwerty123', '000000', '12345678910', 'password123',
    'Password1', 'password1', 'qwertyuiop', '123321', 'dragon', 'sunshine',
    'princess', 'football', 'iloveyou', '123qwe', 'starwars', '123abc',
    'trustno1', 'jordan23', 'jennifer', 'zxcvbnm', 'asdfgh', 'hunter',
    'buster', 'soccer', 'harley', 'batman', 'andrew', 'tigger', 'shadow',
    'master', 'jordan', 'michael', 'michelle', 'superman', 'qwerty12',
    'hello', 'freedom', 'whatever', 'qazwsx', 'ninja', 'mustang', 'baseball',
    'access', 'flower', 'hello123', 'welcome123', 'login', 'admin123',
    'princess1', 'qwerty1', 'solo', 'passw0rd', 'starwars1', 'dragon1',
    'password12', 'master1', 'hello1', 'freedom1', 'whatever1', 'ninja1',
    'mustang1', 'baseball1', 'access1', 'flower1', 'login1', 'princess12',
    'qwerty1234', 'solo1', 'starwars12', 'dragon12', 'password1234',
    'master12', 'hello12', 'freedom12', 'whatever12', 'ninja12', 'mustang12',
    'baseball12', 'access12', 'flower12', 'login12', 'admin1234', 'princess123',
    'qwerty12345', 'solo12', 'starwars123', 'dragon123', 'password12345'
]

# Sequential patterns
SEQUENTIAL_PATTERNS = [
    re.compile(r'(abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz)', re.IGNORECASE),
    re.compile(r'(012|123|234|345|456|567|678|789|890)'),
    re.compile(r'(qwer|wert|erty|rtyu|tyui|yuio|uiop|asdf|sdfg|dfgh|fghj|ghjk|hjkl|zxcv|xcvb|cvbn|vbnm)', re.IGNORECASE)
]

# Keyboard walk patterns
KEYBOARD_WALKS = [
    re.compile(r'(1qaz|qaz2|az2w|z2ws|2wsx|wsx3|sx3e|x3ed|3edc|edc4|dc4r|c4rf|4rfv|rfv5|fv5t|v5tg|5tgb|tgb6|gb6y|b6yh|6yhn|yhn7|hn7u|n7uj|7ujm|ujm8|jm8i|m8ik|8iko|iko9|ko9o|o9ol|9ol0|ol0p|l0p-)', re.IGNORECASE),
    re.compile(r'(qwerty|asdfgh|zxcvbn)', re.IGNORECASE)
]


def validate_password(
    password: str,
    user_info: Optional[dict] = None
) -> Tuple[bool, List[str]]:
    """
    Validate password against strong password requirements.
    
    Args:
        password: Password to validate
        user_info: Optional dict with email, full_name, username, phone
        
    Returns:
        Tuple of (is_valid, list_of_errors)
    """
    errors = []
    
    # 1. Minimum length (12 characters)
    if len(password) < 12:
        errors.append("Password must be at least 12 characters long")
    
    # 2. Maximum length (64 characters)
    if len(password) > 64:
        errors.append("Password must be no more than 64 characters long")
    
    # 3. Character variety - at least 3 out of 4
    has_uppercase = bool(re.search(r'[A-Z]', password))
    has_lowercase = bool(re.search(r'[a-z]', password))
    has_number = bool(re.search(r'[0-9]', password))
    has_special = bool(re.search(r'[!@#$%^&*_\-+=.,?;:()\[\]{}|\\\/`~<>]', password))
    
    variety_count = sum([has_uppercase, has_lowercase, has_number, has_special])
    
    if variety_count < 3:
        missing = []
        if not has_uppercase:
            missing.append("uppercase letter")
        if not has_lowercase:
            missing.append("lowercase letter")
        if not has_number:
            missing.append("number")
        if not has_special:
            missing.append("special character")
        errors.append(
            f"Password must include at least 3 of: uppercase, lowercase, numbers, special characters. "
            f"Missing: {', '.join(missing[:2])}"
        )
    
    # 4. No common passwords
    lower_password = password.lower()
    for common in COMMON_PASSWORDS:
        if common.lower() in lower_password:
            errors.append("Password is too common. Please choose a more unique password")
            break
    
    # 5. No simple patterns
    # Sequential patterns
    for pattern in SEQUENTIAL_PATTERNS:
        if pattern.search(password):
            errors.append("Password contains sequential patterns (e.g., 'abc', '123')")
            break
    
    # Keyboard walks
    for pattern in KEYBOARD_WALKS:
        if pattern.search(password):
            errors.append("Password contains keyboard walk patterns (e.g., 'qwerty', '1qaz')")
            break
    
    # Repeated characters (more than 3 in a row)
    if re.search(r'(.)\1{3,}', password):
        errors.append("Password contains too many repeated characters")
    
    # 6. No personal info
    if user_info:
        lower_password = password.lower()
        
        # Check email (username part)
        if user_info.get('email'):
            email_username = user_info['email'].lower().split('@')[0]
            if len(email_username) > 2 and email_username in lower_password:
                errors.append("Password cannot contain your email")
        
        # Check full name
        if user_info.get('full_name'):
            name_parts = user_info['full_name'].lower().split()
            for part in name_parts:
                if len(part) > 2 and part in lower_password:
                    errors.append("Password cannot contain your name")
                    break
        
        # Check username
        if user_info.get('username'):
            username = user_info['username'].lower()
            if len(username) > 2 and username in lower_password:
                errors.append("Password cannot contain your username")
        
        # Check phone (digits only)
        if user_info.get('phone'):
            phone_digits = ''.join(filter(str.isdigit, user_info['phone']))
            if len(phone_digits) > 3 and phone_digits in password:
                errors.append("Password cannot contain your phone number")
    
    return len(errors) == 0, errors

