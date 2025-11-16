import { AlertCircle } from 'lucide-react';
import { useMemo } from 'react';

/**
 * FormError component props
 */
export interface FormErrorProps {
  /**
   * Error message to display
   */
  message?: string;

  /**
   * Whether the field has been touched
   */
  touched?: boolean;

  /**
   * Display mode: inline (next to field) or block (below field)
   * @default 'block'
   */
  mode?: 'inline' | 'block';

  /**
   * Custom CSS class for the error message
   */
  className?: string;

  /**
   * Show icon or not
   * @default true
   */
  showIcon?: boolean;

  /**
   * Animation style
   * @default 'slide'
   */
  animationStyle?: 'slide' | 'fade' | 'none';

  /**
   * Custom error icon component
   */
  icon?: React.ReactNode;

  /**
   * Test ID for testing
   */
  testId?: string;
}

/**
 * FormError Component
 *
 * Displays field-level error messages with support for:
 * - Inline and block display modes
 * - Smooth animations
 * - Icon support
 * - Touch-aware display (only shows when field is touched)
 *
 * @example
 * ```tsx
 * <FormError
 *   message={errors.email?.message}
 *   touched={touched.email}
 *   mode="block"
 * />
 * ```
 */
export default function FormError({
  message,
  touched = true,
  mode = 'block',
  className = '',
  showIcon = true,
  animationStyle = 'slide',
  icon = <AlertCircle size={16} />,
  testId,
}: FormErrorProps) {
  const shouldShow = message && touched;

  // Animation classes
  const animationClasses = useMemo(() => {
    if (!shouldShow) return '';

    switch (animationStyle) {
      case 'fade':
        return 'animate-fade-in';
      case 'slide':
        return 'animate-slide-down';
      case 'none':
      default:
        return '';
    }
  }, [shouldShow, animationStyle]);

  // Base classes
  const baseClasses =
    'text-red-600 text-sm font-medium flex items-center gap-1.5 transition-all duration-200';

  // Mode-specific classes
  const modeClasses = mode === 'inline' ? 'inline-flex' : 'flex mt-1';

  // Combined classes
  const containerClasses = `${baseClasses} ${modeClasses} ${animationClasses} ${className}`;

  if (!shouldShow) {
    return null;
  }

  return (
    <div className={containerClasses} role="alert" data-testid={testId || 'form-error'}>
      {showIcon && <span className="flex-shrink-0">{icon}</span>}
      <span>{message}</span>
    </div>
  );
}

/**
 * FormErrorBlock Component - Convenience wrapper for block mode errors
 * Useful for displaying general form errors at the top
 */
export function FormErrorBlock({
  message,
  testId,
  className = '',
}: {
  message?: string;
  testId?: string;
  className?: string;
}) {
  if (!message) {
    return null;
  }

  return (
    <div
      className={`rounded-md bg-red-50 border border-red-200 p-4 ${className}`}
      role="alert"
      data-testid={testId || 'form-error-block'}
    >
      <div className="flex items-center gap-3">
        <AlertCircle className="text-red-600 flex-shrink-0" size={20} />
        <p className="text-sm text-red-800">{message}</p>
      </div>
    </div>
  );
}

/**
 * Form field wrapper component that includes label and error
 */
export function FormField({
  label,
  name,
  error,
  touched,
  required = false,
  children,
  className = '',
  helperText,
}: {
  label?: string;
  name: string;
  error?: string;
  touched?: boolean;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
  helperText?: string;
}) {
  return (
    <div className={`space-y-1 ${className}`}>
      {label && (
        <label htmlFor={name} className="block text-sm font-medium text-gray-700">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      {children}

      {error && touched && (
        <FormError message={error} touched={true} mode="block" showIcon={true} />
      )}

      {helperText && !error && (
        <p className="text-xs text-gray-500 mt-1">{helperText}</p>
      )}
    </div>
  );
}

/**
 * Input wrapper with integrated validation styling
 */
export function FormInput({
  label,
  name,
  type = 'text',
  error,
  touched,
  required = false,
  className = '',
  placeholder,
  disabled = false,
  onChange,
  onBlur,
  value,
  helperText,
  ...rest
}: {
  label?: string;
  name: string;
  type?: string;
  error?: string;
  touched?: boolean;
  required?: boolean;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
  value?: string | number;
  helperText?: string;
  [key: string]: any;
}) {
  const hasError = error && touched;
  const inputClasses = `
    w-full px-3 py-2 border rounded-md text-sm
    focus:outline-none focus:ring-2 focus:ring-offset-0
    transition-colors duration-200
    ${
      hasError
        ? 'border-red-300 bg-red-50 text-red-900 placeholder-red-400 focus:ring-red-500'
        : 'border-gray-300 bg-white text-gray-900 placeholder-gray-500 focus:ring-primary focus:border-primary'
    }
    ${disabled ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''}
    ${className}
  `;

  return (
    <FormField
      label={label}
      name={name}
      error={error}
      touched={touched}
      required={required}
      helperText={helperText}
    >
      <input
        id={name}
        name={name}
        type={type}
        value={value || ''}
        onChange={onChange}
        onBlur={onBlur}
        placeholder={placeholder}
        disabled={disabled}
        className={inputClasses}
        {...rest}
      />
    </FormField>
  );
}

/**
 * Textarea wrapper with integrated validation styling
 */
export function FormTextarea({
  label,
  name,
  error,
  touched,
  required = false,
  className = '',
  placeholder,
  disabled = false,
  onChange,
  onBlur,
  value,
  rows = 3,
  helperText,
  ...rest
}: {
  label?: string;
  name: string;
  error?: string;
  touched?: boolean;
  required?: boolean;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
  onChange?: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLTextAreaElement>) => void;
  value?: string;
  rows?: number;
  helperText?: string;
  [key: string]: any;
}) {
  const hasError = error && touched;
  const textareaClasses = `
    w-full px-3 py-2 border rounded-md text-sm font-sans
    focus:outline-none focus:ring-2 focus:ring-offset-0
    transition-colors duration-200 resize-none
    ${
      hasError
        ? 'border-red-300 bg-red-50 text-red-900 placeholder-red-400 focus:ring-red-500'
        : 'border-gray-300 bg-white text-gray-900 placeholder-gray-500 focus:ring-primary focus:border-primary'
    }
    ${disabled ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''}
    ${className}
  `;

  return (
    <FormField
      label={label}
      name={name}
      error={error}
      touched={touched}
      required={required}
      helperText={helperText}
    >
      <textarea
        id={name}
        name={name}
        value={value || ''}
        onChange={onChange}
        onBlur={onBlur}
        placeholder={placeholder}
        disabled={disabled}
        rows={rows}
        className={textareaClasses}
        {...rest}
      />
    </FormField>
  );
}

/**
 * Select wrapper with integrated validation styling
 */
export function FormSelect({
  label,
  name,
  error,
  touched,
  required = false,
  className = '',
  placeholder,
  disabled = false,
  onChange,
  onBlur,
  value,
  options = [],
  helperText,
  ...rest
}: {
  label?: string;
  name: string;
  error?: string;
  touched?: boolean;
  required?: boolean;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
  onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLSelectElement>) => void;
  value?: string | number;
  options: Array<{ value: string | number; label: string }>;
  helperText?: string;
  [key: string]: any;
}) {
  const hasError = error && touched;
  const selectClasses = `
    w-full px-3 py-2 border rounded-md text-sm
    focus:outline-none focus:ring-2 focus:ring-offset-0
    transition-colors duration-200
    ${
      hasError
        ? 'border-red-300 bg-red-50 text-red-900 focus:ring-red-500'
        : 'border-gray-300 bg-white text-gray-900 focus:ring-primary focus:border-primary'
    }
    ${disabled ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''}
    ${className}
  `;

  return (
    <FormField
      label={label}
      name={name}
      error={error}
      touched={touched}
      required={required}
      helperText={helperText}
    >
      <select
        id={name}
        name={name}
        value={value || ''}
        onChange={onChange}
        onBlur={onBlur}
        disabled={disabled}
        className={selectClasses}
        {...rest}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </FormField>
  );
}
