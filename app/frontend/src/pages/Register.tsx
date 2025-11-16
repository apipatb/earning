import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Check } from 'lucide-react';
import { authAPI } from '../lib/api';
import { useAuthStore } from '../store/auth.store';
import { useFormValidation } from '../hooks/useFormValidation';
import { validateEmail, validatePassword, validateName, validateRequired } from '../lib/form-validation';
import { FormErrorBlock, FormInput } from '../components/FormError';

export default function Register() {
  const [serverError, setServerError] = useState('');
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();

  const { values, errors, touched, handleChange, handleBlur, handleSubmit, isValid, isSubmitting } = useFormValidation(
    { name: '', email: '', password: '' },
    {
      validators: {
        name: (fieldName, value) => {
          if (!value) return { isValid: true }; // Optional field
          return validateName(value);
        },
        email: (fieldName, value) => {
          const required = validateRequired(value);
          if (!required.isValid) {
            return required;
          }
          return validateEmail(value);
        },
        password: validatePassword,
      },
      validateOnBlur: true,
      validateOnChange: false,
      validateOnSubmit: true,
    }
  );

  const passwordValidation = validatePassword(values.password);

  const onSubmit = async (formValues: Record<string, any>) => {
    setServerError('');

    try {
      const response = await authAPI.register({
        email: formValues.email,
        password: formValues.password,
        name: formValues.name || undefined,
      });
      setAuth(response.data.user, response.data.token);
      navigate('/');
    } catch (err: any) {
      setServerError(err.response?.data?.message || 'Registration failed. Please try again.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Create your account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Or{' '}
            <Link
              to="/login"
              className="font-medium text-primary hover:text-primary-600"
            >
              sign in to existing account
            </Link>
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
          {serverError && <FormErrorBlock message={serverError} />}

          <div className="space-y-4">
            <FormInput
              label="Full Name"
              name="name"
              type="text"
              placeholder="John Doe"
              value={values.name}
              onChange={handleChange}
              onBlur={handleBlur}
              error={errors.name?.message}
              touched={touched.name}
              helperText="(Optional)"
            />

            <FormInput
              label="Email address"
              name="email"
              type="email"
              placeholder="name@example.com"
              value={values.email}
              onChange={handleChange}
              onBlur={handleBlur}
              error={errors.email?.message}
              touched={touched.email}
              required
            />

            <div className="space-y-2">
              <FormInput
                label="Password"
                name="password"
                type="password"
                placeholder="Enter a strong password"
                value={values.password}
                onChange={handleChange}
                onBlur={handleBlur}
                error={errors.password?.message}
                touched={touched.password}
                required
              />

              {values.password && (
                <div className="mt-3 space-y-2">
                  <div className="text-xs font-medium text-gray-700">Password requirements:</div>
                  <div className="space-y-1 text-xs">
                    <PasswordRequirement
                      met={values.password.length >= 8}
                      text="At least 8 characters"
                    />
                    <PasswordRequirement
                      met={/[A-Z]/.test(values.password)}
                      text="Contains uppercase letter"
                    />
                    <PasswordRequirement
                      met={/[a-z]/.test(values.password)}
                      text="Contains lowercase letter"
                    />
                    <PasswordRequirement
                      met={/[0-9]/.test(values.password)}
                      text="Contains a number"
                    />
                    <PasswordRequirement
                      met={/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(values.password)}
                      text="Contains special character"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isSubmitting || (!isValid && Object.keys(touched).length > 0)}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
            >
              {isSubmitting ? 'Creating account...' : 'Create account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/**
 * Helper component to display password requirement status
 */
function PasswordRequirement({ met, text }: { met: boolean; text: string }) {
  return (
    <div className={`flex items-center gap-2 ${met ? 'text-green-600' : 'text-gray-400'}`}>
      <Check size={14} />
      <span>{text}</span>
    </div>
  );
}
