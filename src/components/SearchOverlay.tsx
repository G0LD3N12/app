import React, { useState, useEffect, useRef } from 'react';
import { SearchHit, BibleVersion } from '../types';
import { searchBible } from '../services/bibleService';
import { Search, X, Loader2 } from 'lucide-react';

interface SearchOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  versions: BibleVersion[];
  onSelectHit: (bookId: number, chapter: number, verse: number, versionId: string) => void;
}

export const SearchOverlay: React.FC<SearchOverlayProps> = ({
  isOpen,
  onClose,
  versions,
  onSelectHit,
}) => {
  const [query, setQuery] = useState('');
  const [selectedVersions, setSelectedVersions] = useState<string[]>(['rv1909', 'vbl']);
  const [results, setResults] = useState<SearchHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
      setResults([]);
    }
  }, [isOpen]);

  // Execute search with debounce
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const hits = await searchBible(query, selectedVersions, 80);
        setResults(hits);
        setSelectedIndex(0);
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setLoading(false);
      }
    }, 80);

    return () => clearTimeout(timer);
  }, [query, selectedVersions]);

  // Keyboard navigation inside search
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < results.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === 'Enter' && results[selectedIndex]) {
      e.preventDefault();
      const hit = results[selectedIndex];
      onSelectHit(hit.book_id, hit.chapter, hit.verse, hit.version_id);
      onClose();
    }
  };

  const toggleVersion = (vId: string) => {
    setSelectedVersions((prev) =>
      prev.includes(vId) ? (prev.length > 1 ? prev.filter((id) => id !== vId) : prev) : [...prev, vId]
    );
  };

  if (!isOpen) return null;

  return (
    <div className="search-modal-backdrop" onClick={onClose} onKeyDown={handleKeyDown}>
      <div className="search-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Search header */}
        <div className="search-input-header">
          {loading ? (
            <Loader2 size={20} className="brand-icon" style={{ animation: 'spin 1s linear infinite' }} />
          ) : (
            <Search size={20} color="var(--accent-gold)" />
          )}
          <input
            ref={inputRef}
            type="text"
            className="search-input-main"
            placeholder="Buscar en toda la Escritura (ej. anaquitas, cordero, fe esperanza)..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query && (
            <button className="icon-btn" onClick={() => setQuery('')}>
              <X size={16} />
            </button>
          )}
          <button className="icon-btn" onClick={onClose} title="Cerrar (Esc)">
            <span className="kbd-shortcut">ESC</span>
          </button>
        </div>

        {/* Filter bar */}
        <div className="search-filter-bar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>Versiones activas:</span>
            {versions.map((v) => {
              const active = selectedVersions.includes(v.id);
              return (
                <button
                  key={v.id}
                  onClick={() => toggleVersion(v.id)}
                  style={{
                    padding: '3px 8px',
                    borderRadius: '4px',
                    fontSize: '0.75rem',
                    fontWeight: '600',
                    backgroundColor: active ? 'var(--accent-gold-soft)' : 'var(--bg-surface)',
                    color: active ? 'var(--accent-gold)' : 'var(--text-muted)',
                    border: active ? '1px solid var(--accent-gold)' : '1px solid var(--border-subtle)',
                    cursor: 'pointer',
                  }}
                >
                  {v.short_name}
                </button>
              );
            })}
          </div>

          <div>
            {query.trim() && (
              <span>
                {results.length} {results.length === 1 ? 'coincidencia' : 'coincidencias'}
              </span>
            )}
          </div>
        </div>

        {/* Results */}
        <div className="search-results-list">
          {results.map((hit, idx) => (
            <div
              key={`${hit.version_id}-${hit.book_id}-${hit.chapter}-${hit.verse}-${idx}`}
              className="search-result-item"
              style={{
                borderColor: selectedIndex === idx ? 'var(--accent-gold)' : 'transparent',
                backgroundColor: selectedIndex === idx ? 'var(--accent-gold-soft)' : undefined,
              }}
              onClick={() => {
                onSelectHit(hit.book_id, hit.chapter, hit.verse, hit.version_id);
                onClose();
              }}
              onMouseEnter={() => setSelectedIndex(idx)}
            >
              <div className="search-result-ref-row">
                <span>
                  {hit.book_name} {hit.chapter}:{hit.verse}
                </span>
                <span
                  style={{
                    fontSize: '0.72rem',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    backgroundColor: 'var(--bg-app)',
                    color: 'var(--text-secondary)',
                    fontFamily: 'var(--font-mono)',
                  }}
                >
                  {hit.version_short_name}
                </span>
              </div>
              <div
                className="search-result-snippet"
                dangerouslySetInnerHTML={{ __html: hit.snippet }}
              />
            </div>
          ))}

          {!loading && query.trim() && results.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
              No se encontraron coincidencias para "{query}" en las versiones seleccionadas.
            </div>
          )}

          {!query.trim() && (
            <div style={{ textAlign: 'center', padding: '36px 20px', color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
              <p style={{ fontWeight: '600', marginBottom: '6px', color: 'var(--text-primary)' }}>
                Búsqueda Rápida e Inteligente Offline
              </p>
              <p>
                Prueba buscar <b>anaquitas</b> (encuentra <i>anaceos, anakim, Anac</i>), <b>"cordero de Dios"</b>, o palabras sin acentos como <b>jose</b>.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
