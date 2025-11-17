import { useState } from 'react';
import { ErrorBoundary } from './ErrorBoundary';

/**
 * Test component for ErrorBoundary
 * Intentionally throws an error when the button is clicked
 */
function BuggyComponent() {
  const [shouldThrow, setShouldThrow] = useState(false);

  if (shouldThrow) {
    // Intentionally throw an error for testing
    throw new Error('Test Error: This is an intentional error for testing the ErrorBoundary!');
  }

  return (
    <div className="p-8 bg-white dark:bg-gray-800 rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">
        ErrorBoundary Test Component
      </h2>
      <p className="text-gray-600 dark:text-gray-300 mb-4">
        Click the button below to trigger an intentional error and test the ErrorBoundary.
      </p>
      <button
        onClick={() => setShouldThrow(true)}
        className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-colors"
      >
        Throw Error
      </button>
    </div>
  );
}

/**
 * ErrorBoundary Test Page
 * Use this component to test the ErrorBoundary functionality
 *
 * Usage:
 * 1. Import this component in your App.tsx or any page
 * 2. Add a route: <Route path="/error-test" element={<ErrorBoundaryTest />} />
 * 3. Navigate to /error-test
 * 4. Click "Throw Error" button
 * 5. Verify the ErrorBoundary displays the error UI
 * 6. Click "Try Again" to reset the error state
 * 7. Verify the component re-renders without error
 */
export default function ErrorBoundaryTest() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 p-6 rounded">
          <h1 className="text-3xl font-bold text-blue-900 dark:text-blue-200 mb-2">
            ErrorBoundary Testing
          </h1>
          <p className="text-blue-800 dark:text-blue-300">
            This page is for testing the ErrorBoundary component. The component below is wrapped
            in an ErrorBoundary and will throw an error when you click the button.
          </p>
        </div>

        <ErrorBoundary>
          <BuggyComponent />
        </ErrorBoundary>

        <div className="bg-green-50 dark:bg-green-900/20 border-l-4 border-green-500 p-6 rounded">
          <h2 className="text-xl font-semibold text-green-900 dark:text-green-200 mb-2">
            Expected Behavior
          </h2>
          <ul className="list-disc list-inside text-green-800 dark:text-green-300 space-y-2">
            <li>Click "Throw Error" to trigger an error</li>
            <li>ErrorBoundary should catch the error and display error UI</li>
            <li>In development mode, you should see error details and stack trace</li>
            <li>In production mode, error details are hidden</li>
            <li>Click "Try Again" to reset the error state</li>
            <li>Component should re-render successfully</li>
            <li>Click "Contact Support" to open email client with error details</li>
            <li>Error should be logged to console and Sentry (if configured)</li>
          </ul>
        </div>

        <div className="bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-500 p-6 rounded">
          <h2 className="text-xl font-semibold text-yellow-900 dark:text-yellow-200 mb-2">
            Testing Different Scenarios
          </h2>
          <div className="text-yellow-800 dark:text-yellow-300 space-y-2">
            <p><strong>1. Component Error:</strong> Click the button above</p>
            <p><strong>2. Async Error:</strong> Modify BuggyComponent to throw in useEffect</p>
            <p><strong>3. Event Handler Error:</strong> Already tested by the button click</p>
            <p><strong>4. Render Error:</strong> The component throws during render after state change</p>
          </div>
        </div>
      </div>
    </div>
  );
}
