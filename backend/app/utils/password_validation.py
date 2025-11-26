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
    
    # 1. Minimum length (8 characters)
    if len(password) < 8:
        errors.append("Password must be at least 8 characters long")
    
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
    
    return len(errors) == 0, errors

