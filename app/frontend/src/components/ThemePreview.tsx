import { useEffect, useRef } from 'react';
import { Check, AlertCircle, Info, AlertTriangle, TrendingUp, DollarSign, Users } from 'lucide-react';
import { ThemeColors, ThemeFonts, CSSVariables } from '../hooks/useTheme';

interface ThemePreviewProps {
  colors: ThemeColors;
  fonts: ThemeFonts;
  cssVariables?: CSSVariables;
  className?: string;
}

export default function ThemePreview({
  colors,
  fonts,
  cssVariables,
  className = '',
}: ThemePreviewProps) {
  const previewRef = useRef<HTMLDivElement>(null);

  // Apply theme styles to the preview container
  useEffect(() => {
    if (!previewRef.current) return;

    const element = previewRef.current;

    // Apply CSS variables if provided
    if (cssVariables) {
      Object.entries(cssVariables).forEach(([key, value]) => {
        element.style.setProperty(key, value);
      });
    }

    // Apply colors directly
    element.style.setProperty('--preview-primary', colors.primary);
    element.style.setProperty('--preview-secondary', colors.secondary);
    element.style.setProperty('--preview-accent', colors.accent);
    element.style.setProperty('--preview-background', colors.background);
    element.style.setProperty('--preview-surface', colors.surface);
    element.style.setProperty('--preview-text', colors.text);
    element.style.setProperty('--preview-text-secondary', colors.textSecondary);
    element.style.setProperty('--preview-border', colors.border);
    element.style.setProperty('--preview-error', colors.error);
    element.style.setProperty('--preview-warning', colors.warning);
    element.style.setProperty('--preview-success', colors.success);
    element.style.setProperty('--preview-info', colors.info);

    // Apply fonts
    element.style.setProperty('--preview-font-body', fonts.body);
    element.style.setProperty('--preview-font-heading', fonts.heading);
    element.style.setProperty('--preview-font-mono', fonts.mono);
  }, [colors, fonts, cssVariables]);

  return (
    <div
      ref={previewRef}
      className={`rounded-lg border-2 overflow-hidden ${className}`}
      style={{
        backgroundColor: colors.background,
        borderColor: colors.border,
        color: colors.text,
        fontFamily: fonts.body,
      }}
    >
      <div className="p-6">
        {/* Header Section */}
        <div className="mb-6">
          <h1
            className="text-3xl font-bold mb-2"
            style={{ fontFamily: fonts.heading, color: colors.text }}
          >
            Theme Preview
          </h1>
          <p style={{ color: colors.textSecondary }}>
            See how your custom theme looks with real UI components
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div
            className="p-4 rounded-lg"
            style={{ backgroundColor: colors.surface, borderColor: colors.border }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm" style={{ color: colors.textSecondary }}>
                  Total Revenue
                </p>
                <p
                  className="text-2xl font-bold mt-1"
                  style={{ fontFamily: fonts.heading, color: colors.text }}
                >
                  $12,345
                </p>
              </div>
              <div
                className="p-3 rounded-lg"
                style={{ backgroundColor: colors.primary, color: colors.background }}
              >
                <DollarSign className="w-6 h-6" />
              </div>
            </div>
            <div className="mt-2 flex items-center">
              <TrendingUp className="w-4 h-4 mr-1" style={{ color: colors.success }} />
              <span className="text-sm" style={{ color: colors.success }}>
                +12.5%
              </span>
            </div>
          </div>

          <div
            className="p-4 rounded-lg"
            style={{ backgroundColor: colors.surface, borderColor: colors.border }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm" style={{ color: colors.textSecondary }}>
                  Active Users
                </p>
                <p
                  className="text-2xl font-bold mt-1"
                  style={{ fontFamily: fonts.heading, color: colors.text }}
                >
                  1,234
                </p>
              </div>
              <div
                className="p-3 rounded-lg"
                style={{ backgroundColor: colors.secondary, color: colors.background }}
              >
                <Users className="w-6 h-6" />
              </div>
            </div>
            <div className="mt-2 flex items-center">
              <TrendingUp className="w-4 h-4 mr-1" style={{ color: colors.success }} />
              <span className="text-sm" style={{ color: colors.success }}>
                +8.2%
              </span>
            </div>
          </div>

          <div
            className="p-4 rounded-lg"
            style={{ backgroundColor: colors.surface, borderColor: colors.border }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm" style={{ color: colors.textSecondary }}>
                  Conversion Rate
                </p>
                <p
                  className="text-2xl font-bold mt-1"
                  style={{ fontFamily: fonts.heading, color: colors.text }}
                >
                  3.24%
                </p>
              </div>
              <div
                className="p-3 rounded-lg"
                style={{ backgroundColor: colors.accent, color: colors.background }}
              >
                <TrendingUp className="w-6 h-6" />
              </div>
            </div>
            <div className="mt-2 flex items-center">
              <span className="text-sm" style={{ color: colors.textSecondary }}>
                Steady
              </span>
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div className="mb-6">
          <h2
            className="text-lg font-semibold mb-3"
            style={{ fontFamily: fonts.heading, color: colors.text }}
          >
            Buttons
          </h2>
          <div className="flex flex-wrap gap-3">
            <button
              className="px-4 py-2 rounded-lg font-medium transition-opacity hover:opacity-90"
              style={{ backgroundColor: colors.primary, color: colors.background }}
            >
              Primary Button
            </button>
            <button
              className="px-4 py-2 rounded-lg font-medium transition-opacity hover:opacity-90"
              style={{ backgroundColor: colors.secondary, color: colors.background }}
            >
              Secondary Button
            </button>
            <button
              className="px-4 py-2 rounded-lg font-medium transition-opacity hover:opacity-90"
              style={{ backgroundColor: colors.accent, color: colors.background }}
            >
              Accent Button
            </button>
            <button
              className="px-4 py-2 rounded-lg font-medium border-2 transition-colors"
              style={{ borderColor: colors.border, color: colors.text }}
            >
              Outline Button
            </button>
          </div>
        </div>

        {/* Alerts */}
        <div className="mb-6">
          <h2
            className="text-lg font-semibold mb-3"
            style={{ fontFamily: fonts.heading, color: colors.text }}
          >
            Alerts
          </h2>
          <div className="space-y-3">
            <div
              className="flex items-start p-4 rounded-lg"
              style={{ backgroundColor: `${colors.success}20`, borderLeft: `4px solid ${colors.success}` }}
            >
              <Check className="w-5 h-5 mt-0.5 mr-3" style={{ color: colors.success }} />
              <div>
                <h4 className="font-medium" style={{ color: colors.success }}>
                  Success
                </h4>
                <p className="text-sm mt-1" style={{ color: colors.text }}>
                  Your changes have been saved successfully.
                </p>
              </div>
            </div>

            <div
              className="flex items-start p-4 rounded-lg"
              style={{ backgroundColor: `${colors.info}20`, borderLeft: `4px solid ${colors.info}` }}
            >
              <Info className="w-5 h-5 mt-0.5 mr-3" style={{ color: colors.info }} />
              <div>
                <h4 className="font-medium" style={{ color: colors.info }}>
                  Information
                </h4>
                <p className="text-sm mt-1" style={{ color: colors.text }}>
                  Please review the updated terms and conditions.
                </p>
              </div>
            </div>

            <div
              className="flex items-start p-4 rounded-lg"
              style={{ backgroundColor: `${colors.warning}20`, borderLeft: `4px solid ${colors.warning}` }}
            >
              <AlertTriangle className="w-5 h-5 mt-0.5 mr-3" style={{ color: colors.warning }} />
              <div>
                <h4 className="font-medium" style={{ color: colors.warning }}>
                  Warning
                </h4>
                <p className="text-sm mt-1" style={{ color: colors.text }}>
                  Your subscription will expire in 3 days.
                </p>
              </div>
            </div>

            <div
              className="flex items-start p-4 rounded-lg"
              style={{ backgroundColor: `${colors.error}20`, borderLeft: `4px solid ${colors.error}` }}
            >
              <AlertCircle className="w-5 h-5 mt-0.5 mr-3" style={{ color: colors.error }} />
              <div>
                <h4 className="font-medium" style={{ color: colors.error }}>
                  Error
                </h4>
                <p className="text-sm mt-1" style={{ color: colors.text }}>
                  There was an error processing your request.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Form Elements */}
        <div className="mb-6">
          <h2
            className="text-lg font-semibold mb-3"
            style={{ fontFamily: fonts.heading, color: colors.text }}
          >
            Form Elements
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: colors.text }}>
                Input Field
              </label>
              <input
                type="text"
                placeholder="Enter text..."
                className="w-full px-4 py-2 rounded-lg border-2 outline-none"
                style={{
                  borderColor: colors.border,
                  backgroundColor: colors.surface,
                  color: colors.text,
                }}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: colors.text }}>
                Textarea
              </label>
              <textarea
                rows={3}
                placeholder="Enter description..."
                className="w-full px-4 py-2 rounded-lg border-2 outline-none"
                style={{
                  borderColor: colors.border,
                  backgroundColor: colors.surface,
                  color: colors.text,
                }}
              />
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="preview-checkbox"
                className="w-4 h-4 mr-2 rounded"
                style={{ accentColor: colors.primary }}
              />
              <label htmlFor="preview-checkbox" className="text-sm" style={{ color: colors.text }}>
                I agree to the terms and conditions
              </label>
            </div>
          </div>
        </div>

        {/* Typography */}
        <div>
          <h2
            className="text-lg font-semibold mb-3"
            style={{ fontFamily: fonts.heading, color: colors.text }}
          >
            Typography
          </h2>
          <div className="space-y-2">
            <h1 className="text-3xl font-bold" style={{ fontFamily: fonts.heading, color: colors.text }}>
              Heading 1
            </h1>
            <h2 className="text-2xl font-bold" style={{ fontFamily: fonts.heading, color: colors.text }}>
              Heading 2
            </h2>
            <h3 className="text-xl font-semibold" style={{ fontFamily: fonts.heading, color: colors.text }}>
              Heading 3
            </h3>
            <p style={{ color: colors.text }}>
              This is a paragraph with body text using the selected font family. The quick brown fox jumps over the lazy dog.
            </p>
            <p style={{ color: colors.textSecondary }}>
              This is secondary text that provides additional information with reduced emphasis.
            </p>
            <code
              className="px-2 py-1 rounded text-sm"
              style={{
                fontFamily: fonts.mono,
                backgroundColor: colors.surface,
                color: colors.accent,
              }}
            >
              const theme = 'awesome';
            </code>
          </div>
        </div>
      </div>
    </div>
  );
}
