/**
 * String utility functions
 */

/**
 * Capitalizes the first letter of a string
 */
export function capitalize(str: string): string {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

/**
 * Converts a string to camelCase
 */
export function toCamelCase(str: string): string {
  return str
    .toLowerCase()
    .replace(/[-_\s]+(.)?/g, (_, char) => char ? char.toUpperCase() : '');
}

/**
 * Converts a string to kebab-case
 */
export function toKebabCase(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase();
}

/**
 * Converts a string to snake_case
 */
export function toSnakeCase(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, '$1_$2')
    .replace(/[\s-]+/g, '_')
    .toLowerCase();
}

/**
 * Converts a string to PascalCase
 */
export function toPascalCase(str: string): string {
  return str
    .replace(/[-_\s]+(.)?/g, (_, char) => char ? char.toUpperCase() : '')
    .replace(/^[a-z]/, char => char.toUpperCase());
}

/**
 * Truncates a string to the specified length with ellipsis
 */
export function truncate(str: string, maxLength: number, suffix = '...'): string {
  if (str.length <= maxLength) return str;
  return str.substring(0, maxLength - suffix.length) + suffix;
}

/**
 * Removes leading and trailing whitespace and normalizes internal whitespace
 */
export function normalizeWhitespace(str: string): string {
  return str.trim().replace(/\s+/g, ' ');
}

/**
 * Checks if a string is empty or contains only whitespace
 */
export function isEmpty(str: string | null | undefined): boolean {
  return !str || str.trim().length === 0;
}

/**
 * Checks if a string is not empty
 */
export function isNotEmpty(str: string | null | undefined): str is string {
  return !isEmpty(str);
}

/**
 * Sanitizes a string by removing HTML tags and special characters
 */
export function sanitizeHtml(str: string): string {
  return str
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, '/');
}

/**
 * Escapes HTML special characters
 */
export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Generates a slug from a string (URL-friendly)
 */
export function slugify(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/[\s_-]+/g, '-') // Replace spaces and underscores with hyphens
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
}

/**
 * Pads a string to the left with the specified character
 */
export function padLeft(str: string, length: number, padChar = ' '): string {
  return str.padStart(length, padChar);
}

/**
 * Pads a string to the right with the specified character
 */
export function padRight(str: string, length: number, padChar = ' '): string {
  return str.padEnd(length, padChar);
}

/**
 * Removes the specified prefix from a string if it exists
 */
export function removePrefix(str: string, prefix: string): string {
  return str.startsWith(prefix) ? str.slice(prefix.length) : str;
}

/**
 * Removes the specified suffix from a string if it exists
 */
export function removeSuffix(str: string, suffix: string): string {
  return str.endsWith(suffix) ? str.slice(0, -suffix.length) : str;
}

/**
 * Counts the number of words in a string
 */
export function wordCount(str: string): number {
  return str.trim().split(/\s+/).filter(word => word.length > 0).length;
}

/**
 * Reverses a string
 */
export function reverse(str: string): string {
  return str.split('').reverse().join('');
}

/**
 * Checks if a string contains only alphanumeric characters
 */
export function isAlphanumeric(str: string): boolean {
  return /^[a-zA-Z0-9]+$/.test(str);
}

/**
 * Checks if a string contains only alphabetic characters
 */
export function isAlpha(str: string): boolean {
  return /^[a-zA-Z]+$/.test(str);
}

/**
 * Checks if a string contains only numeric characters
 */
export function isNumeric(str: string): boolean {
  return /^[0-9]+$/.test(str);
}

/**
 * Generates a random string of specified length
 */
export function randomString(length: number, chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'): string {
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Masks sensitive information in a string
 */
export function maskString(str: string, visibleStart = 2, visibleEnd = 2, maskChar = '*'): string {
  if (str.length <= visibleStart + visibleEnd) {
    return maskChar.repeat(str.length);
  }
  
  const start = str.substring(0, visibleStart);
  const end = str.substring(str.length - visibleEnd);
  const masked = maskChar.repeat(str.length - visibleStart - visibleEnd);
  
  return start + masked + end;
}

/**
 * Extracts initials from a full name
 */
export function getInitials(fullName: string, maxInitials = 2): string {
  return fullName
    .split(' ')
    .filter(name => name.length > 0)
    .slice(0, maxInitials)
    .map(name => name.charAt(0).toUpperCase())
    .join('');
}