import React, { useState, useRef, useEffect } from 'react';
import { ScriptureFont, SCRIPTURE_FONT_OPTIONS, ScriptureFontOption } from '../types';
import { ChevronDown, Check } from 'lucide-react';
import { getDesktopPlatform } from '../utils/platform';

interface FontPickerProps {
  fontFamily: ScriptureFont;
  onChangeFontFamily: (font: ScriptureFont) => void;
  variant?: 'popover' | 'settings';
  className?: string;
}

export const FontPicker: React.FC<FontPickerProps> = ({
  fontFamily,
  onChangeFontFamily,
  variant = 'popover',
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedOption =
    SCRIPTURE_FONT_OPTIONS.find((opt) => opt.id === fontFamily) || SCRIPTURE_FONT_OPTIONS[0];

  const platform = getDesktopPlatform();
  const availableOptions = SCRIPTURE_FONT_OPTIONS.filter(
    (option) => !option.platforms || option.platforms.includes(platform as 'windows' | 'macos' | 'linux')
  );
  const suggestedOptions = availableOptions.filter((opt) => opt.group === 'suggested');
  const otherOptions = availableOptions.filter((opt) => opt.group === 'other');

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleSelect = (option: ScriptureFontOption) => {
    onChangeFontFamily(option.id);
    setIsOpen(false);
  };

  return (
    <div
      ref={dropdownRef}
      className={`font-picker-container ${variant} ${isOpen ? 'is-open' : ''} ${className}`}
    >
      {/* Trigger Button */}
      <button
        type="button"
        className="font-picker-trigger"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <span
          className="font-picker-selected-name"
          style={{ fontFamily: selectedOption.fontVar }}
        >
          {selectedOption.name}
        </span>

        <ChevronDown
          size={13}
          className={`font-picker-chevron ${isOpen ? 'rotate' : ''}`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="font-picker-dropdown" role="listbox">
          {/* Sugeridas Group */}
          <div className="font-picker-group">
            <div className="font-picker-group-header">
              <span>Sugeridas</span>
            </div>
            <div className="font-picker-options-list">
              {suggestedOptions.map((opt) => {
                const isSelected = opt.id === fontFamily;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    className={`font-picker-option ${isSelected ? 'active' : ''}`}
                    onClick={() => handleSelect(opt)}
                  >
                    <span
                      className="font-picker-option-name"
                      style={{ fontFamily: opt.fontVar }}
                    >
                      {opt.name}
                    </span>

                    {isSelected && (
                      <Check size={13} className="font-picker-check" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="font-picker-divider" />

          {/* Otras Group */}
          <div className="font-picker-group">
            <div className="font-picker-group-header">
              <span>Otras</span>
            </div>
            <div className="font-picker-options-list">
              {otherOptions.map((opt) => {
                const isSelected = opt.id === fontFamily;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    className={`font-picker-option ${isSelected ? 'active' : ''}`}
                    onClick={() => handleSelect(opt)}
                  >
                    <span
                      className="font-picker-option-name"
                      style={{ fontFamily: opt.fontVar }}
                    >
                      {opt.name}
                    </span>

                    {isSelected && (
                      <Check size={13} className="font-picker-check" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
