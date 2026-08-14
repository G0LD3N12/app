import React, { useState, useEffect } from 'react';
import { StudyConceptDetail } from '../types';
import { fetchAllConcepts } from '../services/bibleService';
import { Sparkles, BookOpen, Landmark, ChevronRight } from 'lucide-react';

interface StudyCatalogViewProps {
  onSelectConcept: (slug: string) => void;
  onNavigateToPassage: (bookId: number, chapter: number) => void;
}

export const StudyCatalogView: React.FC<StudyCatalogViewProps> = React.memo(({
  onSelectConcept,
  onNavigateToPassage,
}) => {
  const [concepts, setConcepts] = useState<StudyConceptDetail[]>([]);
  const [filterCategory, setFilterCategory] = useState<'all' | 'both' | 'biblical_context' | 'historical'>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAllConcepts()
      .then((data) => {
        setConcepts(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load study concepts:', err);
        setLoading(false);
      });
  }, []);

  // Associated primary book passages for quick navigation
  const passageMap: Record<string, { bookId: number; bookName: string; chapter: number }> = {
    'anaquitas': { bookId: 6, bookName: 'Josué', chapter: 11 },
    'cordero-pascual': { bookId: 43, bookName: 'Juan', chapter: 1 },
    'arca-del-pacto': { bookId: 2, bookName: 'Éxodo', chapter: 25 },
    'melquisedec': { bookId: 1, bookName: 'Génesis', chapter: 14 },
    'logos-palabra': { bookId: 43, bookName: 'Juan', chapter: 1 },
    'serpiente-de-bronce': { bookId: 4, bookName: 'Números', chapter: 21 },
  };

  const filtered = concepts.filter(
    (c) => filterCategory === 'all' || c.concept_type === filterCategory
  );

  return (
    <div className="settings-viewport">
      <div className="settings-content-wrapper">
        <div className="settings-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Sparkles size={24} color="var(--accent-gold)" />
            <h1 className="settings-title">Catálogo de Estudio Bíblico e Histórico</h1>
          </div>
          <p className="settings-subtitle">
            Conceptos dinámicos enlazados con tipología bíblica, registros arqueológicos y manuscritos antiguos
          </p>
        </div>

        {/* Filter Pills */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
          <button
            className={`catalog-filter-btn ${filterCategory === 'all' ? 'active' : ''}`}
            onClick={() => setFilterCategory('all')}
          >
            Todos ({concepts.length})
          </button>
          <button
            className={`catalog-filter-btn ${filterCategory === 'both' ? 'active' : ''}`}
            onClick={() => setFilterCategory('both')}
          >
            Histórico & Teológico
          </button>
          <button
            className={`catalog-filter-btn ${filterCategory === 'biblical_context' ? 'active' : ''}`}
            onClick={() => setFilterCategory('biblical_context')}
          >
            Contexto Bíblico
          </button>
        </div>

        {/* Cards Grid */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
            Cargando conceptos desde la base de datos local...
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '16px' }}>
            {filtered.map((item) => {
              const passage = passageMap[item.slug] || { bookId: 1, bookName: 'Génesis', chapter: 1 };
              const hasImages = item.images && item.images.length > 0;

              return (
                <div
                  key={item.slug}
                  className="catalog-card"
                  onClick={() => onSelectConcept(item.slug)}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <span className={`concept-badge ${item.concept_type}`}>
                      {item.concept_type === 'both'
                        ? 'Histórico & Teológico'
                        : item.concept_type === 'historical'
                        ? 'Histórico'
                        : 'Contexto Bíblico'}
                    </span>
                    {hasImages && (
                      <span style={{ fontSize: '0.72rem', color: 'var(--accent-gold)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Landmark size={12} /> Galería Arqueológica
                      </span>
                    )}
                  </div>

                  <h3 className="catalog-card-title">{item.term_es}</h3>
                  <p className="catalog-card-summary">{item.short_summary}</p>

                  <div className="catalog-card-footer">
                    <button
                      className="catalog-passage-link"
                      onClick={(e) => {
                        e.stopPropagation();
                        onNavigateToPassage(passage.bookId, passage.chapter);
                      }}
                      title={`Abrir lector en ${passage.bookName} ${passage.chapter}`}
                    >
                      <BookOpen size={13} />
                      <span>{passage.bookName} {passage.chapter}</span>
                    </button>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--accent-gold)', fontSize: '0.82rem', fontWeight: '600' }}>
                      <span>Ver estudio</span>
                      <ChevronRight size={14} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
});
