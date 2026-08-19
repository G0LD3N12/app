import React from 'react';
import { Search } from 'lucide-react';
import { BibleVersion } from '../../types';

interface SettingsSearchSectionProps {
  versions: BibleVersion[];
  searchLanguages: string[];
  onChangeSearchLanguages: (langs: string[]) => void;
}

const LANGUAGE_NAMES: Record<string, string> = {
  es: 'Español',
  en: 'English',
  fr: 'Français',
  de: 'Deutsch',
  pt: 'Português',
  la: 'Latín',
};

export const SettingsSearchSection: React.FC<SettingsSearchSectionProps> = ({
  versions,
  searchLanguages,
  onChangeSearchLanguages,
}) => {
  const languages = Array.from(new Set(versions.map((version) => version.language)));

  const toggleLanguage = (language: string) => {
    onChangeSearchLanguages(
      searchLanguages.includes(language)
        ? searchLanguages.filter((item) => item !== language)
        : [...searchLanguages, language]
    );
  };

  return (
    <section className="settings-block">
      <div className="settings-block-title">
        <div><strong>Idiomas de búsqueda</strong><span>{versions.length} ediciones · índice local</span></div>
        <Search size={17} />
      </div>

      <div className="settings-language-list">
        <button
          type="button"
          className={searchLanguages.length === 0 ? 'active' : ''}
          onClick={() => onChangeSearchLanguages([])}
        >
          Todos
        </button>
        {languages.map((language) => (
          <button
            key={language}
            type="button"
            className={searchLanguages.includes(language) ? 'active' : ''}
            onClick={() => toggleLanguage(language)}
          >
            {LANGUAGE_NAMES[language] || language.toUpperCase()}
          </button>
        ))}
      </div>
    </section>
  );
};
