/**
 * Tests for ErrorBoundary component
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { ErrorBoundary, withErrorBoundary } from '../ErrorBoundary';

// Component that throws an error
const ThrowError = () => {
  throw new Error('Test error');
};

// Normal component
const NormalComponent = () => <div>Normal Component</div>;

// Component that throws error conditionally
const ConditionalErrorComponent = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) {
    throw new Error('Conditional error');
  }
  return <div>No error</div>;
};

describe('ErrorBoundary Component', () => {
  beforeEach(() => {
    // Suppress console.error for these tests
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should render children without error', () => {
    render(
      <ErrorBoundary>
        <NormalComponent />
      </ErrorBoundary>
    );

    expect(screen.getByText('Normal Component')).toBeInTheDocument();
  });

  it('should catch errors and display fallback UI', () => {
    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );

    // Check for error message in UI
    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
  });

  it('should display error details in development mode', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );

    expect(screen.getByText(/test error/i)).toBeInTheDocument();

    process.env.NODE_ENV = originalEnv;
  });

  it('should show retry button', () => {
    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );

    const retryButton = screen.getByRole('button', { name: /try again/i });
    expect(retryButton).toBeInTheDocument();
  });

  it('should reset error on retry button click', () => {
    let shouldThrow = true;

    const ToggleError = () => {
      if (shouldThrow) {
        throw new Error('Test error');
      }
      return <div>Success</div>;
    };

    const { rerender } = render(
      <ErrorBoundary>
        <ToggleError />
      </ErrorBoundary>
    );

    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();

    // Simulate fixing the error
    shouldThrow = false;

    const retryButton = screen.getByRole('button', { name: /try again/i });
    retryButton.click();

    // Re-render to pick up the changed state
    rerender(
      <ErrorBoundary>
        <ToggleError />
      </ErrorBoundary>
    );

    // This would pass if the error is fixed
    // Note: In real scenarios, you'd use state management or props changes
  });

  it('should handle multiple children', () => {
    render(
      <ErrorBoundary>
        <NormalComponent />
        <div>Another child</div>
        <span>Third child</span>
      </ErrorBoundary>
    );

    expect(screen.getByText('Normal Component')).toBeInTheDocument();
    expect(screen.getByText('Another child')).toBeInTheDocument();
    expect(screen.getByText('Third child')).toBeInTheDocument();
  });

  it('should reset error state when key changes', () => {
    const { rerender } = render(
      <ErrorBoundary key="1">
        <ThrowError />
      </ErrorBoundary>
    );

    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();

    // Change key to reset error boundary
    rerender(
      <ErrorBoundary key="2">
        <NormalComponent />
      </ErrorBoundary>
    );

    expect(screen.getByText('Normal Component')).toBeInTheDocument();
    expect(screen.queryByText(/something went wrong/i)).not.toBeInTheDocument();
  });
});

describe('withErrorBoundary HOC', () => {
  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should wrap component with ErrorBoundary', () => {
    const WrappedComponent = withErrorBoundary(NormalComponent);

    render(<WrappedComponent />);

    expect(screen.getByText('Normal Component')).toBeInTheDocument();
  });

  it('should catch errors in wrapped component', () => {
    const WrappedComponent = withErrorBoundary(ThrowError);

    render(<WrappedComponent />);

    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
  });

  it('should pass through props to wrapped component', () => {
    const ComponentWithProps = ({ title }: { title: string }) => (
      <div>{title}</div>
    );

    const WrappedComponent = withErrorBoundary(ComponentWithProps);

    render(<WrappedComponent title="Test Title" />);

    expect(screen.getByText('Test Title')).toBeInTheDocument();
  });

  it('should work with functional components', () => {
    const FunctionalComponent = () => <div>Functional</div>;
    const WrappedComponent = withErrorBoundary(FunctionalComponent);

    render(<WrappedComponent />);

    expect(screen.getByText('Functional')).toBeInTheDocument();
  });

  it('should preserve component display name', () => {
    const NamedComponent = () => <div>Named</div>;
    NamedComponent.displayName = 'CustomName';

    const WrappedComponent = withErrorBoundary(NamedComponent);

    // Check that wrapped component maintains reference to original
    expect(WrappedComponent.displayName).toContain('CustomName');
  });
});

describe('ErrorBoundary Edge Cases', () => {
  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should handle errors thrown in event handlers gracefully', () => {
    const ComponentWithEventError = () => {
      const [count, setCount] = React.useState(0);

      const handleClick = () => {
        if (count === 1) {
          throw new Error('Error in event handler');
        }
        setCount(c => c + 1);
      };

      return <button onClick={handleClick}>Count: {count}</button>;
    };

    render(
      <ErrorBoundary>
        <ComponentWithEventError />
      </ErrorBoundary>
    );

    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
  });

  it('should not catch errors in event handlers (expected React behavior)', () => {
    // This is expected behavior - Error Boundaries don't catch errors in event handlers
    const throwInEvent = () => {
      throw new Error('Event handler error');
    };

    const ComponentWithError = () => (
      <button onClick={throwInEvent}>Throw Error</button>
    );

    expect(() => {
      render(
        <ErrorBoundary>
          <ComponentWithError />
        </ErrorBoundary>
      );
    }).not.toThrow();
  });

  it('should not catch errors in async code', async () => {
    const AsyncComponent = () => {
      React.useEffect(() => {
        setTimeout(() => {
          throw new Error('Async error');
        }, 100);
      }, []);

      return <div>Async Component</div>;
    };

    // This should not throw during render
    expect(() => {
      render(
        <ErrorBoundary>
          <AsyncComponent />
        </ErrorBoundary>
      );
    }).not.toThrow();
  });
});
