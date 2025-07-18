/**
 * Validation utility functions
 */

/**
 * Email validation regex
 */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * URL validation regex
 */
const URL_REGEX = /^https?:\/\/(?:[-\w.])+(?::[0-9]+)?(?:\/(?:[\w/_.])*(?:\?(?:[\w&=%.])*)?(?:#(?:[\w.])*)?)?$/;

/**
 * UUID validation regex
 */
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Phone number validation regex (international format)
 */
const PHONE_REGEX = /^\+?[1-9]\d{1,14}$/;

/**
 * Strong password validation regex (8+ chars, uppercase, lowercase, number, special char)
 */
const STRONG_PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

/**
 * Credit card number validation regex (basic format check)
 */
const CREDIT_CARD_REGEX = /^[0-9]{13,19}$/;

/**
 * Hexadecimal color validation regex
 */
const HEX_COLOR_REGEX = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;

/**
 * IPv4 address validation regex
 */
const IPV4_REGEX = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;

/**
 * Validates an email address
 */
export function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(email.trim());
}

/**
 * Validates a URL
 */
export function isValidUrl(url: string): boolean {
  return URL_REGEX.test(url.trim());
}

/**
 * Validates a UUID
 */
export function isValidUuid(uuid: string): boolean {
  return UUID_REGEX.test(uuid.trim());
}

/**
 * Validates a phone number (international format)
 */
export function isValidPhone(phone: string): boolean {
  const cleaned = phone.replace(/[\s\-\(\)\.]/g, '');
  return PHONE_REGEX.test(cleaned);
}

/**
 * Validates password strength
 */
export function isStrongPassword(password: string): boolean {
  return STRONG_PASSWORD_REGEX.test(password);
}

/**
 * Validates credit card number format
 */
export function isValidCreditCard(cardNumber: string): boolean {
  const cleaned = cardNumber.replace(/[\s\-]/g, '');
  return CREDIT_CARD_REGEX.test(cleaned);
}

/**
 * Validates hexadecimal color code
 */
export function isValidHexColor(color: string): boolean {
  return HEX_COLOR_REGEX.test(color.trim());
}

/**
 * Validates IPv4 address
 */
export function isValidIPv4(ip: string): boolean {
  return IPV4_REGEX.test(ip.trim());
}

/**
 * Validates if a string is a valid JSON
 */
export function isValidJson(jsonString: string): boolean {
  try {
    JSON.parse(jsonString);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validates if a value is a number
 */
export function isValidNumber(value: any): boolean {
  return typeof value === 'number' && !isNaN(value) && isFinite(value);
}

/**
 * Validates if a value is a positive number
 */
export function isPositiveNumber(value: any): boolean {
  return isValidNumber(value) && value > 0;
}

/**
 * Validates if a value is a non-negative number
 */
export function isNonNegativeNumber(value: any): boolean {
  return isValidNumber(value) && value >= 0;
}

/**
 * Validates if a value is an integer
 */
export function isInteger(value: any): boolean {
  return isValidNumber(value) && Number.isInteger(value);
}

/**
 * Validates if a value is a positive integer
 */
export function isPositiveInteger(value: any): boolean {
  return isInteger(value) && value > 0;
}

/**
 * Validates if a string has minimum length
 */
export function hasMinLength(str: string, minLength: number): boolean {
  return str.length >= minLength;
}

/**
 * Validates if a string has maximum length
 */
export function hasMaxLength(str: string, maxLength: number): boolean {
  return str.length <= maxLength;
}

/**
 * Validates if a string length is within range
 */
export function hasLengthInRange(str: string, minLength: number, maxLength: number): boolean {
  return str.length >= minLength && str.length <= maxLength;
}

/**
 * Validates if a number is within range
 */
export function isInRange(num: number, min: number, max: number): boolean {
  return num >= min && num <= max;
}

/**
 * Validates if a date is valid
 */
export function isValidDate(date: any): boolean {
  return date instanceof Date && !isNaN(date.getTime());
}

/**
 * Validates if a date is in the past
 */
export function isPastDate(date: Date): boolean {
  return isValidDate(date) && date < new Date();
}

/**
 * Validates if a date is in the future
 */
export function isFutureDate(date: Date): boolean {
  return isValidDate(date) && date > new Date();
}

/**
 * Validates if a value is truthy
 */
export function isTruthy(value: any): boolean {
  return Boolean(value);
}

/**
 * Validates if a value is falsy
 */
export function isFalsy(value: any): boolean {
  return !Boolean(value);
}

/**
 * Validates if a value is null or undefined
 */
export function isNullOrUndefined(value: any): value is null | undefined {
  return value === null || value === undefined;
}

/**
 * Validates if a value is not null or undefined
 */
export function isNotNullOrUndefined<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

/**
 * Validates if an array is not empty
 */
export function isNonEmptyArray<T>(array: T[]): boolean {
  return Array.isArray(array) && array.length > 0;
}

/**
 * Validates if an object is not empty
 */
export function isNonEmptyObject(obj: any): boolean {
  return typeof obj === 'object' && obj !== null && Object.keys(obj).length > 0;
}

/**
 * Validates if a string contains only alphabetic characters
 */
export function isAlphaOnly(str: string): boolean {
  return /^[a-zA-Z]+$/.test(str);
}

/**
 * Validates if a string contains only alphanumeric characters
 */
export function isAlphaNumericOnly(str: string): boolean {
  return /^[a-zA-Z0-9]+$/.test(str);
}

/**
 * Validates if a string contains only numeric characters
 */
export function isNumericOnly(str: string): boolean {
  return /^[0-9]+$/.test(str);
}

/**
 * Validates if a string matches a pattern
 */
export function matchesPattern(str: string, pattern: RegExp): boolean {
  return pattern.test(str);
}

/**
 * Validates if all values in an array pass a predicate
 */
export function allValid<T>(array: T[], predicate: (item: T) => boolean): boolean {
  return array.every(predicate);
}

/**
 * Validates if any value in an array passes a predicate
 */
export function anyValid<T>(array: T[], predicate: (item: T) => boolean): boolean {
  return array.some(predicate);
}

/**
 * Password strength assessment
 */
export interface PasswordStrength {
  score: number; // 0-4
  hasMinLength: boolean;
  hasUppercase: boolean;
  hasLowercase: boolean;
  hasNumber: boolean;
  hasSpecialChar: boolean;
  feedback: string[];
}

/**
 * Assesses password strength
 */
export function assessPasswordStrength(password: string): PasswordStrength {
  const feedback: string[] = [];
  let score = 0;

  const hasMinLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSpecialChar = /[@$!%*?&]/.test(password);

  if (!hasMinLength) {
    feedback.push('Password should be at least 8 characters long');
  } else {
    score++;
  }

  if (!hasUppercase) {
    feedback.push('Password should contain at least one uppercase letter');
  } else {
    score++;
  }

  if (!hasLowercase) {
    feedback.push('Password should contain at least one lowercase letter');
  } else {
    score++;
  }

  if (!hasNumber) {
    feedback.push('Password should contain at least one number');
  } else {
    score++;
  }

  if (!hasSpecialChar) {
    feedback.push('Password should contain at least one special character (@$!%*?&)');
  } else {
    score++;
  }

  if (password.length >= 12) {
    score = Math.min(score + 1, 5);
  }

  return {
    score: Math.min(score, 4),
    hasMinLength,
    hasUppercase,
    hasLowercase,
    hasNumber,
    hasSpecialChar,
    feedback
  };
}

/**
 * Custom validation function type
 */
export type ValidationFunction<T> = (value: T) => boolean | string;

/**
 * Validation result type
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Validates a value against multiple validation functions
 */
export function validate<T>(value: T, validators: ValidationFunction<T>[]): ValidationResult {
  const errors: string[] = [];

  for (const validator of validators) {
    const result = validator(value);
    
    if (result === false) {
      errors.push('Validation failed');
    } else if (typeof result === 'string') {
      errors.push(result);
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Creates a required field validator
 */
export function required<T>(message = 'This field is required'): ValidationFunction<T> {
  return (value: T) => {
    if (value === null || value === undefined || value === '') {
      return message;
    }
    return true;
  };
}

/**
 * Creates a minimum length validator
 */
export function minLength(min: number, message?: string): ValidationFunction<string> {
  return (value: string) => {
    if (value.length < min) {
      return message || `Minimum length is ${min} characters`;
    }
    return true;
  };
}

/**
 * Creates a maximum length validator
 */
export function maxLength(max: number, message?: string): ValidationFunction<string> {
  return (value: string) => {
    if (value.length > max) {
      return message || `Maximum length is ${max} characters`;
    }
    return true;
  };
}

/**
 * Creates an email validator
 */
export function email(message = 'Please enter a valid email address'): ValidationFunction<string> {
  return (value: string) => {
    return isValidEmail(value) || message;
  };
}

/**
 * Creates a URL validator
 */
export function url(message = 'Please enter a valid URL'): ValidationFunction<string> {
  return (value: string) => {
    return isValidUrl(value) || message;
  };
}