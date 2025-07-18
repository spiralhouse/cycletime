/**
 * @cycletime/shared-utils
 * 
 * Shared utility functions for CycleTime services
 * Framework-agnostic, pure functions with comprehensive TypeScript typing
 */

// Export string utilities
export * from './string';

// Export date/time utilities
export * from './date';

// Export array manipulation utilities
export * from './array';

// Export object manipulation utilities (excluding compact to avoid naming conflict)
export {
  deepClone,
  deepMerge,
  isPlainObject,
  get,
  set,
  has,
  unset,
  pick,
  omit,
  fromPairs,
  toPairs,
  invert,
  mapValues,
  mapKeys,
  pickBy,
  omitBy,
  flatten,
  unflatten,
  isEqual,
  isEmpty,
  getAllKeys,
  getAllValues
} from './object';

// Export validation utilities (excluding isValidDate to avoid naming conflict with date module)
export {
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
  url,
  ValidationFunction,
  ValidationResult,
  PasswordStrength
} from './validation';

// Export error handling utilities
export * from './error';

// Export logging utilities
export * from './logger';

// Version information
export const VERSION = '0.1.0';

