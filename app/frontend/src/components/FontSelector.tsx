import { useState, useEffect } from 'react';
import { Type, Sparkles, RotateCcw } from 'lucide-react';
import { FontPairing } from '../hooks/useTheme';

interface FontSelectorProps {
  label: string;
  value: string;
  onChange: (font: string) => void;
  fontPairings?: FontPairing[];
  type?: 'heading' | 'body' | 'mono';
  className?: string;
}

// Popular Google Fonts
const POPULAR_FONTS = {
  heading: [
    'Playfair Display',
    'Montserrat',
    'Raleway',
    'Roboto Slab',
    'Merriweather',
    'Oswald',
    'Poppins',
    'Bebas Neue',
    'Abril Fatface',
    'Permanent Marker',
    'Righteous',
    'Staatliches',
  ],
  body: [
    'Source Sans Pro',
    'Open Sans',
    'Lato',
    'Roboto',
    'Merriweather Sans',
    'Nunito',
    'Inter',
    'Quicksand',
    'Work Sans',
    'Noto Sans',
    'PT Sans',
    'Karla',
  ],
  mono: [
    'JetBrains Mono',
    'Fira Code',
    'Source Code Pro',
    'Roboto Mono',
    'IBM Plex Mono',
    'Courier Prime',
    'Space Mono',
    'Inconsolata',
    'Ubuntu Mono',
    'DM Mono',
  ],
};

// System font stacks
const SYSTEM_FONTS = [
  {
    name: 'System UI',
    value: 'system-ui, -apple-system, sans-serif',
    description: 'Native system font',
  },
  {
    name: 'San Francisco (Apple)',
    value: '-apple-system, BlinkMacSystemFont, sans-serif',
    description: 'Apple system font',
  },
  {
    name: 'Segoe UI (Windows)',
    value: '"Segoe UI", Roboto, sans-serif',
    description: 'Windows system font',
  },
  {
    name: 'Georgia Serif',
    value: 'Georgia, Cambria, serif',
    description: 'Classic serif',
  },
  {
    name: 'Courier Monospace',
    value: '"Courier New", Courier, monospace',
    description: 'Classic monospace',
  },
];

export default function FontSelector({
  label,
  value,
  onChange,
  fontPairings = [],
  type = 'body',
  className = '',
}: FontSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'google' | 'system' | 'pairings'>('google');

  // Load Google Font dynamically
  useEffect(() => {
    const fontFamily = value.split(',')[0].trim().replace(/['"]/g, '');

    // Check if it's a Google Font
    const isGoogleFont = POPULAR_FONTS[type].includes(fontFamily);
    if (isGoogleFont) {
      const link = document.createElement('link');
      link.href = `https://fonts.googleapis.com/css2?family=${fontFamily.replace(/ /g, '+')}:wght@400;600;700&display=swap`;
      link.rel = 'stylesheet';
      document.head.appendChild(link);

      return () => {
        // Cleanup
        if (link.parentNode) {
          link.parentNode.removeChild(link);
        }
      };
    }
  }, [value, type]);

  const handleFontSelect = (font: string) => {
    onChange(font);
    setIsOpen(false);
  };

  const handlePairingSelect = (pairing: FontPairing) => {
    if (type === 'heading') {
      onChange(pairing.heading);
    } else if (type === 'body') {
      onChange(pairing.body);
    }
    setIsOpen(false);
  };

  const resetToDefault = () => {
    if (type === 'heading') {
      onChange('Poppins, sans-serif');
    } else if (type === 'body') {
      onChange('Inter, system-ui, sans-serif');
    } else {
      onChange('JetBrains Mono, monospace');
    }
  };

  const filteredFonts = POPULAR_FONTS[type].filter((font) =>
    font.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const currentFontFamily = value.split(',')[0].trim().replace(/['"]/g, '');

  return (
    <div className={`relative ${className}`}>
      <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>

      <div className="flex gap-2">
        {/* Font Preview Button */}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex-1 px-4 py-3 text-left border border-gray-300 rounded-lg shadow-sm hover:border-gray-400 bg-white transition-colors"
        >
          <div className="flex items-center justify-between">
            <span style={{ fontFamily: value }} className="truncate">
              {currentFontFamily}
            </span>
            <Type className="w-4 h-4 text-gray-400 ml-2" />
          </div>
          <div className="text-xs text-gray-500 mt-1 truncate">{value}</div>
        </button>

        {/* Reset Button */}
        <button
          type="button"
          onClick={resetToDefault}
          className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          title="Reset to default"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {/* Font Picker Dropdown */}
      {isOpen && (
        <div className="absolute z-50 mt-2 p-4 bg-white rounded-lg shadow-xl border border-gray-200 w-full max-w-md">
          {/* Search */}
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search fonts..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          {/* Category Tabs */}
          <div className="flex gap-2 mb-4 border-b border-gray-200">
            <button
              type="button"
              onClick={() => setSelectedCategory('google')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                selectedCategory === 'google'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-800'
              }`}
            >
              Google Fonts
            </button>
            <button
              type="button"
              onClick={() => setSelectedCategory('system')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                selectedCategory === 'system'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-800'
              }`}
            >
              System Fonts
            </button>
            {fontPairings.length > 0 && (
              <button
                type="button"
                onClick={() => setSelectedCategory('pairings')}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  selectedCategory === 'pairings'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-800'
                }`}
              >
                <Sparkles className="w-3 h-3 inline mr-1" />
                Pairings
              </button>
            )}
          </div>

          {/* Font List */}
          <div className="max-h-96 overflow-y-auto">
            {selectedCategory === 'google' && (
              <div className="space-y-1">
                {filteredFonts.map((font) => (
                  <button
                    key={font}
                    type="button"
                    onClick={() => handleFontSelect(`${font}, sans-serif`)}
                    className={`w-full px-4 py-3 text-left rounded-lg hover:bg-gray-100 transition-colors ${
                      currentFontFamily === font ? 'bg-blue-50 border border-blue-300' : ''
                    }`}
                    style={{ fontFamily: font }}
                  >
                    <div className="font-medium">{font}</div>
                    <div className="text-sm text-gray-500" style={{ fontFamily: font }}>
                      The quick brown fox jumps over the lazy dog
                    </div>
                  </button>
                ))}
              </div>
            )}

            {selectedCategory === 'system' && (
              <div className="space-y-1">
                {SYSTEM_FONTS.map((font) => (
                  <button
                    key={font.name}
                    type="button"
                    onClick={() => handleFontSelect(font.value)}
                    className={`w-full px-4 py-3 text-left rounded-lg hover:bg-gray-100 transition-colors ${
                      value === font.value ? 'bg-blue-50 border border-blue-300' : ''
                    }`}
                  >
                    <div className="font-medium" style={{ fontFamily: font.value }}>
                      {font.name}
                    </div>
                    <div className="text-xs text-gray-500">{font.description}</div>
                    <div className="text-sm text-gray-600 mt-1" style={{ fontFamily: font.value }}>
                      The quick brown fox jumps over the lazy dog
                    </div>
                  </button>
                ))}
              </div>
            )}

            {selectedCategory === 'pairings' && (
              <div className="space-y-2">
                {fontPairings.map((pairing, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => handlePairingSelect(pairing)}
                    className="w-full px-4 py-3 text-left rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-700">
                          {pairing.description}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">{pairing.category}</div>
                      </div>
                      <Sparkles className="w-4 h-4 text-yellow-500" />
                    </div>
                    <div className="space-y-2">
                      <div style={{ fontFamily: pairing.heading }} className="text-lg font-bold">
                        Heading: {pairing.heading}
                      </div>
                      <div style={{ fontFamily: pairing.body }} className="text-sm">
                        Body: {pairing.body}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
