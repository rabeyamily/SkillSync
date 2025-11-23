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

// Sequential patterns
const SEQUENTIAL_PATTERNS = [
  /(abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz)/i,
  /(012|123|234|345|456|567|678|789|890)/,
  /(qwer|wert|erty|rtyu|tyui|yuio|uiop|asdf|sdfg|dfgh|fghj|ghjk|hjkl|zxcv|xcvb|cvbn|vbnm)/i
];

// Keyboard walk patterns
const KEYBOARD_WALKS = [
  /(1qaz|qaz2|az2w|z2ws|2wsx|wsx3|sx3e|x3ed|3edc|edc4|dc4r|c4rf|4rfv|rfv5|fv5t|v5tg|5tgb|tgb6|gb6y|b6yh|6yhn|yhn7|hn7u|n7uj|7ujm|ujm8|jm8i|m8ik|8iko|iko9|ko9o|o9ol|9ol0|ol0p|l0p-)/i,
  /(qwerty|asdfgh|zxcvbn)/i
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

  // 1. Minimum length (12 characters)
  if (password.length < 12) {
    errors.push('Password must be at least 12 characters long');
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

  // 5. No simple patterns
  // Sequential patterns
  if (SEQUENTIAL_PATTERNS.some(pattern => pattern.test(password))) {
    errors.push('Password contains sequential patterns (e.g., "abc", "123")');
  } else {
    score += 10;
  }

  // Keyboard walks
  if (KEYBOARD_WALKS.some(pattern => pattern.test(password))) {
    errors.push('Password contains keyboard walk patterns (e.g., "qwerty", "1qaz")');
  } else {
    score += 5;
  }

  // Repeated characters (more than 3 in a row)
  if (/(.)\1{3,}/.test(password)) {
    errors.push('Password contains too many repeated characters');
  } else {
    score += 5;
  }

  // 6. No personal info
  if (userInfo) {
    const lowerPassword = password.toLowerCase();
    const checks: { value: string | undefined; name: string }[] = [
      { value: userInfo.email?.toLowerCase().split('@')[0], name: 'email' },
      { value: userInfo.fullName?.toLowerCase(), name: 'name' },
      { value: userInfo.username?.toLowerCase(), name: 'username' },
      { value: userInfo.phone?.replace(/\D/g, ''), name: 'phone number' }
    ];

    for (const check of checks) {
      if (check.value && check.value.length > 2 && lowerPassword.includes(check.value)) {
        errors.push(`Password cannot contain your ${check.name}`);
        break;
      }
    }
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
    'At least 12 characters (up to 64)',
    'At least 3 of: uppercase, lowercase, numbers, special characters',
    'No common passwords (e.g., "password123")',
    'No sequential patterns (e.g., "abc", "123")',
    'No keyboard walks (e.g., "qwerty")',
    'No repeated characters (e.g., "aaaa")',
    'No personal information (name, email, phone)'
  ];
}

