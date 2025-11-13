import validator from 'validator';

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  return validator.isEmail(email, {
    allow_utf8_local_part: true,
    require_tld: true,
  });
}

/**
 * Normalize email (trim and lowercase)
 */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

