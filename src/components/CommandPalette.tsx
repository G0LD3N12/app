import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Book, BibleVersion, SearchHit } from '../types';
import { searchBible } from '../services/bibleService';
import { THEME_PALETTES } from '../themeDefinitions';
import {
  Search,
  BookOpen,
  Sparkles,
  Palette,
  Columns2,
  Settings,
  CornerDownLeft,
  X,
} from 'lucide-react';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  books: Book[];
  versions: BibleVersion[];
  currentVersion: string;
  searchLanguages: string[];
  onSelectPassage: (book: Book, chapter: number, verse?: number) => void;
  onSelectConcept: (slug: string) => void;
  onToggleParallel: () => void;
  onSelectTheme: (themeId: any) => void;
  onOpenSettings: () => void;
  onOpenStudyCatalog: () => void;
}

interface CommandItem {
  id: string;
  category: 'Escritura' | 'Palabra' | 'Concepto' | 'Comandos';
  title: string;
  subtitle?: string;
  icon: React.ElementType;
  action: () => void;
}

const STUDY_CONCEPTS = [
  { slug: 'anaquitas', name: 'Anaquitas (Anaceos)', desc: 'Gigantes históricos de Hebrón y su tipología' },
  { slug: 'cordero-pascual', name: 'Cordero Pascual', desc: 'Sacrificio sustitutivo central y tipología de Cristo' },
  { slug: 'arca-del-pacto', name: 'Arca del Pacto', desc: 'Trono de la presencia divina y propiciatorio' },
  { slug: 'melquisedec', name: 'Melquisedec', desc: 'Rey de Salem y sacerdote eterno del Altísimo' },
  { slug: 'logos-palabra', name: 'El Verbo (Logos)', desc: 'La Palabra divina encarnada en Juan 1:1' },
  { slug: 'serpiente-de-bronce', name: 'Serpiente de Bronce', desc: 'Símbolo de juicio levantado en el desierto' },
];

function parseScriptureRef(
  raw: string,
  books: Book[]
): { book: Book; chapter: number; verse?: number } | null {
  const clean = raw.trim().toLowerCase();
  if (!clean) return null;

  const match = clean.match(/^([a-záéíóúñ\s]+?)\s*(\d+)(?:[:\s\-](\d+))?$/i);
  if (!match) return null;

  const bookQuery = match[1].trim();
  const chapter = parseInt(match[2], 10);
  const verse = match[3] ? parseInt(match[3], 10) : undefined;

  const found = books.find((b) => {
    const bName = b.name_es.toLowerCase();
    const bCode = b.code.toLowerCase();
    return bName === bookQuery || bName.startsWith(bookQuery) || bCode === bookQuery;
  });

  if (found && chapter >= 1 && chapter <= found.total_chapters) {
    return { book: found, chapter, verse };
  }

  return null;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  books,
  versions,
  currentVersion,
  searchLanguages,
  onSelectPassage,
  onSelectConcept,
  onToggleParallel,
  onSelectTheme,
  onOpenSettings,
  onOpenStudyCatalog,
}) => {
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchHit[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSearchResults([]);
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Handle Search Query with Debounce
  useEffect(() => {
    if (!isOpen || !query.trim()) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const searchableVersions =
          searchLanguages.length === 0
            ? versions.map((v) => v.id)
            : versions.filter((v) => searchLanguages.includes(v.language)).map((v) => v.id);
        const versionIds =
          searchableVersions.length > 0 ? searchableVersions : [currentVersion];
        const hits = await searchBible(query.trim(), versionIds, 20);
        setSearchResults(hits);
      } catch (err) {
        console.error('Command search error:', err);
      }
    }, 180);

    return () => clearTimeout(timer);
  }, [query, currentVersion, isOpen, versions, searchLanguages]);

  const items = useMemo(() => {
    const next: CommandItem[] = [];
    const parsedRef = parseScriptureRef(query, books);

    if (parsedRef) {
      next.push({
        id: `scripture-${parsedRef.book.id}-${parsedRef.chapter}`,
        category: 'Escritura',
        title: `${parsedRef.book.name_es} ${parsedRef.chapter}${parsedRef.verse ? `:${parsedRef.verse}` : ''}`,
        subtitle: `Saltar directamente al pasaje (${parsedRef.book.testament === 'OT' ? 'Antiguo Testamento' : 'Nuevo Testamento'})`,
        icon: BookOpen,
        action: () => {
          onSelectPassage(parsedRef.book, parsedRef.chapter, parsedRef.verse);
          onClose();
        },
      });
    }

    if (searchResults.length > 0) {
      searchResults.forEach((hit, idx) => {
        next.push({
          id: `search-${idx}`,
          category: 'Palabra',
          title: `${hit.book_name} ${hit.chapter}:${hit.verse}`,
          subtitle: hit.raw_text,
          icon: Search,
          action: () => {
            const b = books.find((x) => x.id === hit.book_id);
            if (b) {
              onSelectPassage(b, hit.chapter, hit.verse);
            }
            onClose();
          },
        });
      });
    }

    STUDY_CONCEPTS.filter(
      (c) =>
        !query ||
        c.name.toLowerCase().includes(query.toLowerCase()) ||
        c.desc.toLowerCase().includes(query.toLowerCase())
    ).forEach((c) => {
      next.push({
        id: `concept-${c.slug}`,
        category: 'Concepto',
        title: c.name,
        subtitle: c.desc,
        icon: Sparkles,
        action: () => {
          onSelectConcept(c.slug);
          onClose();
        },
      });
    });

    const appCommands: CommandItem[] = [
      {
        id: 'cmd-parallel',
        category: 'Comandos',
        title: 'Alternar Vista Paralela',
        subtitle: 'Comparar dos traducciones lado a lado (Atajo: P)',
        icon: Columns2,
        action: () => {
          onToggleParallel();
          onClose();
        },
      },
      {
        id: 'cmd-catalog',
        category: 'Comandos',
        title: 'Abrir Catálogo de Estudio',
        subtitle: 'Explorar todos los conceptos históricos y teológicos',
        icon: Sparkles,
        action: () => {
          onOpenStudyCatalog();
          onClose();
        },
      },
      {
        id: 'cmd-settings',
        category: 'Comandos',
        title: 'Abrir Configuración',
        subtitle: 'Ajustar temas, fuentes, versiones y rendimiento',
        icon: Settings,
        action: () => {
          onOpenSettings();
          onClose();
        },
      },
    ];

    THEME_PALETTES.forEach((t) => {
      if (!query || t.name.toLowerCase().includes(query.toLowerCase()) || 'tema'.includes(query.toLowerCase())) {
        appCommands.push({
          id: `theme-${t.id}`,
          category: 'Comandos',
          title: `Cambiar Tema: ${t.name}`,
          subtitle: t.description,
          icon: Palette,
          action: () => {
            onSelectTheme(t.id);
            onClose();
          },
        });
      }
    });

    if (
      !query ||
      'comando'.includes(query.toLowerCase()) ||
      'vista'.includes(query.toLowerCase()) ||
      'tema'.includes(query.toLowerCase()) ||
      'configuracion'.includes(query.toLowerCase())
    ) {
      next.push(...appCommands);
    }

    return next;
  }, [
    query,
    searchResults,
    books,
    onSelectPassage,
    onSelectConcept,
    onToggleParallel,
    onSelectTheme,
    onOpenSettings,
    onOpenStudyCatalog,
    onClose,
  ]);

  const itemsRef = useRef(items);
  const selectedIndexRef = useRef(selectedIndex);
  itemsRef.current = items;
  selectedIndexRef.current = selectedIndex;

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const list = itemsRef.current;
      if (e.key === 'ArrowDown' || (e.ctrlKey && e.key === 'n')) {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % Math.max(1, list.length));
      } else if (e.key === 'ArrowUp' || (e.ctrlKey && e.key === 'p')) {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + list.length) % Math.max(1, list.length));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        list[selectedIndexRef.current]?.action();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  if (!isOpen) return null;

  // Group items by category
  const categories: Array<'Escritura' | 'Palabra' | 'Concepto' | 'Comandos'> = [
    'Escritura',
    'Palabra',
    'Concepto',
    'Comandos',
  ];

  return (
    <div className="command-palette-backdrop" onClick={onClose}>
      <div className="command-palette-card" onClick={(e) => e.stopPropagation()}>
        {/* Search Input Bar */}
        <div className="command-input-wrapper">
          <Search size={18} className="command-search-icon" />
          <input
            ref={inputRef}
            type="text"
            className="command-input"
            placeholder="Buscar pasaje (ej. Juan 3:16), palabra, concepto o comando..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
          />
          {query && (
            <button className="command-clear-btn" onClick={() => setQuery('')}>
              <X size={15} />
            </button>
          )}
          <span className="command-kbd-badge">ESC</span>
        </div>

        {/* Results List */}
        <div className="command-results-list">
          {items.length === 0 ? (
            <div className="command-empty-state">
              <Search size={24} style={{ opacity: 0.5, marginBottom: '8px' }} />
              <p>No se encontraron resultados para «{query}»</p>
              <span>Prueba con un pasaje como «Génesis 1» o una palabra como «gracia».</span>
            </div>
          ) : (
            categories.map((cat) => {
              const catItems = items.filter((it) => it.category === cat);
              if (catItems.length === 0) return null;

              return (
                <div key={cat} className="command-category-group">
                  <div className="command-category-header">
                    <span>{cat}</span>
                    {cat === 'Palabra' && searchResults.length > 0 && (
                      <span className="command-count-pill">{searchResults.length} resultados</span>
                    )}
                  </div>

                  {catItems.map((item) => {
                    const globalIdx = items.findIndex((x) => x.id === item.id);
                    const isSelected = globalIdx === selectedIndex;
                    const Icon = item.icon;

                    return (
                      <div
                        key={item.id}
                        className={`command-item-row ${isSelected ? 'selected' : ''}`}
                        onClick={item.action}
                        onMouseEnter={() => setSelectedIndex(globalIdx)}
                      >
                        <div className="command-item-icon-box">
                          <Icon size={16} />
                        </div>

                        <div className="command-item-content">
                          <span className="command-item-title">{item.title}</span>
                          {item.subtitle && (
                            <span className="command-item-subtitle">{item.subtitle}</span>
                          )}
                        </div>

                        {isSelected && (
                          <div className="command-item-enter">
                            <span>Ejecutar</span>
                            <CornerDownLeft size={13} />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })
          )}
        </div>

        {/* Footer info */}
        <div className="command-footer">
          <div className="command-footer-hints">
            <span>
              <kbd>↑</kbd> <kbd>↓</kbd> Navegar
            </span>
            <span>
              <kbd>↵</kbd> Seleccionar
            </span>
            <span>
              <kbd>ESC</kbd> Cerrar
            </span>
          </div>
          <div className="command-footer-version">
            <span>Traducción: {versions.find((v) => v.id === currentVersion)?.short_name}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
