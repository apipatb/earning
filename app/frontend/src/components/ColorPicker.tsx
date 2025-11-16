import { useState, useEffect, useRef } from 'react';
import chroma from 'chroma-js';
import { Palette, Pipette, RefreshCw, Copy, Check } from 'lucide-react';

interface ColorPickerProps {
  label: string;
  value: string;
  onChange: (color: string) => void;
  showSuggestions?: boolean;
  className?: string;
}

export default function ColorPicker({
  label,
  value,
  onChange,
  showSuggestions = true,
  className = '',
}: ColorPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const [copied, setCopied] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  // Close picker when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);

    // Validate hex color
    if (/^#[0-9A-Fa-f]{6}$/.test(newValue)) {
      onChange(newValue);
    }
  };

  const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newColor = e.target.value;
    setInputValue(newColor);
    onChange(newColor);
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const generateRandomColor = () => {
    const randomColor = chroma.random().hex();
    setInputValue(randomColor);
    onChange(randomColor);
  };

  const generateShades = (baseColor: string) => {
    try {
      const color = chroma(baseColor);
      return [
        color.brighten(2).hex(),
        color.brighten(1).hex(),
        baseColor,
        color.darken(1).hex(),
        color.darken(2).hex(),
      ];
    } catch {
      return [];
    }
  };

  const generateComplementary = (baseColor: string) => {
    try {
      const color = chroma(baseColor);
      const hsl = color.hsl();
      const complementaryHue = (hsl[0] + 180) % 360;
      return chroma.hsl(complementaryHue, hsl[1], hsl[2]).hex();
    } catch {
      return baseColor;
    }
  };

  const generateTriadic = (baseColor: string) => {
    try {
      const color = chroma(baseColor);
      const hsl = color.hsl();
      return [
        baseColor,
        chroma.hsl((hsl[0] + 120) % 360, hsl[1], hsl[2]).hex(),
        chroma.hsl((hsl[0] + 240) % 360, hsl[1], hsl[2]).hex(),
      ];
    } catch {
      return [baseColor];
    }
  };

  const generateAnalogous = (baseColor: string) => {
    try {
      const color = chroma(baseColor);
      const hsl = color.hsl();
      return [
        chroma.hsl((hsl[0] - 30 + 360) % 360, hsl[1], hsl[2]).hex(),
        baseColor,
        chroma.hsl((hsl[0] + 30) % 360, hsl[1], hsl[2]).hex(),
      ];
    } catch {
      return [baseColor];
    }
  };

  const shades = generateShades(value);
  const triadicColors = generateTriadic(value);
  const analogousColors = generateAnalogous(value);

  return (
    <div className={`relative ${className}`} ref={pickerRef}>
      <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>

      <div className="flex gap-2">
        {/* Color Preview Button */}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="w-12 h-10 rounded-lg border-2 border-gray-300 shadow-sm cursor-pointer hover:border-gray-400 transition-colors"
          style={{ backgroundColor: value }}
          title="Pick color"
        >
          <span className="sr-only">Pick color</span>
        </button>

        {/* Hex Input */}
        <input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
          placeholder="#000000"
          maxLength={7}
        />

        {/* Copy Button */}
        <button
          type="button"
          onClick={copyToClipboard}
          className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          title="Copy to clipboard"
        >
          {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
        </button>

        {/* Random Color */}
        <button
          type="button"
          onClick={generateRandomColor}
          className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          title="Generate random color"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Color Picker Dropdown */}
      {isOpen && (
        <div className="absolute z-50 mt-2 p-4 bg-white rounded-lg shadow-xl border border-gray-200 w-80">
          {/* Native Color Picker */}
          <div className="mb-4">
            <label className="block text-xs font-medium text-gray-600 mb-2">
              <Pipette className="w-3 h-3 inline mr-1" />
              Pick Color
            </label>
            <input
              type="color"
              value={value}
              onChange={handleColorChange}
              className="w-full h-32 rounded-lg cursor-pointer border border-gray-300"
            />
          </div>

          {showSuggestions && (
            <>
              {/* Shades */}
              <div className="mb-4">
                <label className="block text-xs font-medium text-gray-600 mb-2">Shades</label>
                <div className="grid grid-cols-5 gap-2">
                  {shades.map((shade, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => {
                        setInputValue(shade);
                        onChange(shade);
                      }}
                      className="w-full h-10 rounded-lg border-2 border-gray-200 hover:border-gray-400 transition-colors cursor-pointer"
                      style={{ backgroundColor: shade }}
                      title={shade}
                    />
                  ))}
                </div>
              </div>

              {/* Triadic Colors */}
              <div className="mb-4">
                <label className="block text-xs font-medium text-gray-600 mb-2">
                  Triadic Harmony
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {triadicColors.map((color, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => {
                        setInputValue(color);
                        onChange(color);
                      }}
                      className="w-full h-10 rounded-lg border-2 border-gray-200 hover:border-gray-400 transition-colors cursor-pointer"
                      style={{ backgroundColor: color }}
                      title={color}
                    />
                  ))}
                </div>
              </div>

              {/* Analogous Colors */}
              <div className="mb-4">
                <label className="block text-xs font-medium text-gray-600 mb-2">
                  Analogous Colors
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {analogousColors.map((color, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => {
                        setInputValue(color);
                        onChange(color);
                      }}
                      className="w-full h-10 rounded-lg border-2 border-gray-200 hover:border-gray-400 transition-colors cursor-pointer"
                      style={{ backgroundColor: color }}
                      title={color}
                    />
                  ))}
                </div>
              </div>

              {/* Complementary */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-2">
                  Complementary
                </label>
                <button
                  type="button"
                  onClick={() => {
                    const comp = generateComplementary(value);
                    setInputValue(comp);
                    onChange(comp);
                  }}
                  className="w-full h-10 rounded-lg border-2 border-gray-200 hover:border-gray-400 transition-colors cursor-pointer"
                  style={{ backgroundColor: generateComplementary(value) }}
                  title={generateComplementary(value)}
                />
              </div>

              {/* Popular Colors */}
              <div className="mt-4">
                <label className="block text-xs font-medium text-gray-600 mb-2">
                  <Palette className="w-3 h-3 inline mr-1" />
                  Popular Colors
                </label>
                <div className="grid grid-cols-6 gap-2">
                  {[
                    '#ef4444',
                    '#f97316',
                    '#eab308',
                    '#22c55e',
                    '#3b82f6',
                    '#8b5cf6',
                    '#ec4899',
                    '#14b8a6',
                    '#f59e0b',
                    '#06b6d4',
                    '#6366f1',
                    '#a855f7',
                  ].map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => {
                        setInputValue(color);
                        onChange(color);
                      }}
                      className="w-full h-8 rounded-lg border-2 border-gray-200 hover:border-gray-400 transition-colors cursor-pointer"
                      style={{ backgroundColor: color }}
                      title={color}
                    />
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
