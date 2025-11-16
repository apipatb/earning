# Frontend Form Validation Guide

Comprehensive guide for implementing form validation and error handling in the EarnTrack frontend application.

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Validation Helpers](#validation-helpers)
4. [useFormValidation Hook](#useformvalidation-hook)
5. [FormError Components](#formerror-components)
6. [Usage Examples](#usage-examples)
7. [Best Practices](#best-practices)
8. [Testing](#testing)

## Overview

The form validation system provides:

- **Reusable validation functions** for common field types (email, password, phone, etc.)
- **Custom React hook** (`useFormValidation`) for managing form state and validation
- **Pre-styled components** for error display and form inputs
- **Real-time and on-submit validation** strategies
- **Type-safe validation** with TypeScript support
- **Comprehensive test coverage** with 40+ test cases

## Architecture

### Three-Layer Structure

1. **Validation Layer** (`src/lib/form-validation.ts`)
   - Pure JavaScript validation functions
   - No React dependencies
   - Reusable across frontend and backend

2. **Hook Layer** (`src/hooks/useFormValidation.ts`)
   - React hook for form state management
   - Integrates validation functions
   - Manages form lifecycle

3. **Component Layer** (`src/components/FormError.tsx`)
   - Reusable form components
   - Error display components
   - Pre-styled input fields

## Validation Helpers

### Email Validation

```typescript
import { validateEmail } from '../lib/form-validation';

const result = validateEmail('user@example.com');
if (result.isValid) {
  // Valid email
} else {
  console.log(result.error); // Error message
}
```

**Rules:**
- RFC 5322 compliant format
- Maximum 254 characters
- Local part (before @) max 64 characters

### Password Validation

```typescript
import { validatePassword } from '../lib/form-validation';

const result = validatePassword('MyPassword123!');
// Returns: { isValid: true, strength: 'strong' }
```

**Requirements:**
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character: `!@#$%^&*()_+-=[]{}';:"\|,.<>/?`

**Strength Levels:**
- `weak`: Does not meet requirements
- `fair`: 8-11 characters, meets all requirements
- `good`: 12-15 characters, meets all requirements
- `strong`: 16+ characters, meets all requirements

### Amount Validation

```typescript
import { validateAmount } from '../lib/form-validation';

const result = validateAmount('99.99');
// Returns: { isValid: true }
```

**Rules:**
- Must be greater than 0
- Maximum 2 decimal places
- Maximum value: 999,999,999.99
- Accepts both string and number types

### Date Range Validation

```typescript
import { validateDateRange } from '../lib/form-validation';

const result = validateDateRange(
  '2024-06-15',
  '2024-01-01', // minDate (optional)
  '2024-12-31'  // maxDate (optional)
);
// Returns: { isValid: true }
```

**Features:**
- Validates date format
- Checks minimum date boundary
- Checks maximum date boundary
- Accepts Date objects or ISO strings

### Phone Number Validation

```typescript
import { validatePhoneNumber } from '../lib/form-validation';

const result = validatePhoneNumber('+1 (555) 123-4567');
// Returns: { isValid: true }
```

**Features:**
- Supports international formats
- Handles common formatting (parentheses, hyphens, spaces, dots)
- Validates 7-15 digit numbers

### URL Validation

```typescript
import { validateURL } from '../lib/form-validation';

const result = validateURL('https://example.com');
// Returns: { isValid: true }
```

**Rules:**
- Must be a valid URL
- Must use HTTP or HTTPS protocol
- Validates using native URL constructor

### Name Validation

```typescript
import { validateName } from '../lib/form-validation';

const result = validateName('John Doe');
// Returns: { isValid: true }
```

**Rules:**
- Minimum 2 characters
- Maximum 255 characters
- Allows: letters, numbers, spaces, hyphens, apostrophes, periods
- Examples: "John Doe", "O'Brien", "Mary-Jane Smith"

### Required Field Validation

```typescript
import { validateRequired } from '../lib/form-validation';

const result = validateRequired('value');
// Returns: { isValid: true }
```

### Other Utility Validators

```typescript
// Min/Max Length
validateMinLength('password', 8);
validateMaxLength('username', 20);

// Numeric Values
validateNumeric('123.45');
validatePositiveNumber('99.99');

// Field Matching (for password confirmation)
validateFieldMatch('password', 'confirmPassword', 'Passwords');

// Compound Validation
validateCompound([
  validateRequired('value'),
  validateMinLength('value', 3),
  validateMaxLength('value', 50)
]);
```

## useFormValidation Hook

### Basic Usage

```typescript
import { useFormValidation } from '../hooks/useFormValidation';
import { validateEmail, validatePassword } from '../lib/form-validation';

function LoginForm() {
  const { values, errors, touched, handleChange, handleBlur, handleSubmit, isValid } =
    useFormValidation(
      { email: '', password: '' },
      {
        validators: {
          email: validateEmail,
          password: validatePassword,
        },
        validateOnBlur: true,
        validateOnChange: false,
        validateOnSubmit: true,
      }
    );

  const onSubmit = async (formValues) => {
    // Handle form submission
    console.log(formValues);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input
        name="email"
        value={values.email}
        onChange={handleChange}
        onBlur={handleBlur}
      />
      {errors.email && <span>{errors.email.message}</span>}

      <input
        name="password"
        type="password"
        value={values.password}
        onChange={handleChange}
        onBlur={handleBlur}
      />
      {errors.password && <span>{errors.password.message}</span>}

      <button type="submit" disabled={!isValid}>
        Sign In
      </button>
    </form>
  );
}
```

### Hook API

#### Returned Values

```typescript
{
  // State
  values: Record<string, any>;           // Current form values
  errors: Record<string, FieldError | undefined>;  // Validation errors
  touched: Record<string, boolean>;      // Fields that have been touched
  isValid: boolean;                      // Whether form is valid
  isSubmitting: boolean;                 // Whether form is submitting
  isDirty: boolean;                      // Whether form has changes

  // Handlers
  handleChange: (event) => void;         // Field change handler
  handleBlur: (event) => void;           // Field blur handler
  handleSubmit: (callback) => (event) => Promise<void>;  // Form submission
  resetForm: () => void;                 // Reset to initial values

  // Field Utilities
  setFieldValue: (name, value) => void;  // Set field value programmatically
  setFieldError: (name, error) => void;  // Set field error manually
  setFieldTouched: (name, touched) => void;  // Mark field as touched
  getFieldProps: (name) => object;       // Get field props (for spreading)
  getFieldMeta: (name) => object;        // Get field metadata
  validateField: (name, value) => error | undefined;  // Validate single field
  validateAllFields: () => errors;       // Validate all fields
}
```

#### Configuration Options

```typescript
interface UseFormValidationOptions {
  validators?: Record<string, ValidatorFunction | ValidatorFunction[]>;
  validateOnChange?: boolean;     // Validate on input change (default: false)
  validateOnBlur?: boolean;       // Validate on blur (default: true)
  validateOnSubmit?: boolean;     // Validate on submit (default: true)
  initialErrors?: Record<string, string>;
}
```

### Advanced Usage

#### Multiple Validators Per Field

```typescript
const { handleSubmit } = useFormValidation(
  { password: '', confirmPassword: '' },
  {
    validators: {
      password: [validatePassword, validateMinLength],
      confirmPassword: (fieldName, value) => {
        // Custom validator
        if (value !== formValues.password) {
          return { isValid: false, error: 'Passwords do not match' };
        }
        return { isValid: true };
      },
    },
  }
);
```

#### Conditional Validation

```typescript
const { values, errors, touched, handleChange, handleBlur } = useFormValidation(
  { type: 'individual', companyName: '' },
  {
    validators: {
      companyName: (fieldName, value) => {
        // Only required if type is 'company'
        if (values.type === 'company' && !value) {
          return { isValid: false, error: 'Company name required' };
        }
        return { isValid: true };
      },
    },
  }
);
```

#### Form Reset and Edit Mode

```typescript
const { resetForm, setFieldValue } = useFormValidation(initialData);

// Reset to initial values
function handleCancel() {
  resetForm();
}

// Populate form for editing
function handleEdit(item) {
  setFieldValue('name', item.name);
  setFieldValue('email', item.email);
  // ... set other fields
}
```

## FormError Components

### FormError Component

Display individual field errors with animations:

```typescript
import FormError from '../components/FormError';

<FormError
  message={errors.email?.message}
  touched={touched.email}
  mode="block"  // 'block' or 'inline'
  showIcon={true}
  animationStyle="slide"  // 'slide', 'fade', or 'none'
/>
```

### FormErrorBlock Component

Display general form-level errors:

```typescript
import { FormErrorBlock } from '../components/FormError';

<FormErrorBlock
  message={serverError}
  className="mb-4"
/>
```

### FormInput Component

Pre-styled input with integrated validation:

```typescript
import { FormInput } from '../components/FormError';

<FormInput
  label="Email"
  name="email"
  type="email"
  placeholder="user@example.com"
  value={values.email}
  onChange={handleChange}
  onBlur={handleBlur}
  error={errors.email?.message}
  touched={touched.email}
  required
  helperText="We'll never share your email"
/>
```

### FormTextarea Component

Multi-line text input with validation:

```typescript
import { FormTextarea } from '../components/FormError';

<FormTextarea
  label="Notes"
  name="notes"
  placeholder="Add notes..."
  value={values.notes}
  onChange={handleChange}
  onBlur={handleBlur}
  error={errors.notes?.message}
  touched={touched.notes}
  rows={4}
  helperText="(Optional)"
/>
```

### FormSelect Component

Dropdown select with validation:

```typescript
import { FormSelect } from '../components/FormError';

<FormSelect
  label="Platform"
  name="platformId"
  value={values.platformId}
  onChange={handleChange}
  onBlur={handleBlur}
  error={errors.platformId?.message}
  touched={touched.platformId}
  placeholder="Choose a platform"
  options={platforms.map(p => ({ value: p.id, label: p.name }))}
  required
/>
```

## Usage Examples

### Login Form

```typescript
import { useFormValidation } from '../hooks/useFormValidation';
import { validateEmail, validateRequired } from '../lib/form-validation';
import { FormErrorBlock, FormInput } from '../components/FormError';

export default function Login() {
  const [serverError, setServerError] = useState('');

  const { values, errors, touched, handleChange, handleBlur, handleSubmit, isValid } =
    useFormValidation(
      { email: '', password: '' },
      {
        validators: {
          email: (name, value) => {
            const required = validateRequired(value);
            if (!required.isValid) return required;
            return validateEmail(value);
          },
          password: validateRequired,
        },
        validateOnBlur: true,
      }
    );

  const onSubmit = async (formValues) => {
    try {
      const response = await loginAPI(formValues);
      // Handle success
    } catch (error) {
      setServerError(error.message);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      {serverError && <FormErrorBlock message={serverError} />}

      <FormInput
        label="Email"
        name="email"
        type="email"
        value={values.email}
        onChange={handleChange}
        onBlur={handleBlur}
        error={errors.email?.message}
        touched={touched.email}
        required
      />

      <FormInput
        label="Password"
        name="password"
        type="password"
        value={values.password}
        onChange={handleChange}
        onBlur={handleBlur}
        error={errors.password?.message}
        touched={touched.password}
        required
      />

      <button type="submit" disabled={!isValid}>
        Sign In
      </button>
    </form>
  );
}
```

### Registration Form with Password Strength

```typescript
import { validatePassword, validateEmail } from '../lib/form-validation';
import { Check } from 'lucide-react';

export default function Register() {
  const { values, errors, touched, handleChange, handleBlur, handleSubmit } =
    useFormValidation(
      { email: '', password: '' },
      {
        validators: {
          email: validateEmail,
          password: validatePassword,
        },
        validateOnBlur: true,
      }
    );

  const passwordValidation = validatePassword(values.password);

  return (
    <form onSubmit={handleSubmit(onFormSubmit)}>
      <FormInput
        label="Email"
        name="email"
        type="email"
        value={values.email}
        onChange={handleChange}
        onBlur={handleBlur}
        error={errors.email?.message}
        touched={touched.email}
      />

      <FormInput
        label="Password"
        name="password"
        type="password"
        value={values.password}
        onChange={handleChange}
        onBlur={handleBlur}
        error={errors.password?.message}
        touched={touched.password}
      />

      {values.password && (
        <PasswordStrengthIndicator strength={passwordValidation.strength} />
      )}

      <button type="submit">Register</button>
    </form>
  );
}

function PasswordStrengthIndicator({ strength }) {
  const requirements = [
    { text: 'At least 8 characters', met: values.password.length >= 8 },
    { text: 'Contains uppercase', met: /[A-Z]/.test(values.password) },
    { text: 'Contains lowercase', met: /[a-z]/.test(values.password) },
    { text: 'Contains number', met: /[0-9]/.test(values.password) },
    { text: 'Contains special character', met: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(values.password) },
  ];

  return (
    <div>
      {requirements.map((req) => (
        <div key={req.text} className={req.met ? 'text-green-600' : 'text-gray-400'}>
          <Check size={16} />
          {req.text}
        </div>
      ))}
    </div>
  );
}
```

### Earnings Form

```typescript
export default function EarningsForm() {
  const { values, errors, touched, handleChange, handleBlur, handleSubmit } =
    useFormValidation(
      { platformId: '', date: today(), amount: '', hours: '' },
      {
        validators: {
          platformId: validateRequired,
          date: validateDateRange,
          amount: validateAmount,
          hours: (name, value) => !value ? { isValid: true } : validatePositiveNumber(value),
        },
        validateOnBlur: true,
      }
    );

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <FormSelect
        label="Platform"
        name="platformId"
        options={platforms}
        value={values.platformId}
        onChange={handleChange}
        error={errors.platformId?.message}
        touched={touched.platformId}
      />

      <FormInput
        label="Amount"
        name="amount"
        type="number"
        step="0.01"
        value={values.amount}
        onChange={handleChange}
        error={errors.amount?.message}
        touched={touched.amount}
      />

      <button type="submit">Add Earning</button>
    </form>
  );
}
```

## Best Practices

### 1. Validation Strategy

```typescript
// Use validateOnBlur for better UX - don't spam users with errors while typing
const { ... } = useFormValidation(initialData, {
  validators: { ... },
  validateOnBlur: true,      // Show errors after leaving field
  validateOnChange: false,   // Don't validate while typing
  validateOnSubmit: true,    // Always validate on submit
});
```

### 2. Optional Fields

```typescript
email: (name, value) => {
  // Skip validation if empty
  if (!value) return { isValid: true };
  return validateEmail(value);
}
```

### 3. Dependent Fields

```typescript
confirmPassword: (name, value) => {
  if (value !== values.password) {
    return { isValid: false, error: 'Passwords do not match' };
  }
  return { isValid: true };
}
```

### 4. Async Validation (on submit)

```typescript
const onFormSubmit = async (values) => {
  // First, sync validation is done automatically

  // Then, you can do async validation
  try {
    const isEmailAvailable = await checkEmailAPI(values.email);
    if (!isEmailAvailable) {
      setFieldError('email', 'Email already registered');
      return;
    }
  } catch (error) {
    setServerError(error.message);
  }
};
```

### 5. Error Messages

- Keep error messages clear and actionable
- Avoid technical jargon
- Suggest fixes when possible
- Use consistent tone and style

```typescript
// Bad
"Invalid email"

// Good
"Please enter a valid email address (e.g., name@example.com)"
```

### 6. Accessibility

```typescript
<FormInput
  label="Email Address"  // Always label fields
  name="email"
  error={errors.email?.message}
  touched={touched.email}
  required  // Mark required fields
  placeholder="name@example.com"  // Helpful hint
/>
```

### 7. Disabled Submit Button

```typescript
<button
  type="submit"
  disabled={!isValid || isSubmitting || hasServerError}
>
  {isSubmitting ? 'Submitting...' : 'Submit'}
</button>
```

## Testing

### Unit Tests

Run validation tests:

```bash
npm test form-validation.test.ts
```

### Test Coverage

The test suite includes:

- 40+ individual test cases
- Email validation (valid, invalid, edge cases)
- Password strength checking
- Amount validation (decimals, ranges)
- Date range validation (min/max, leap years)
- Phone number formats (international, formatting)
- URL validation (protocols, formats)
- Name validation (special characters, length)
- Edge cases (special characters, whitespace, etc.)

### Writing Custom Tests

```typescript
import { describe, it, expect } from 'vitest';
import { validateEmail } from '../lib/form-validation';

describe('Custom Email Tests', () => {
  it('should accept custom domain emails', () => {
    expect(validateEmail('user@company.internal').isValid).toBe(true);
  });
});
```

### Testing Form Components

```typescript
import { render, screen, userEvent } from '@testing-library/react';
import LoginForm from './LoginForm';

describe('LoginForm', () => {
  it('should show email error on blur with invalid email', async () => {
    render(<LoginForm />);

    const emailInput = screen.getByLabelText(/email/i);
    await userEvent.type(emailInput, 'invalid');
    await userEvent.tab();

    expect(screen.getByText(/valid email/i)).toBeInTheDocument();
  });

  it('should submit with valid data', async () => {
    render(<LoginForm />);

    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const submitButton = screen.getByRole('button', { name: /sign in/i });

    await userEvent.type(emailInput, 'user@example.com');
    await userEvent.type(passwordInput, 'ValidPass123!');
    await userEvent.click(submitButton);

    // Assert submission logic
  });
});
```

## Migration Guide

If you're migrating from manual validation:

### Before

```typescript
const [email, setEmail] = useState('');
const [emailError, setEmailError] = useState('');
const [touched, setTouched] = useState(false);

const handleEmailChange = (e) => {
  const value = e.target.value;
  setEmail(value);

  // Manual validation
  if (!value.includes('@')) {
    setEmailError('Invalid email');
  } else {
    setEmailError('');
  }
};
```

### After

```typescript
const { values, errors, touched, handleChange, handleBlur } = useFormValidation(
  { email: '' },
  { validators: { email: validateEmail } }
);

// Use in JSX: values.email, errors.email?.message, touched.email
```

## Troubleshooting

### Issue: Validation not triggering on blur

**Solution:** Ensure `validateOnBlur: true` is set in options

### Issue: Form not submitting

**Solution:** Check that:
1. All required fields have values
2. No validation errors exist
3. `onSubmit` handler doesn't throw errors

### Issue: Password strength indicator not updating

**Solution:** Call `validatePassword(values.password)` directly in render

### Issue: Custom validation not working

**Solution:** Ensure validator returns `{ isValid, error? }` format

## Support

For issues or questions:
1. Check test cases for usage examples
2. Review component props documentation
3. Check error messages for hints
4. Consult best practices section
