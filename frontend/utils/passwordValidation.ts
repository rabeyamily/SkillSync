/**
 * Password validation utility with strong password requirements
 */

// Common breached passwords (top 100 most common)
const COMMON_PASSWORDS = [
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
];

export interface PasswordValidationResult {
  isValid: boolean;
  errors: string[];
  strength: 'weak' | 'medium' | 'strong' | 'very-strong';
  score: number; // 0-100
}

export function validatePassword(
  password: string,
  userInfo?: {
    email?: string;
    fullName?: string;
    username?: string;
    phone?: string;
  }
): PasswordValidationResult {
  const errors: string[] = [];
  let score = 0;

  // 1. Minimum length (8 characters)
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  } else {
    score += 20;
  }

  // 2. Maximum length (64 characters)
  if (password.length > 64) {
    errors.push('Password must be no more than 64 characters long');
  }

  // 3. Character variety - at least 3 out of 4
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[!@#$%^&*_\-+=.,?;:()\[\]{}|\\\/`~<>]/.test(password);

  const varietyCount = [hasUppercase, hasLowercase, hasNumber, hasSpecial].filter(Boolean).length;

  if (varietyCount < 3) {
    const missing = [];
    if (!hasUppercase) missing.push('uppercase letter');
    if (!hasLowercase) missing.push('lowercase letter');
    if (!hasNumber) missing.push('number');
    if (!hasSpecial) missing.push('special character');
    errors.push(`Password must include at least 3 of: uppercase, lowercase, numbers, special characters. Missing: ${missing.slice(0, 2).join(', ')}`);
  } else {
    score += 30;
    if (varietyCount === 4) score += 10; // Bonus for all 4
  }

  // 4. No common passwords
  const lowerPassword = password.toLowerCase();
  if (COMMON_PASSWORDS.some(common => lowerPassword.includes(common.toLowerCase()))) {
    errors.push('Password is too common. Please choose a more unique password');
  } else {
    score += 15;
  }

  if (errors.length === 0) {
    score += 5; // Bonus for passing all checks
  }

  // Determine strength
  let strength: 'weak' | 'medium' | 'strong' | 'very-strong';
  if (score < 40) {
    strength = 'weak';
  } else if (score < 60) {
    strength = 'medium';
  } else if (score < 80) {
    strength = 'strong';
  } else {
    strength = 'very-strong';
  }

  return {
    isValid: errors.length === 0,
    errors,
    strength,
    score: Math.min(100, score)
  };
}

/**
 * Get password requirements as a readable list
 */
export function getPasswordRequirements(): string[] {
  return [
    'At least 8 characters (up to 64)',
    'At least 3 of: uppercase, lowercase, numbers, special characters',
    'No common passwords (e.g., "password123")'
  ];
}

