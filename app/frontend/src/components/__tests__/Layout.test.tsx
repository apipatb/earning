import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Layout from '../Layout';

// Mock the stores
vi.mock('../../store/auth.store', () => ({
  useAuthStore: () => ({
    user: { email: 'test@example.com' },
    logout: vi.fn(),
  }),
}));

vi.mock('../../store/theme.store', () => ({
  useThemeStore: () => ({
    isDarkMode: false,
    toggleDarkMode: vi.fn(),
  }),
}));

vi.mock('../../store/currency.store', () => ({
  useCurrencyStore: () => ({
    currency: 'USD',
    setCurrency: vi.fn(),
  }),
}));

vi.mock('../../store/i18n.store', () => ({
  useI18nStore: () => ({
    language: 'en',
    setLanguage: vi.fn(),
    t: (key: string) => key,
  }),
}));

// Mock the components to avoid complex dependencies
vi.mock('../NotificationContainer', () => ({
  default: () => <div data-testid="notification-container">Notifications</div>,
}));

vi.mock('../QuickActionsMenu', () => ({
  default: () => <div data-testid="quick-actions">Quick Actions</div>,
}));

vi.mock('../GlobalSearch', () => ({
  default: () => <div data-testid="global-search">Search</div>,
}));

vi.mock('../KeyboardShortcutsGuide', () => ({
  default: () => <div data-testid="keyboard-shortcuts">Shortcuts</div>,
}));

const renderWithRouter = (component: React.ReactElement) => {
  return render(<BrowserRouter>{component}</BrowserRouter>);
};

describe('Layout Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render the Layout component', () => {
    renderWithRouter(<Layout />);
    expect(screen.getByText('EarnTrack')).toBeInTheDocument();
  });

  it('should render the main navigation', () => {
    renderWithRouter(<Layout />);

    // Check for main nav links
    const navLinks = [
      'Dashboard',
      'Platforms',
      'Earnings',
      'Products',
      'Sales',
      'Inventory',
      'Customers',
      'Expenses',
      'Recurring',
      'Time Tracking',
      'Clients',
      'Goals',
      'Budget',
      'Analytics',
      'Reports',
      'Invoices',
      'Tax Calculator',
      'Settings',
    ];

    navLinks.forEach((link) => {
      expect(screen.getByText(link)).toBeInTheDocument();
    });
  });

  it('should display user email in navigation', () => {
    renderWithRouter(<Layout />);
    expect(screen.getByText('test@example.com')).toBeInTheDocument();
  });

  it('should render all main components', () => {
    renderWithRouter(<Layout />);

    expect(screen.getByTestId('notification-container')).toBeInTheDocument();
    expect(screen.getByTestId('quick-actions')).toBeInTheDocument();
    expect(screen.getByTestId('keyboard-shortcuts')).toBeInTheDocument();
  });

  it('should have language and currency selectors', () => {
    renderWithRouter(<Layout />);

    const languageSelects = screen.getAllByRole('combobox');
    expect(languageSelects.length).toBeGreaterThanOrEqual(2);
  });
});
