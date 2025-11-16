/**
 * Accessibility utilities for components
 * Helps ensure WCAG 2.1 compliance across the application
 */

/**
 * Generate accessible label for icon buttons
 * @param action - The action the button performs
 * @returns Readable label for screen readers
 */
export function getIconButtonLabel(action: 'edit' | 'delete' | 'save' | 'cancel' | 'close' | 'menu' | 'settings' | 'help' | 'search' | 'filter'): string {
  const labels: Record<string, string> = {
    edit: 'Edit this item',
    delete: 'Delete this item',
    save: 'Save changes',
    cancel: 'Cancel operation',
    close: 'Close dialog',
    menu: 'Open menu',
    settings: 'Open settings',
    help: 'Get help',
    search: 'Search',
    filter: 'Open filters',
  };
  return labels[action] || action;
}

/**
 * Generate accessible label for status badges
 * @param status - The status value
 * @returns Human-readable status description
 */
export function getStatusLabel(status: string): string {
  const statusLabels: Record<string, string> = {
    paid: 'Payment received',
    overdue: 'Overdue payment',
    pending: 'Pending approval',
    completed: 'Completed',
    cancelled: 'Cancelled',
    active: 'Active',
    inactive: 'Inactive',
    draft: 'Draft (not sent)',
    sent: 'Sent to customer',
    viewed: 'Customer viewed',
  };
  return statusLabels[status] || status;
}

/**
 * Create proper ARIA attributes for complex elements
 */
export interface AriaAttributes {
  'aria-label': string;
  'aria-describedby'?: string;
  'aria-expanded'?: boolean;
  'aria-selected'?: boolean;
  'aria-hidden'?: boolean;
  'aria-disabled'?: boolean;
  'aria-current'?: string;
}

/**
 * Generate ARIA attributes for a button
 */
export function getButtonAriaAttrs(label: string, disabled = false): Partial<AriaAttributes> {
  return {
    'aria-label': label,
    'aria-disabled': disabled,
  };
}

/**
 * Generate ARIA attributes for a collapsible element
 */
export function getCollapsibleAriaAttrs(id: string, isOpen: boolean, label: string): Partial<AriaAttributes> {
  return {
    'aria-label': `${label} section`,
    'aria-expanded': isOpen,
    'aria-controls': `${id}-content`,
  };
}

/**
 * Generate ARIA attributes for a tab element
 */
export function getTabAriaAttrs(tabId: string, panelId: string, isSelected = false): Partial<AriaAttributes> {
  return {
    'aria-selected': isSelected,
    'aria-controls': panelId,
    'aria-current': isSelected ? 'page' : undefined,
  };
}

/**
 * Generate ARIA attributes for a modal dialog
 */
export function getModalAriaAttrs(titleId: string, descriptionId?: string): Partial<AriaAttributes> {
  return {
    'aria-labelledby': titleId,
    'aria-describedby': descriptionId,
  };
}

/**
 * Get role for custom dropdown/select element
 */
export function getSelectRole(): string {
  return 'listbox';
}

/**
 * Get role for custom menu element
 */
export function getMenuRole(): string {
  return 'menu';
}

/**
 * Keyboard event handler for accessibility
 * Allows activation via Enter or Space keys
 */
export function handleAccessibleClick(
  event: React.KeyboardEvent,
  callback: () => void
): void {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    callback();
  }
}

/**
 * Announce dynamic content changes to screen readers
 * Uses ARIA live regions
 */
export function announceToScreenReader(message: string, priority: 'polite' | 'assertive' = 'polite'): void {
  const announcement = document.createElement('div');
  announcement.setAttribute('aria-live', priority);
  announcement.setAttribute('aria-atomic', 'true');
  announcement.style.position = 'absolute';
  announcement.style.left = '-9999px';
  announcement.style.width = '1px';
  announcement.style.height = '1px';
  announcement.style.overflow = 'hidden';
  announcement.textContent = message;

  document.body.appendChild(announcement);

  // Remove after announcement
  setTimeout(() => {
    announcement.remove();
  }, 3000);
}

/**
 * Check if element should be focusable
 */
export function isFocusableElement(element: HTMLElement): boolean {
  const focusableTags = ['button', 'a', 'input', 'select', 'textarea'];
  return focusableTags.includes(element.tagName.toLowerCase()) || element.tabIndex >= 0;
}

/**
 * Get skip link to main content
 */
export function getSkipLinkProps(mainContentId = 'main-content'): { id: string; href: string } {
  return {
    id: 'skip-to-main',
    href: `#${mainContentId}`,
  };
}

/**
 * Format number for accessibility
 * Adds context for screen readers
 */
export function formatNumberForA11y(
  value: number,
  context: 'currency' | 'percentage' | 'hours' | 'quantity'
): string {
  const formatter = new Intl.NumberFormat('en-US', {
    style: context === 'currency' ? 'currency' : context === 'percentage' ? 'percent' : 'decimal',
    currency: context === 'currency' ? 'USD' : undefined,
  });

  const formatted = formatter.format(context === 'percentage' ? value / 100 : value);

  switch (context) {
    case 'currency':
      return `${formatted} dollars`;
    case 'percentage':
      return `${formatted} percent`;
    case 'hours':
      return `${value} hours`;
    case 'quantity':
      return `${value} items`;
    default:
      return formatted;
  }
}

/**
 * Color contrast checker
 * Returns WCAG compliance level
 */
export function getContrastRatio(foreground: string, background: string): {
  ratio: number;
  level: 'AAA' | 'AA' | 'FAIL';
} {
  // Simple implementation - in production use a library
  const ratio = 2.5; // Placeholder
  return {
    ratio,
    level: ratio >= 7 ? 'AAA' : ratio >= 4.5 ? 'AA' : 'FAIL',
  };
}
