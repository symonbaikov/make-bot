/**
 * Validate phone number format
 * Accepts any phone number format - minimal validation only
 * Just checks that it's not empty and has reasonable length
 */
export function isValidPhoneNumber(phone: string): boolean {
  if (!phone || typeof phone !== 'string') {
    return false;
  }

  // Remove spaces, dashes, parentheses for length check
  const cleaned = phone.replace(/[\s\-()]/g, '');
  
  // Accept any phone number that:
  // 1. Is not empty after cleaning
  // 2. Has at least 3 characters (to avoid very short inputs)
  // 3. Has at most 30 characters (reasonable limit)
  // 4. Contains at least some digits or + sign
  if (cleaned.length < 3 || cleaned.length > 30) {
    return false;
  }

  // Must contain at least one digit or + sign
  if (!/[0-9+]/.test(cleaned)) {
    return false;
  }

  return true;
}

/**
 * Normalize phone number (remove extra spaces, keep original format)
 * Preserves user input as much as possible - just cleans up whitespace
 */
export function normalizePhoneNumber(phone: string): string {
  if (!phone || typeof phone !== 'string') {
    return '';
  }

  // Remove leading/trailing whitespace
  let cleaned = phone.trim();
  
  // Remove multiple consecutive spaces, but keep single spaces
  cleaned = cleaned.replace(/\s+/g, ' ');
  
  // Return as-is - accept any format the user provides
  return cleaned;
}

