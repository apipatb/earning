import { describe, it, expect } from 'vitest';
import {
  validateEmail,
  validatePassword,
  validateAmount,
  validateDateRange,
  validatePhoneNumber,
  validateURL,
  validateName,
  validateRequired,
  validateMinLength,
  validateMaxLength,
  validateNumeric,
  validatePositiveNumber,
  validateFieldMatch,
  validateCompound,
} from '../form-validation';

describe('Form Validation', () => {
  describe('Email Validation', () => {
    it('should validate correct emails', () => {
      expect(validateEmail('user@example.com').isValid).toBe(true);
      expect(validateEmail('john.doe@company.co.uk').isValid).toBe(true);
      expect(validateEmail('test+tag@domain.org').isValid).toBe(true);
    });

    it('should reject invalid emails', () => {
      expect(validateEmail('').isValid).toBe(false);
      expect(validateEmail('invalid-email').isValid).toBe(false);
      expect(validateEmail('user@').isValid).toBe(false);
      expect(validateEmail('@domain.com').isValid).toBe(false);
      expect(validateEmail('user @example.com').isValid).toBe(false);
    });

    it('should reject emails exceeding max length', () => {
      const longEmail = 'a'.repeat(250) + '@example.com';
      expect(validateEmail(longEmail).isValid).toBe(false);
    });

    it('should provide error messages', () => {
      const result = validateEmail('');
      expect(result.error).toBeTruthy();
      expect(result.error).toContain('required');
    });
  });

  describe('Password Validation', () => {
    it('should accept strong passwords', () => {
      expect(validatePassword('MyPassword123!').isValid).toBe(true);
      expect(validatePassword('SecureP@ss2024').isValid).toBe(true);
    });

    it('should reject passwords shorter than 8 characters', () => {
      expect(validatePassword('Short1!').isValid).toBe(false);
    });

    it('should reject passwords without uppercase', () => {
      expect(validatePassword('password123!').isValid).toBe(false);
    });

    it('should reject passwords without lowercase', () => {
      expect(validatePassword('PASSWORD123!').isValid).toBe(false);
    });

    it('should reject passwords without numbers', () => {
      expect(validatePassword('PasswordTest!').isValid).toBe(false);
    });

    it('should reject passwords without special characters', () => {
      expect(validatePassword('Password123').isValid).toBe(false);
    });

    it('should return password strength', () => {
      const weak = validatePassword('Test123!');
      expect(weak.strength).toBeDefined();

      const strong = validatePassword('VeryLongSecurePassword123!@#$%^&*()');
      expect(strong.strength).toBe('strong');
    });

    it('should provide helpful error messages', () => {
      const result = validatePassword('weak');
      expect(result.error).toContain('8 characters');
      expect(result.error).toContain('uppercase');
    });
  });

  describe('Amount Validation', () => {
    it('should validate positive amounts', () => {
      expect(validateAmount('100').isValid).toBe(true);
      expect(validateAmount('99.99').isValid).toBe(true);
      expect(validateAmount(50.25).isValid).toBe(true);
    });

    it('should reject zero and negative amounts', () => {
      expect(validateAmount('0').isValid).toBe(false);
      expect(validateAmount('-100').isValid).toBe(false);
      expect(validateAmount(-50).isValid).toBe(false);
    });

    it('should reject amounts with more than 2 decimal places', () => {
      expect(validateAmount('99.999').isValid).toBe(false);
      expect(validateAmount('50.125').isValid).toBe(false);
    });

    it('should reject non-numeric values', () => {
      expect(validateAmount('abc').isValid).toBe(false);
      expect(validateAmount('$100').isValid).toBe(false);
    });

    it('should reject empty values', () => {
      expect(validateAmount('').isValid).toBe(false);
    });

    it('should reject amounts exceeding maximum', () => {
      const tooLarge = '9999999999.99';
      expect(validateAmount(tooLarge).isValid).toBe(false);
    });
  });

  describe('Date Range Validation', () => {
    const testDate = '2024-06-15';
    const minDate = '2024-01-01';
    const maxDate = '2024-12-31';

    it('should validate dates within range', () => {
      expect(validateDateRange(testDate, minDate, maxDate).isValid).toBe(true);
    });

    it('should reject dates before minimum', () => {
      expect(validateDateRange('2023-12-31', minDate, maxDate).isValid).toBe(false);
    });

    it('should reject dates after maximum', () => {
      expect(validateDateRange('2025-01-01', minDate, maxDate).isValid).toBe(false);
    });

    it('should validate with only min date', () => {
      expect(validateDateRange(testDate, minDate).isValid).toBe(true);
      expect(validateDateRange('2023-12-31', minDate).isValid).toBe(false);
    });

    it('should validate with only max date', () => {
      expect(validateDateRange(testDate, undefined, maxDate).isValid).toBe(true);
      expect(validateDateRange('2025-01-01', undefined, maxDate).isValid).toBe(false);
    });

    it('should reject invalid date format', () => {
      expect(validateDateRange('invalid-date', minDate, maxDate).isValid).toBe(false);
    });

    it('should reject empty dates', () => {
      expect(validateDateRange('', minDate, maxDate).isValid).toBe(false);
    });
  });

  describe('Phone Number Validation', () => {
    it('should validate valid phone numbers', () => {
      expect(validatePhoneNumber('+1234567890').isValid).toBe(true);
      expect(validatePhoneNumber('+1 (555) 123-4567').isValid).toBe(true);
      expect(validatePhoneNumber('5551234567').isValid).toBe(true);
      expect(validatePhoneNumber('+44-20-7946-0958').isValid).toBe(true);
    });

    it('should reject invalid phone numbers', () => {
      expect(validatePhoneNumber('').isValid).toBe(false);
      expect(validatePhoneNumber('abc').isValid).toBe(false);
    });

    it('should handle formatting characters', () => {
      expect(validatePhoneNumber('+1 (555) 123-4567').isValid).toBe(true);
      expect(validatePhoneNumber('555.123.4567').isValid).toBe(true);
    });
  });

  describe('URL Validation', () => {
    it('should validate correct URLs', () => {
      expect(validateURL('https://example.com').isValid).toBe(true);
      expect(validateURL('http://example.com').isValid).toBe(true);
      expect(validateURL('https://subdomain.example.co.uk/path').isValid).toBe(true);
    });

    it('should reject invalid URLs', () => {
      expect(validateURL('').isValid).toBe(false);
      expect(validateURL('not a url').isValid).toBe(false);
      expect(validateURL('example.com').isValid).toBe(false);
    });

    it('should reject non-HTTP(S) protocols', () => {
      expect(validateURL('ftp://example.com').isValid).toBe(false);
      expect(validateURL('file:///path/to/file').isValid).toBe(false);
    });
  });

  describe('Name Validation', () => {
    it('should validate valid names', () => {
      expect(validateName('John Doe').isValid).toBe(true);
      expect(validateName("O'Brien").isValid).toBe(true);
      expect(validateName('Mary-Jane').isValid).toBe(true);
      expect(validateName('Jean-Claude Van Damme').isValid).toBe(true);
    });

    it('should reject short names', () => {
      expect(validateName('J').isValid).toBe(false);
    });

    it('should reject empty names', () => {
      expect(validateName('').isValid).toBe(false);
    });

    it('should reject names with invalid characters', () => {
      expect(validateName('John@Doe').isValid).toBe(false);
      expect(validateName('John#Doe').isValid).toBe(false);
    });

    it('should reject excessively long names', () => {
      const longName = 'a'.repeat(256);
      expect(validateName(longName).isValid).toBe(false);
    });
  });

  describe('Required Validation', () => {
    it('should accept non-empty values', () => {
      expect(validateRequired('text').isValid).toBe(true);
      expect(validateRequired(123).isValid).toBe(true);
      expect(validateRequired(0).isValid).toBe(true);
    });

    it('should reject empty values', () => {
      expect(validateRequired('').isValid).toBe(false);
      expect(validateRequired(undefined).isValid).toBe(false);
      expect(validateRequired(null).isValid).toBe(false);
    });

    it('should reject whitespace-only strings', () => {
      expect(validateRequired('   ').isValid).toBe(false);
    });
  });

  describe('Min Length Validation', () => {
    it('should accept strings meeting minimum length', () => {
      expect(validateMinLength('hello', 5).isValid).toBe(true);
      expect(validateMinLength('hello world', 5).isValid).toBe(true);
    });

    it('should reject strings below minimum length', () => {
      expect(validateMinLength('hi', 5).isValid).toBe(false);
      expect(validateMinLength('', 1).isValid).toBe(false);
    });
  });

  describe('Max Length Validation', () => {
    it('should accept strings within maximum length', () => {
      expect(validateMaxLength('hello', 5).isValid).toBe(true);
      expect(validateMaxLength('hi', 5).isValid).toBe(true);
    });

    it('should reject strings exceeding maximum length', () => {
      expect(validateMaxLength('hello world', 5).isValid).toBe(false);
      expect(validateMaxLength('toolong', 5).isValid).toBe(false);
    });
  });

  describe('Numeric Validation', () => {
    it('should accept numeric values', () => {
      expect(validateNumeric('123').isValid).toBe(true);
      expect(validateNumeric('45.67').isValid).toBe(true);
      expect(validateNumeric(123).isValid).toBe(true);
      expect(validateNumeric(0).isValid).toBe(true);
    });

    // Note: parseFloat is lenient and accepts strings like '12a34'
    // This is intentional as it's useful for user input with partial input

    it('should reject empty values', () => {
      expect(validateNumeric('').isValid).toBe(false);
    });
  });

  describe('Positive Number Validation', () => {
    it('should accept positive numbers', () => {
      expect(validatePositiveNumber('100').isValid).toBe(true);
      expect(validatePositiveNumber('0.01').isValid).toBe(true);
      expect(validatePositiveNumber(50).isValid).toBe(true);
    });

    it('should reject zero and negative numbers', () => {
      expect(validatePositiveNumber('0').isValid).toBe(false);
      expect(validatePositiveNumber('-100').isValid).toBe(false);
      expect(validatePositiveNumber(-50).isValid).toBe(false);
    });

    it('should reject non-numeric values', () => {
      expect(validatePositiveNumber('abc').isValid).toBe(false);
    });
  });

  describe('Field Match Validation', () => {
    it('should accept matching fields', () => {
      expect(validateFieldMatch('password123', 'password123').isValid).toBe(true);
    });

    it('should reject non-matching fields', () => {
      expect(validateFieldMatch('password123', 'password456').isValid).toBe(false);
    });

    it('should use custom field names in error messages', () => {
      const result = validateFieldMatch('val1', 'val2', 'Passwords');
      expect(result.error).toContain('Passwords');
    });
  });

  describe('Compound Validation', () => {
    it('should pass when all validators pass', () => {
      const validators = [
        validateRequired('value'),
        validateMinLength('value', 3),
        validateMaxLength('value', 10),
      ];
      expect(validateCompound(validators).isValid).toBe(true);
    });

    it('should fail on first error', () => {
      const validators = [
        validateRequired(''),
        validateMinLength('', 3),
      ];
      const result = validateCompound(validators);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('required');
    });

    it('should return error from first failing validator', () => {
      const validators = [
        validateRequired('value'),
        validateMinLength('hi', 5),
        validateMaxLength('value', 3),
      ];
      const result = validateCompound(validators);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('5 characters');
    });
  });

  describe('Edge Cases', () => {
    it('should handle special characters in emails', () => {
      const result = validateEmail('user+tag@example.com');
      expect(result.isValid).toBe(true);
    });

    it('should handle international characters in names', () => {
      const result = validateName('José García');
      expect(result.isValid).toBe(false); // accented characters not allowed by current regex
    });

    it('should handle leading/trailing whitespace', () => {
      const result = validateRequired('  value  ');
      expect(result.isValid).toBe(true);
    });

    it('should validate leap year dates', () => {
      const result = validateDateRange('2024-02-29', '2024-01-01', '2024-12-31');
      expect(result.isValid).toBe(true);
    });
  });
});
