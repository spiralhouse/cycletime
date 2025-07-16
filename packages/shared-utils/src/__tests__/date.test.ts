/**
 * Date utilities tests
 */

import {
  formatDate,
  formatTime,
  formatDateTime,
  getRelativeTime,
  addTime,
  subtractTime,
  getTimeDifference,
  isToday,
  isYesterday,
  isTomorrow,
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  isLeapYear,
  getDaysInMonth,
  isValidDate,
  toUnixTimestamp,
  fromUnixTimestamp,
  getAge
} from '../date';

describe('Date Utilities', () => {
  const testDate = new Date('2023-06-15T14:30:45.123Z');

  describe('formatDate', () => {
    it('should format dates correctly', () => {
      expect(formatDate(testDate, 'ISO')).toBe('2023-06-15');
      expect(formatDate(testDate, 'US')).toMatch(/6\/15\/2023/);
      expect(formatDate(testDate, 'EU')).toMatch(/15\/06\/2023/);
    });

    it('should handle string dates', () => {
      expect(formatDate('2023-06-15', 'ISO')).toBe('2023-06-15');
    });

    it('should throw for invalid dates', () => {
      expect(() => formatDate('invalid')).toThrow('Invalid date provided');
    });
  });

  describe('formatTime', () => {
    it('should format time correctly', () => {
      const time12 = formatTime(testDate, false);
      const time24 = formatTime(testDate, true);
      
      expect(time12).toMatch(/PM|AM/);
      expect(time24).not.toMatch(/PM|AM/);
    });
  });

  describe('formatDateTime', () => {
    it('should format date and time together', () => {
      const formatted = formatDateTime(testDate, 'ISO', true);
      expect(formatted).toContain('2023-06-15');
      expect(formatted).toContain(':');
    });
  });

  describe('getRelativeTime', () => {
    const now = new Date();
    
    it('should return relative time strings', () => {
      const pastDate = new Date(now.getTime() - 2 * 60 * 60 * 1000); // 2 hours ago
      const futureDate = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000); // 3 days from now
      
      expect(getRelativeTime(pastDate)).toContain('ago');
      expect(getRelativeTime(futureDate)).toContain('in');
    });

    it('should handle very recent times', () => {
      const recentDate = new Date(now.getTime() - 30000); // 30 seconds ago
      expect(getRelativeTime(recentDate)).toBe('just now');
    });
  });

  describe('addTime', () => {
    it('should add time correctly', () => {
      const result = addTime(testDate, 2, 'hours');
      expect(result.getHours()).toBe(testDate.getHours() + 2);
    });

    it('should add days correctly', () => {
      const result = addTime(testDate, 5, 'days');
      expect(result.getDate()).toBe(testDate.getDate() + 5);
    });

    it('should add months correctly', () => {
      const result = addTime(testDate, 2, 'months');
      expect(result.getMonth()).toBe(testDate.getMonth() + 2);
    });

    it('should throw for invalid units', () => {
      expect(() => addTime(testDate, 1, 'invalid' as any)).toThrow('Invalid time unit');
    });
  });

  describe('subtractTime', () => {
    it('should subtract time correctly', () => {
      const result = subtractTime(testDate, 2, 'hours');
      expect(result.getHours()).toBe(testDate.getHours() - 2);
    });
  });

  describe('getTimeDifference', () => {
    it('should calculate time differences correctly', () => {
      const date1 = new Date('2023-06-15T12:00:00Z');
      const date2 = new Date('2023-06-15T14:00:00Z');
      
      expect(getTimeDifference(date1, date2, 'hours')).toBe(2);
      expect(getTimeDifference(date1, date2, 'minutes')).toBe(120);
    });

    it('should return absolute differences', () => {
      const date1 = new Date('2023-06-15T14:00:00Z');
      const date2 = new Date('2023-06-15T12:00:00Z');
      
      expect(getTimeDifference(date1, date2, 'hours')).toBe(2);
    });
  });

  describe('isToday', () => {
    it('should detect if date is today', () => {
      const today = new Date();
      const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
      
      expect(isToday(today)).toBe(true);
      expect(isToday(yesterday)).toBe(false);
    });
  });

  describe('isYesterday', () => {
    it('should detect if date is yesterday', () => {
      const today = new Date();
      const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
      
      expect(isYesterday(yesterday)).toBe(true);
      expect(isYesterday(today)).toBe(false);
    });
  });

  describe('isTomorrow', () => {
    it('should detect if date is tomorrow', () => {
      const today = new Date();
      const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
      
      expect(isTomorrow(tomorrow)).toBe(true);
      expect(isTomorrow(today)).toBe(false);
    });
  });

  describe('startOfDay', () => {
    it('should get start of day', () => {
      const result = startOfDay(testDate);
      expect(result.getHours()).toBe(0);
      expect(result.getMinutes()).toBe(0);
      expect(result.getSeconds()).toBe(0);
      expect(result.getMilliseconds()).toBe(0);
    });
  });

  describe('endOfDay', () => {
    it('should get end of day', () => {
      const result = endOfDay(testDate);
      expect(result.getHours()).toBe(23);
      expect(result.getMinutes()).toBe(59);
      expect(result.getSeconds()).toBe(59);
      expect(result.getMilliseconds()).toBe(999);
    });
  });

  describe('startOfWeek', () => {
    it('should get start of week (Monday)', () => {
      const result = startOfWeek(testDate);
      expect(result.getDay()).toBe(1); // Monday
      expect(result.getHours()).toBe(0);
    });
  });

  describe('endOfWeek', () => {
    it('should get end of week (Sunday)', () => {
      const result = endOfWeek(testDate);
      expect(result.getDay()).toBe(0); // Sunday
      expect(result.getHours()).toBe(23);
    });
  });

  describe('startOfMonth', () => {
    it('should get start of month', () => {
      const result = startOfMonth(testDate);
      expect(result.getDate()).toBe(1);
      expect(result.getHours()).toBe(0);
    });
  });

  describe('endOfMonth', () => {
    it('should get end of month', () => {
      const result = endOfMonth(testDate);
      expect(result.getDate()).toBe(30); // June has 30 days
      expect(result.getHours()).toBe(23);
    });
  });

  describe('isLeapYear', () => {
    it('should detect leap years correctly', () => {
      expect(isLeapYear(2020)).toBe(true);
      expect(isLeapYear(2021)).toBe(false);
      expect(isLeapYear(2000)).toBe(true);
      expect(isLeapYear(1900)).toBe(false);
    });
  });

  describe('getDaysInMonth', () => {
    it('should get correct number of days in month', () => {
      expect(getDaysInMonth(2023, 2)).toBe(28); // February 2023
      expect(getDaysInMonth(2020, 2)).toBe(29); // February 2020 (leap year)
      expect(getDaysInMonth(2023, 4)).toBe(30); // April
      expect(getDaysInMonth(2023, 1)).toBe(31); // January
    });
  });

  describe('isValidDate', () => {
    it('should validate dates correctly', () => {
      expect(isValidDate(new Date())).toBe(true);
      expect(isValidDate('2023-06-15')).toBe(true);
      expect(isValidDate('invalid')).toBe(false);
      expect(isValidDate(new Date('invalid'))).toBe(false);
    });
  });

  describe('toUnixTimestamp', () => {
    it('should convert to Unix timestamp', () => {
      const timestamp = toUnixTimestamp(testDate);
      expect(typeof timestamp).toBe('number');
      expect(timestamp).toBe(Math.floor(testDate.getTime() / 1000));
    });
  });

  describe('fromUnixTimestamp', () => {
    it('should convert from Unix timestamp', () => {
      const timestamp = 1686842645; // Example timestamp
      const result = fromUnixTimestamp(timestamp);
      expect(result).toBeInstanceOf(Date);
      expect(result.getTime()).toBe(timestamp * 1000);
    });
  });

  describe('getAge', () => {
    it('should calculate age correctly', () => {
      const birthDate = new Date('1990-06-15');
      const age = getAge(birthDate);
      expect(typeof age).toBe('number');
      expect(age).toBeGreaterThan(30);
    });

    it('should handle birthday this year', () => {
      const today = new Date();
      const thisYearBirthday = new Date(today.getFullYear(), 5, 15); // June 15 this year
      const lastYearBirthday = new Date(today.getFullYear() - 1, 5, 15); // June 15 last year
      
      const age1 = getAge(thisYearBirthday);
      const age2 = getAge(lastYearBirthday);
      
      expect(age2 - age1).toBe(1);
    });
  });
});