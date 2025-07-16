/**
 * String utilities tests
 */

import {
  capitalize,
  toCamelCase,
  toKebabCase,
  toSnakeCase,
  toPascalCase,
  truncate,
  normalizeWhitespace,
  isEmpty,
  isNotEmpty,
  sanitizeHtml,
  escapeHtml,
  slugify,
  padLeft,
  padRight,
  removePrefix,
  removeSuffix,
  wordCount,
  reverse,
  isAlphanumeric,
  isAlpha,
  isNumeric,
  randomString,
  maskString,
  getInitials
} from '../string';

describe('String Utilities', () => {
  describe('capitalize', () => {
    it('should capitalize the first letter', () => {
      expect(capitalize('hello')).toBe('Hello');
      expect(capitalize('HELLO')).toBe('Hello');
      expect(capitalize('hello world')).toBe('Hello world');
    });

    it('should handle empty strings', () => {
      expect(capitalize('')).toBe('');
    });

    it('should handle single characters', () => {
      expect(capitalize('a')).toBe('A');
      expect(capitalize('A')).toBe('A');
    });
  });

  describe('toCamelCase', () => {
    it('should convert to camelCase', () => {
      expect(toCamelCase('hello world')).toBe('helloWorld');
      expect(toCamelCase('Hello World')).toBe('helloWorld');
      expect(toCamelCase('hello-world')).toBe('helloWorld');
      expect(toCamelCase('hello_world')).toBe('helloWorld');
    });

    it('should handle single words', () => {
      expect(toCamelCase('hello')).toBe('hello');
      expect(toCamelCase('HELLO')).toBe('hello');
    });
  });

  describe('toKebabCase', () => {
    it('should convert to kebab-case', () => {
      expect(toKebabCase('helloWorld')).toBe('hello-world');
      expect(toKebabCase('HelloWorld')).toBe('hello-world');
      expect(toKebabCase('hello world')).toBe('hello-world');
      expect(toKebabCase('hello_world')).toBe('hello-world');
    });
  });

  describe('toSnakeCase', () => {
    it('should convert to snake_case', () => {
      expect(toSnakeCase('helloWorld')).toBe('hello_world');
      expect(toSnakeCase('HelloWorld')).toBe('hello_world');
      expect(toSnakeCase('hello world')).toBe('hello_world');
      expect(toSnakeCase('hello-world')).toBe('hello_world');
    });
  });

  describe('toPascalCase', () => {
    it('should convert to PascalCase', () => {
      expect(toPascalCase('hello world')).toBe('HelloWorld');
      expect(toPascalCase('hello-world')).toBe('HelloWorld');
      expect(toPascalCase('hello_world')).toBe('HelloWorld');
    });
  });

  describe('truncate', () => {
    it('should truncate long strings', () => {
      expect(truncate('hello world', 5)).toBe('he...');
      expect(truncate('hello world', 8, '...')).toBe('hello...');
    });

    it('should not truncate short strings', () => {
      expect(truncate('hello', 10)).toBe('hello');
    });

    it('should handle custom suffix', () => {
      expect(truncate('hello world', 8, '---')).toBe('hello---');
    });
  });

  describe('normalizeWhitespace', () => {
    it('should normalize whitespace', () => {
      expect(normalizeWhitespace('  hello   world  ')).toBe('hello world');
      expect(normalizeWhitespace('hello\n\tworld')).toBe('hello world');
    });
  });

  describe('isEmpty', () => {
    it('should detect empty strings', () => {
      expect(isEmpty('')).toBe(true);
      expect(isEmpty('   ')).toBe(true);
      expect(isEmpty(null)).toBe(true);
      expect(isEmpty(undefined)).toBe(true);
    });

    it('should detect non-empty strings', () => {
      expect(isEmpty('hello')).toBe(false);
      expect(isEmpty(' hello ')).toBe(false);
    });
  });

  describe('isNotEmpty', () => {
    it('should be opposite of isEmpty', () => {
      expect(isNotEmpty('hello')).toBe(true);
      expect(isNotEmpty('')).toBe(false);
      expect(isNotEmpty('   ')).toBe(false);
    });
  });

  describe('sanitizeHtml', () => {
    it('should remove HTML tags', () => {
      expect(sanitizeHtml('<p>hello</p>')).toBe('hello');
      expect(sanitizeHtml('<div><span>hello world</span></div>')).toBe('hello world');
    });

    it('should decode HTML entities', () => {
      expect(sanitizeHtml('&lt;hello&gt;')).toBe('<hello>');
      expect(sanitizeHtml('&amp;')).toBe('&');
    });
  });

  describe('escapeHtml', () => {
    it('should escape HTML characters', () => {
      expect(escapeHtml('<hello>')).toBe('&lt;hello&gt;');
      expect(escapeHtml('&')).toBe('&amp;');
      expect(escapeHtml('"hello"')).toBe('&quot;hello&quot;');
    });
  });

  describe('slugify', () => {
    it('should create URL-friendly slugs', () => {
      expect(slugify('Hello World')).toBe('hello-world');
      expect(slugify('Hello, World!')).toBe('hello-world');
      expect(slugify('  Hello   World  ')).toBe('hello-world');
    });

    it('should handle special characters', () => {
      expect(slugify('café & restaurant')).toBe('caf-restaurant');
    });
  });

  describe('padLeft', () => {
    it('should pad strings to the left', () => {
      expect(padLeft('hello', 10)).toBe('     hello');
      expect(padLeft('hello', 10, '0')).toBe('00000hello');
    });

    it('should not pad if string is already long enough', () => {
      expect(padLeft('hello', 3)).toBe('hello');
    });
  });

  describe('padRight', () => {
    it('should pad strings to the right', () => {
      expect(padRight('hello', 10)).toBe('hello     ');
      expect(padRight('hello', 10, '0')).toBe('hello00000');
    });
  });

  describe('removePrefix', () => {
    it('should remove prefix if present', () => {
      expect(removePrefix('hello world', 'hello ')).toBe('world');
      expect(removePrefix('hello world', 'hi ')).toBe('hello world');
    });
  });

  describe('removeSuffix', () => {
    it('should remove suffix if present', () => {
      expect(removeSuffix('hello world', ' world')).toBe('hello');
      expect(removeSuffix('hello world', ' universe')).toBe('hello world');
    });
  });

  describe('wordCount', () => {
    it('should count words correctly', () => {
      expect(wordCount('hello world')).toBe(2);
      expect(wordCount('  hello   world  ')).toBe(2);
      expect(wordCount('')).toBe(0);
      expect(wordCount('hello')).toBe(1);
    });
  });

  describe('reverse', () => {
    it('should reverse strings', () => {
      expect(reverse('hello')).toBe('olleh');
      expect(reverse('abc')).toBe('cba');
      expect(reverse('')).toBe('');
    });
  });

  describe('isAlphanumeric', () => {
    it('should detect alphanumeric strings', () => {
      expect(isAlphanumeric('hello123')).toBe(true);
      expect(isAlphanumeric('HELLO123')).toBe(true);
      expect(isAlphanumeric('hello-123')).toBe(false);
      expect(isAlphanumeric('hello 123')).toBe(false);
    });
  });

  describe('isAlpha', () => {
    it('should detect alphabetic strings', () => {
      expect(isAlpha('hello')).toBe(true);
      expect(isAlpha('HELLO')).toBe(true);
      expect(isAlpha('hello123')).toBe(false);
      expect(isAlpha('hello-')).toBe(false);
    });
  });

  describe('isNumeric', () => {
    it('should detect numeric strings', () => {
      expect(isNumeric('123')).toBe(true);
      expect(isNumeric('123.45')).toBe(false); // Only integers
      expect(isNumeric('123abc')).toBe(false);
    });
  });

  describe('randomString', () => {
    it('should generate random strings of correct length', () => {
      const str1 = randomString(10);
      const str2 = randomString(10);
      
      expect(str1).toHaveLength(10);
      expect(str2).toHaveLength(10);
      expect(str1).not.toBe(str2); // Should be different
    });

    it('should use custom character set', () => {
      const str = randomString(10, 'abc');
      expect(str).toHaveLength(10);
      expect(/^[abc]+$/.test(str)).toBe(true);
    });
  });

  describe('maskString', () => {
    it('should mask strings correctly', () => {
      expect(maskString('hello world', 2, 2)).toBe('he*******ld');
      expect(maskString('hello world', 3, 3)).toBe('hel*****rld');
    });

    it('should handle short strings', () => {
      expect(maskString('hi', 2, 2)).toBe('**');
      expect(maskString('hello', 10, 10)).toBe('*****');
    });

    it('should use custom mask character', () => {
      expect(maskString('hello world', 2, 2, 'X')).toBe('heXXXXXXXld');
    });
  });

  describe('getInitials', () => {
    it('should extract initials from names', () => {
      expect(getInitials('John Doe')).toBe('JD');
      expect(getInitials('John Michael Doe')).toBe('JM');
      expect(getInitials('John Michael Doe Smith', 3)).toBe('JMD');
    });

    it('should handle single names', () => {
      expect(getInitials('John')).toBe('J');
    });

    it('should handle extra spaces', () => {
      expect(getInitials('  John   Doe  ')).toBe('JD');
    });
  });
});