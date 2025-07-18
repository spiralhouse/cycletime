/**
 * Validation utilities tests
 */

import {
  isValidEmail,
  isValidUrl,
  isValidUuid,
  isValidPhone,
  isStrongPassword,
  isValidCreditCard,
  isValidHexColor,
  isValidIPv4,
  isValidJson,
  isValidNumber,
  isPositiveNumber,
  isNonNegativeNumber,
  isInteger,
  isPositiveInteger,
  hasMinLength,
  hasMaxLength,
  hasLengthInRange,
  isInRange,
  isPastDate,
  isFutureDate,
  isTruthy,
  isFalsy,
  isNullOrUndefined,
  isNotNullOrUndefined,
  isNonEmptyArray,
  isNonEmptyObject,
  isAlphaOnly,
  isAlphaNumericOnly,
  isNumericOnly,
  matchesPattern,
  allValid,
  anyValid,
  assessPasswordStrength,
  validate,
  required,
  minLength,
  maxLength,
  email,
  url
} from '../validation';

describe('Validation Utilities', () => {
  describe('isValidEmail', () => {
    it('should validate email addresses', () => {
      expect(isValidEmail('test@example.com')).toBe(true);
      expect(isValidEmail('user.name@domain.co.uk')).toBe(true);
      expect(isValidEmail('invalid-email')).toBe(false);
      expect(isValidEmail('test@')).toBe(false);
      expect(isValidEmail('@example.com')).toBe(false);
    });
  });

  describe('isValidUrl', () => {
    it('should validate URLs', () => {
      expect(isValidUrl('https://example.com')).toBe(true);
      expect(isValidUrl('http://example.com')).toBe(true);
      expect(isValidUrl('https://example.com/path')).toBe(true);
      expect(isValidUrl('invalid-url')).toBe(false);
      expect(isValidUrl('ftp://example.com')).toBe(false);
    });
  });

  describe('isValidUuid', () => {
    it('should validate UUIDs', () => {
      expect(isValidUuid('123e4567-e89b-12d3-a456-426614174000')).toBe(true);
      expect(isValidUuid('invalid-uuid')).toBe(false);
      expect(isValidUuid('123e4567-e89b-12d3-a456')).toBe(false);
    });
  });

  describe('isStrongPassword', () => {
    it('should validate strong passwords', () => {
      expect(isStrongPassword('StrongPass123!')).toBe(true);
      expect(isStrongPassword('password')).toBe(false);
      expect(isStrongPassword('PASSWORD123')).toBe(false);
      expect(isStrongPassword('Pass123')).toBe(false);
    });
  });

  describe('isPositiveNumber', () => {
    it('should validate positive numbers', () => {
      expect(isPositiveNumber(5)).toBe(true);
      expect(isPositiveNumber(0.1)).toBe(true);
      expect(isPositiveNumber(0)).toBe(false);
      expect(isPositiveNumber(-5)).toBe(false);
      expect(isPositiveNumber('5')).toBe(false);
    });
  });

  describe('validate', () => {
    it('should validate with multiple validators', () => {
      const value = 'test@example.com';
      const validators = [
        required(),
        email(),
        minLength(5)
      ];
      
      const result = validate(value, validators);
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should collect validation errors', () => {
      const value = '';
      const validators = [
        required('Email is required'),
        email('Invalid email format'),
        minLength(5, 'Too short')
      ];
      
      const result = validate(value, validators);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Email is required');
    });
  });

  describe('assessPasswordStrength', () => {
    it('should assess password strength', () => {
      const weak = assessPasswordStrength('password');
      expect(weak.score).toBeLessThan(4);
      expect(weak.feedback.length).toBeGreaterThan(0);

      const strong = assessPasswordStrength('StrongPass123!');
      expect(strong.score).toBeGreaterThanOrEqual(4);
      expect(strong.hasUppercase).toBe(true);
      expect(strong.hasLowercase).toBe(true);
      expect(strong.hasNumber).toBe(true);
      expect(strong.hasSpecialChar).toBe(true);
    });
  });
});