import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authAPI } from '../lib/api';
import { useAuthStore } from '../store/auth.store';
import { useFormValidation } from '../hooks/useFormValidation';
import { validateEmail, validateRequired } from '../lib/form-validation';
import { FormErrorBlock, FormInput } from '../components/FormError';

export default function Login() {
  const [serverError, setServerError] = useState('');
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();

  const { values, errors, touched, handleChange, handleBlur, handleSubmit, isValid, isSubmitting } = useFormValidation(
    { email: '', password: '' },
    {
      validators: {
        email: (fieldName, value) => {
          const required = validateRequired(value);
          if (!required.isValid) {
            return required;
          }
          return validateEmail(value);
        },
        password: validateRequired,
      },
      validateOnBlur: true,
      validateOnChange: false,
      validateOnSubmit: true,
    }
  );

  const onSubmit = async (formValues: Record<string, any>) => {
    setServerError('');

    try {
      const response = await authAPI.login({
        email: formValues.email,
        password: formValues.password,
      });
      setAuth(response.data.user, response.data.token);
      navigate('/');
    } catch (err: any) {
      setServerError(err.response?.data?.message || 'Login failed. Please try again.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Sign in to EarnTrack
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Or{' '}
            <Link
              to="/register"
              className="font-medium text-primary hover:text-primary-600"
            >
              create a new account
            </Link>
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
          {serverError && <FormErrorBlock message={serverError} />}

          <div className="space-y-4">
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

            <FormInput
              label="Password"
              name="password"
              type="password"
              placeholder="Enter your password"
              value={values.password}
              onChange={handleChange}
              onBlur={handleBlur}
              error={errors.password?.message}
              touched={touched.password}
              required
            />
          </div>

          <div>
            <button
              type="submit"
              disabled={isSubmitting || (!isValid && Object.keys(touched).length > 0)}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
            >
              {isSubmitting ? 'Signing in...' : 'Sign in'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
