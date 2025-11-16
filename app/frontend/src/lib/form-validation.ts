/**
 * Comprehensive form validation utilities
 * Provides RFC 5322 compliant email validation, password strength checking,
 * currency validation, date range validation, phone number validation, and URL validation
 */

/**
 * Email validation using RFC 5322 simplified regex
 * Covers most common email formats while avoiding false negatives
 */
export const validateEmail = (email: string): { isValid: boolean; error?: string } => {
  const email_regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!email) {
    return { isValid: false, error: 'Email is required' };
  }

  if (email.length > 254) {
    return { isValid: false, error: 'Email is too long (max 254 characters)' };
  }

  if (!email_regex.test(email)) {
    return { isValid: false, error: 'Please enter a valid email address' };
  }

  const [localPart] = email.split('@');
  if (localPart.length > 64) {
    return { isValid: false, error: 'Email local part is too long (max 64 characters)' };
  }

  return { isValid: true };
};

/**
 * Password strength checker
 * Requires: minimum 8 characters, uppercase, lowercase, number, and special character
 */
export const validatePassword = (password: string): { isValid: boolean; error?: string; strength?: 'weak' | 'fair' | 'good' | 'strong' } => {
  if (!password) {
    return { isValid: false, error: 'Password is required', strength: 'weak' };
  }

  const errors: string[] = [];
  let strength: 'weak' | 'fair' | 'good' | 'strong' = 'weak';

  // Length check
  if (password.length < 8) {
    errors.push('Must be at least 8 characters');
  } else if (password.length < 12) {
    strength = 'fair';
  } else {
    strength = 'good';
  }

  // Uppercase check
  if (!/[A-Z]/.test(password)) {
    errors.push('Must contain uppercase letter');
  }

  // Lowercase check
  if (!/[a-z]/.test(password)) {
    errors.push('Must contain lowercase letter');
  }

  // Number check
  if (!/[0-9]/.test(password)) {
    errors.push('Must contain a number');
  }

  // Special character check
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Must contain a special character (!@#$%^&*)');
  }

  if (errors.length > 0) {
    return { isValid: false, error: errors.join(', '), strength };
  }

  // Increase strength if password is long and complex
  if (password.length > 16) {
    strength = 'strong';
  }

  return { isValid: true, strength };
};

/**
 * Currency amount validation
 * Validates positive numbers with up to 2 decimal places
 */
export const validateAmount = (amount: string | number): { isValid: boolean; error?: string } => {
  if (amount === '' || amount === null || amount === undefined) {
    return { isValid: false, error: 'Amount is required' };
  }

  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;

  if (isNaN(numAmount)) {
    return { isValid: false, error: 'Amount must be a valid number' };
  }

  if (numAmount <= 0) {
    return { isValid: false, error: 'Amount must be greater than 0' };
  }

  // Check for more than 2 decimal places
  if (!/^\d+(\.\d{1,2})?$/.test(numAmount.toString())) {
    return { isValid: false, error: 'Amount can have maximum 2 decimal places' };
  }

  if (numAmount > 999999999.99) {
    return { isValid: false, error: 'Amount exceeds maximum allowed value' };
  }

  return { isValid: true };
};

/**
 * Date range validation
 * Validates if a date is within a specified range
 */
export const validateDateRange = (
  date: string | Date,
  minDate?: string | Date,
  maxDate?: string | Date
): { isValid: boolean; error?: string } => {
  if (!date) {
    return { isValid: false, error: 'Date is required' };
  }

  const dateObj = typeof date === 'string' ? new Date(date) : date;

  if (isNaN(dateObj.getTime())) {
    return { isValid: false, error: 'Invalid date format' };
  }

  if (minDate) {
    const minDateObj = typeof minDate === 'string' ? new Date(minDate) : minDate;
    if (dateObj < minDateObj) {
      return { isValid: false, error: `Date cannot be before ${minDate}` };
    }
  }

  if (maxDate) {
    const maxDateObj = typeof maxDate === 'string' ? new Date(maxDate) : maxDate;
    if (dateObj > maxDateObj) {
      return { isValid: false, error: `Date cannot be after ${maxDate}` };
    }
  }

  return { isValid: true };
};

/**
 * Phone number validation
 * Supports international formats with country code or without
 */
export const validatePhoneNumber = (phone: string): { isValid: boolean; error?: string } => {
  if (!phone) {
    return { isValid: false, error: 'Phone number is required' };
  }

  // Remove common formatting characters
  const cleanedPhone = phone.replace(/[\s\-\(\)\.]/g, '');

  // Phone number regex: allows optional +, country code, and 7-15 digits
  const phoneRegex = /^\+?[1-9]\d{1,14}$/;

  if (!phoneRegex.test(cleanedPhone)) {
    return { isValid: false, error: 'Please enter a valid phone number' };
  }

  return { isValid: true };
};

/**
 * URL validation
 * Validates both HTTP and HTTPS URLs
 */
export const validateURL = (url: string): { isValid: boolean; error?: string } => {
  if (!url) {
    return { isValid: false, error: 'URL is required' };
  }

  try {
    // Try to construct a URL object - will throw if invalid
    const urlObj = new URL(url);

    // Check if protocol is http or https
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      return { isValid: false, error: 'URL must use HTTP or HTTPS protocol' };
    }

    return { isValid: true };
  } catch {
    return { isValid: false, error: 'Please enter a valid URL (e.g., https://example.com)' };
  }
};

/**
 * Name validation
 * Requires at least 2 characters, alphanumeric and common punctuation only
 */
export const validateName = (name: string): { isValid: boolean; error?: string } => {
  if (!name) {
    return { isValid: false, error: 'Name is required' };
  }

  if (name.length < 2) {
    return { isValid: false, error: 'Name must be at least 2 characters' };
  }

  if (name.length > 255) {
    return { isValid: false, error: 'Name is too long' };
  }

  // Allow letters, numbers, spaces, hyphens, apostrophes, and periods
  if (!/^[a-zA-Z0-9\s\-'.]+$/.test(name)) {
    return { isValid: false, error: 'Name contains invalid characters' };
  }

  return { isValid: true };
};

/**
 * Required field validation
 */
export const validateRequired = (value: string | number | undefined): { isValid: boolean; error?: string } => {
  if (value === undefined || value === null || value === '') {
    return { isValid: false, error: 'This field is required' };
  }

  if (typeof value === 'string' && value.trim() === '') {
    return { isValid: false, error: 'This field is required' };
  }

  return { isValid: true };
};

/**
 * Minimum length validation
 */
export const validateMinLength = (value: string, minLength: number): { isValid: boolean; error?: string } => {
  if (value.length < minLength) {
    return { isValid: false, error: `Must be at least ${minLength} characters` };
  }

  return { isValid: true };
};

/**
 * Maximum length validation
 */
export const validateMaxLength = (value: string, maxLength: number): { isValid: boolean; error?: string } => {
  if (value.length > maxLength) {
    return { isValid: false, error: `Cannot exceed ${maxLength} characters` };
  }

  return { isValid: true };
};

/**
 * Numeric validation
 */
export const validateNumeric = (value: string | number): { isValid: boolean; error?: string } => {
  if (!value && value !== 0) {
    return { isValid: false, error: 'Value is required' };
  }

  const numValue = typeof value === 'string' ? parseFloat(value) : value;

  if (isNaN(numValue)) {
    return { isValid: false, error: 'Must be a valid number' };
  }

  return { isValid: true };
};

/**
 * Positive number validation
 */
export const validatePositiveNumber = (value: string | number): { isValid: boolean; error?: string } => {
  const numValidation = validateNumeric(value);
  if (!numValidation.isValid) {
    return numValidation;
  }

  const numValue = typeof value === 'string' ? parseFloat(value) : value;

  if (numValue <= 0) {
    return { isValid: false, error: 'Must be a positive number' };
  }

  return { isValid: true };
};

/**
 * Match fields validation (e.g., password confirmation)
 */
export const validateFieldMatch = (value1: string, value2: string, fieldName: string = 'fields'): { isValid: boolean; error?: string } => {
  if (value1 !== value2) {
    return { isValid: false, error: `${fieldName} do not match` };
  }

  return { isValid: true };
};

/**
 * Compound validation helper
 * Runs multiple validators and returns the first error found
 */
export const validateCompound = (
  validators: Array<{ isValid: boolean; error?: string }>
): { isValid: boolean; error?: string } => {
  for (const validation of validators) {
    if (!validation.isValid) {
      return validation;
    }
  }
  return { isValid: true };
};
