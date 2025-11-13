import validator from 'validator';

/**
 * Validate phone number format
 * Supports international format with or without + sign
 */
export function isValidPhoneNumber(phone: string): boolean {
  // Remove spaces and dashes for validation
  const cleaned = phone.replace(/[\s-]/g, '');
  
  // Check if it's a valid mobile phone number
  // This accepts international format with or without +
  return validator.isMobilePhone(cleaned, 'any', { strictMode: false });
}

/**
 * Normalize phone number (remove spaces, dashes, ensure + prefix for international)
 */
export function normalizePhoneNumber(phone: string): string {
  // Remove spaces, dashes, parentheses
  let cleaned = phone.replace(/[\s\-()]/g, '');
  
  // If doesn't start with +, try to add it if it looks like international number
  if (!cleaned.startsWith('+')) {
    // If starts with country code (like 1, 7, etc.), add +
    // This is a simple heuristic - you might want to improve it
    if (cleaned.length > 10 && /^[1-9]\d{1,14}$/.test(cleaned)) {
      cleaned = '+' + cleaned;
    }
  }
  
  return cleaned;
}

