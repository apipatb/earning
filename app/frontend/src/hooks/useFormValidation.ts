import { useState, useCallback, useRef } from 'react';

/**
 * Form field error information
 */
export interface FieldError {
  message: string;
  type?: string;
}

/**
 * Validator function type
 * Takes field name and value, returns validation result
 */
export type ValidatorFunction = (
  fieldName: string,
  value: any
) => { isValid: boolean; error?: string };

/**
 * Options for useFormValidation hook
 */
export interface UseFormValidationOptions {
  validators?: Record<string, ValidatorFunction | ValidatorFunction[]>;
  validateOnChange?: boolean;
  validateOnBlur?: boolean;
  validateOnSubmit?: boolean;
  initialErrors?: Record<string, string>;
}

/**
 * Form state interface
 */
export interface FormState {
  values: Record<string, any>;
  errors: Record<string, FieldError | undefined>;
  touched: Record<string, boolean>;
  isValid: boolean;
  isSubmitting: boolean;
  isDirty: boolean;
}

/**
 * useFormValidation hook
 * Manages form state, validation, and error handling
 *
 * @param initialValues - Initial form values
 * @param options - Configuration options
 * @returns Form state and handlers
 *
 * @example
 * ```tsx
 * const { values, errors, touched, handleChange, handleBlur, handleSubmit, isValid } =
 *   useFormValidation(
 *     { email: '', password: '' },
 *     {
 *       validators: {
 *         email: validateEmail,
 *         password: validatePassword,
 *       },
 *     }
 *   );
 * ```
 */
export const useFormValidation = (
  initialValues: Record<string, any>,
  options: UseFormValidationOptions = {}
) => {
  const {
    validators = {},
    validateOnChange = false,
    validateOnBlur = true,
    validateOnSubmit = true,
    initialErrors = {},
  } = options;

  const [state, setState] = useState<FormState>({
    values: initialValues,
    errors: Object.keys(initialErrors).reduce((acc, key) => {
      acc[key] = initialErrors[key] ? { message: initialErrors[key] } : undefined;
      return acc;
    }, {} as Record<string, FieldError | undefined>),
    touched: {},
    isValid: false,
    isSubmitting: false,
    isDirty: false,
  });

  const initialValuesRef = useRef(initialValues);

  /**
   * Validate a single field
   */
  const validateField = useCallback(
    (fieldName: string, value: any): FieldError | undefined => {
      const fieldValidator = validators[fieldName];

      if (!fieldValidator) {
        return undefined;
      }

      // Handle array of validators (run all, return first error)
      const validatorArray = Array.isArray(fieldValidator)
        ? fieldValidator
        : [fieldValidator];

      for (const validator of validatorArray) {
        const result = validator(fieldName, value);
        if (!result.isValid) {
          return { message: result.error || 'Validation failed' };
        }
      }

      return undefined;
    },
    [validators]
  );

  /**
   * Validate all fields
   */
  const validateAllFields = useCallback((): Record<string, FieldError | undefined> => {
    const newErrors: Record<string, FieldError | undefined> = {};

    Object.keys(state.values).forEach((fieldName) => {
      const error = validateField(fieldName, state.values[fieldName]);
      if (error) {
        newErrors[fieldName] = error;
      } else {
        newErrors[fieldName] = undefined;
      }
    });

    return newErrors;
  }, [state.values, validateField]);

  /**
   * Handle field change
   */
  const handleChange = useCallback(
    (
      event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement> | { target: { name: string; value: any } }
    ) => {
      const { name, value } = event.target;

      setState((prevState) => {
        const newValues = { ...prevState.values, [name]: value };
        let newErrors = { ...prevState.errors };

        if (validateOnChange && validators[name]) {
          const error = validateField(name, value);
          newErrors[name] = error;
        }

        const isDirty = JSON.stringify(newValues) !== JSON.stringify(initialValuesRef.current);

        return {
          ...prevState,
          values: newValues,
          errors: newErrors,
          isDirty,
        };
      });
    },
    [validateOnChange, validateField, validators]
  );

  /**
   * Handle field blur
   */
  const handleBlur = useCallback(
    (
      event: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement> | { target: { name: string } }
    ) => {
      const { name } = event.target;

      setState((prevState) => {
        const newTouched = { ...prevState.touched, [name]: true };
        let newErrors = { ...prevState.errors };

        if (validateOnBlur && validators[name]) {
          const error = validateField(name, prevState.values[name]);
          newErrors[name] = error;
        }

        return {
          ...prevState,
          touched: newTouched,
          errors: newErrors,
        };
      });
    },
    [validateOnBlur, validateField, validators]
  );

  /**
   * Handle form submission
   */
  const handleSubmit = useCallback(
    (onSubmit: (values: Record<string, any>) => void | Promise<void>) =>
      async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (validateOnSubmit) {
          const newErrors = validateAllFields();
          const hasErrors = Object.values(newErrors).some((error) => error !== undefined);

          if (hasErrors) {
            setState((prevState) => ({
              ...prevState,
              errors: newErrors,
              touched: Object.keys(prevState.values).reduce((acc, key) => ({ ...acc, [key]: true }), {}),
            }));
            return;
          }
        }

        try {
          setState((prevState) => ({ ...prevState, isSubmitting: true }));
          await onSubmit(state.values);
        } catch (error) {
          console.error('Form submission error:', error);
        } finally {
          setState((prevState) => ({ ...prevState, isSubmitting: false }));
        }
      },
    [state.values, validateOnSubmit, validateAllFields]
  );

  /**
   * Reset form to initial values
   */
  const resetForm = useCallback(() => {
    setState({
      values: initialValuesRef.current,
      errors: {},
      touched: {},
      isValid: false,
      isSubmitting: false,
      isDirty: false,
    });
  }, []);

  /**
   * Set field value programmatically
   */
  const setFieldValue = useCallback((fieldName: string, value: any) => {
    setState((prevState) => {
      const newValues = { ...prevState.values, [fieldName]: value };
      const isDirty = JSON.stringify(newValues) !== JSON.stringify(initialValuesRef.current);

      return {
        ...prevState,
        values: newValues,
        isDirty,
      };
    });
  }, []);

  /**
   * Set field error manually
   */
  const setFieldError = useCallback((fieldName: string, error: string | undefined) => {
    setState((prevState) => ({
      ...prevState,
      errors: {
        ...prevState.errors,
        [fieldName]: error ? { message: error } : undefined,
      },
    }));
  }, []);

  /**
   * Set field touched state
   */
  const setFieldTouched = useCallback((fieldName: string, touched: boolean = true) => {
    setState((prevState) => ({
      ...prevState,
      touched: { ...prevState.touched, [fieldName]: touched },
    }));
  }, []);

  /**
   * Get field props (value, onChange, onBlur)
   */
  const getFieldProps = useCallback(
    (fieldName: string) => ({
      name: fieldName,
      value: state.values[fieldName] || '',
      onChange: handleChange,
      onBlur: handleBlur,
    }),
    [state.values, handleChange, handleBlur]
  );

  /**
   * Get field meta (value, error, touched)
   */
  const getFieldMeta = useCallback(
    (fieldName: string) => ({
      value: state.values[fieldName],
      error: state.errors[fieldName]?.message,
      touched: state.touched[fieldName],
      isDirty: state.values[fieldName] !== initialValuesRef.current[fieldName],
    }),
    [state.values, state.errors, state.touched]
  );

  /**
   * Check if form is valid
   */
  const isValid = !Object.values(state.errors).some((error) => error !== undefined);

  return {
    // State
    values: state.values,
    errors: state.errors,
    touched: state.touched,
    isValid,
    isSubmitting: state.isSubmitting,
    isDirty: state.isDirty,

    // Handlers
    handleChange,
    handleBlur,
    handleSubmit,
    resetForm,

    // Field setters
    setFieldValue,
    setFieldError,
    setFieldTouched,

    // Field helpers
    getFieldProps,
    getFieldMeta,
    validateField,
    validateAllFields,
  };
};
