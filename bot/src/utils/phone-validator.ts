/**
 * Validate phone number format
 * Accepts any non-empty string as a valid phone number
 * This allows users to enter any phone number format they want
 */
export function isValidPhoneNumber(phone: string): boolean {
  // Accept any non-empty string as a valid phone number
  // Just check that it's not empty and has at least one character
  return Boolean(phone && phone.trim().length > 0);
}

/**
 * Normalize phone number (remove extra spaces, keep original format)
 * Preserves user's input format - just trims whitespace
 */
export function normalizePhoneNumber(phone: string): string {
  // Just trim whitespace from start and end
  // Keep the original format as user entered it
  return phone.trim();
}
