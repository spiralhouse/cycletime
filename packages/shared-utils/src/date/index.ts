/**
 * Date and time utility functions
 */

/**
 * Date format options
 */
export type DateFormat = 'ISO' | 'US' | 'EU' | 'short' | 'long' | 'relative';

/**
 * Time unit enumeration
 */
export type TimeUnit = 'milliseconds' | 'seconds' | 'minutes' | 'hours' | 'days' | 'weeks' | 'months' | 'years';

/**
 * Formats a date according to the specified format
 */
export function formatDate(date: Date | string | number, format: DateFormat = 'ISO'): string {
  const d = new Date(date);
  
  if (isNaN(d.getTime())) {
    throw new Error('Invalid date provided');
  }
  
  switch (format) {
    case 'ISO':
      return d.toISOString().split('T')[0];
    case 'US':
      return d.toLocaleDateString('en-US');
    case 'EU':
      return d.toLocaleDateString('en-GB');
    case 'short':
      return d.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
      });
    case 'long':
      return d.toLocaleDateString('en-US', { 
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    case 'relative':
      return getRelativeTime(d);
    default:
      return d.toISOString().split('T')[0];
  }
}

/**
 * Formats a time according to 12-hour or 24-hour format
 */
export function formatTime(date: Date | string | number, use24Hour = false): string {
  const d = new Date(date);
  
  if (isNaN(d.getTime())) {
    throw new Error('Invalid date provided');
  }
  
  return d.toLocaleTimeString('en-US', { 
    hour12: !use24Hour,
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Formats a date and time together
 */
export function formatDateTime(date: Date | string | number, dateFormat: DateFormat = 'ISO', use24Hour = false): string {
  return `${formatDate(date, dateFormat)} ${formatTime(date, use24Hour)}`;
}

/**
 * Gets relative time string (e.g., "2 hours ago", "in 3 days")
 */
export function getRelativeTime(date: Date | string | number): string {
  const d = new Date(date);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const isPast = diffMs > 0;
  const absDiffMs = Math.abs(diffMs);
  
  const units: Array<{ unit: TimeUnit; ms: number; label: string }> = [
    { unit: 'years', ms: 365 * 24 * 60 * 60 * 1000, label: 'year' },
    { unit: 'months', ms: 30 * 24 * 60 * 60 * 1000, label: 'month' },
    { unit: 'weeks', ms: 7 * 24 * 60 * 60 * 1000, label: 'week' },
    { unit: 'days', ms: 24 * 60 * 60 * 1000, label: 'day' },
    { unit: 'hours', ms: 60 * 60 * 1000, label: 'hour' },
    { unit: 'minutes', ms: 60 * 1000, label: 'minute' },
    { unit: 'seconds', ms: 1000, label: 'second' },
  ];
  
  // Less than 60 seconds is considered "just now"
  if (absDiffMs < 60000) {
    return 'just now';
  }

  for (const { ms, label } of units) {
    const value = Math.floor(absDiffMs / ms);
    if (value >= 1) {
      const plural = value > 1 ? 's' : '';
      return isPast 
        ? `${value} ${label}${plural} ago`
        : `in ${value} ${label}${plural}`;
    }
  }
  
  return 'just now';
}

/**
 * Adds time to a date
 */
export function addTime(date: Date | string | number, amount: number, unit: TimeUnit): Date {
  const d = new Date(date);
  
  if (isNaN(d.getTime())) {
    throw new Error('Invalid date provided');
  }
  
  const result = new Date(d);
  
  switch (unit) {
    case 'milliseconds':
      result.setMilliseconds(result.getMilliseconds() + amount);
      break;
    case 'seconds':
      result.setSeconds(result.getSeconds() + amount);
      break;
    case 'minutes':
      result.setMinutes(result.getMinutes() + amount);
      break;
    case 'hours':
      result.setHours(result.getHours() + amount);
      break;
    case 'days':
      result.setDate(result.getDate() + amount);
      break;
    case 'weeks':
      result.setDate(result.getDate() + (amount * 7));
      break;
    case 'months':
      result.setMonth(result.getMonth() + amount);
      break;
    case 'years':
      result.setFullYear(result.getFullYear() + amount);
      break;
    default:
      throw new Error(`Invalid time unit: ${unit}`);
  }
  
  return result;
}

/**
 * Subtracts time from a date
 */
export function subtractTime(date: Date | string | number, amount: number, unit: TimeUnit): Date {
  return addTime(date, -amount, unit);
}

/**
 * Gets the difference between two dates in the specified unit
 */
export function getTimeDifference(date1: Date | string | number, date2: Date | string | number, unit: TimeUnit): number {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  
  if (isNaN(d1.getTime()) || isNaN(d2.getTime())) {
    throw new Error('Invalid date(s) provided');
  }
  
  const diffMs = Math.abs(d2.getTime() - d1.getTime());
  
  switch (unit) {
    case 'milliseconds':
      return diffMs;
    case 'seconds':
      return Math.floor(diffMs / 1000);
    case 'minutes':
      return Math.floor(diffMs / (1000 * 60));
    case 'hours':
      return Math.floor(diffMs / (1000 * 60 * 60));
    case 'days':
      return Math.floor(diffMs / (1000 * 60 * 60 * 24));
    case 'weeks':
      return Math.floor(diffMs / (1000 * 60 * 60 * 24 * 7));
    case 'months':
      return Math.floor(diffMs / (1000 * 60 * 60 * 24 * 30));
    case 'years':
      return Math.floor(diffMs / (1000 * 60 * 60 * 24 * 365));
    default:
      throw new Error(`Invalid time unit: ${unit}`);
  }
}

/**
 * Checks if a date is today
 */
export function isToday(date: Date | string | number): boolean {
  const d = new Date(date);
  const today = new Date();
  
  return d.getDate() === today.getDate() &&
         d.getMonth() === today.getMonth() &&
         d.getFullYear() === today.getFullYear();
}

/**
 * Checks if a date is yesterday
 */
export function isYesterday(date: Date | string | number): boolean {
  const d = new Date(date);
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  
  return d.getDate() === yesterday.getDate() &&
         d.getMonth() === yesterday.getMonth() &&
         d.getFullYear() === yesterday.getFullYear();
}

/**
 * Checks if a date is tomorrow
 */
export function isTomorrow(date: Date | string | number): boolean {
  const d = new Date(date);
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  return d.getDate() === tomorrow.getDate() &&
         d.getMonth() === tomorrow.getMonth() &&
         d.getFullYear() === tomorrow.getFullYear();
}

/**
 * Gets the start of day (00:00:00)
 */
export function startOfDay(date: Date | string | number): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Gets the end of day (23:59:59.999)
 */
export function endOfDay(date: Date | string | number): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

/**
 * Gets the start of week (Monday 00:00:00)
 */
export function startOfWeek(date: Date | string | number): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Gets the end of week (Sunday 23:59:59.999)
 */
export function endOfWeek(date: Date | string | number): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() + (7 - day) % 7;
  d.setDate(diff);
  d.setHours(23, 59, 59, 999);
  return d;
}

/**
 * Gets the start of month (1st day 00:00:00)
 */
export function startOfMonth(date: Date | string | number): Date {
  const d = new Date(date);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Gets the end of month (last day 23:59:59.999)
 */
export function endOfMonth(date: Date | string | number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + 1, 0);
  d.setHours(23, 59, 59, 999);
  return d;
}

/**
 * Checks if a year is a leap year
 */
export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
}

/**
 * Gets the number of days in a month
 */
export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

/**
 * Validates if a date string is valid
 */
export function isValidDate(dateString: string | Date | number): boolean {
  const date = new Date(dateString);
  return !isNaN(date.getTime());
}

/**
 * Converts a date to Unix timestamp (seconds)
 */
export function toUnixTimestamp(date: Date | string | number): number {
  return Math.floor(new Date(date).getTime() / 1000);
}

/**
 * Converts Unix timestamp (seconds) to Date
 */
export function fromUnixTimestamp(timestamp: number): Date {
  return new Date(timestamp * 1000);
}

/**
 * Gets the age in years from a birth date
 */
export function getAge(birthDate: Date | string | number): number {
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  
  return age;
}