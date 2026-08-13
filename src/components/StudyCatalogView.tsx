import React, { useState } from 'react';
import { Sparkles, BookOpen, Landmark, ChevronRight } from 'lucide-react';

interface StudyCatalogViewProps {
  onSelectConcept: (slug: string) => void;
  onNavigateToPassage: (bookId: number, chapter: number) => void;
}

interface CatalogEntry {
  slug: string;
  title: string;
  term_en: string;
  category: 'both' | 'biblical_context' | 'historical';
  summary: string;
  bookId: number;
  bookName: string;
  chapter: number;
  hasImages: boolean;
}

export const StudyCatalogView: React.FC<StudyCatalogViewProps> = ({
  onSelectConcept,
  onNavigateToPassage,
}) => {
  const [filterCategory, setFilterCategory] = useState<'all' | 'both' | 'biblical_context' | 'historical'>('all');

  const concepts: CatalogEntry[] = [
    {
      slug: 'anaquitas',
      title: 'Anaquitas (Hijos de Anac)',
      term_en: 'Anakim',
      category: 'both',
      summary: 'Pueblo de gran estatura que habitaba la región montañosa de Hebrón; prototipo del temor humano vencido por la fe.',
      bookId: 6,
      bookName: 'Josué',
      chapter: 11,
      hasImages: true,
    },
    {
      slug: 'cordero-pascual',
      title: 'El Cordero Pascual / Cordero de Dios',
      term_en: 'Passover Lamb',
      category: 'both',
      summary: 'El sacrificio sustitutivo central de Éxodo 12 que prefigura la redención mesiánica de Jesucristo.',
      bookId: 43,
      bookName: 'Juan',
      chapter: 1,
      hasImages: true,
    },
    {
      slug: 'arca-del-pacto',
      title: 'El Arca del Pacto y el Propiciatorio',
      term_en: 'Ark of the Covenant',
      category: 'both',
      summary: 'Cofre sagrado de madera de acacia recubierto de oro puro; trono terrenal de la presencia de Yahweh.',
      bookId: 2,
      bookName: 'Éxodo',
      chapter: 25,
      hasImages: true,
    },
    {
      slug: 'melquisedec',
      title: 'Melquisedec (Rey de Salem)',
      term_en: 'Melchizedek',
      category: 'biblical_context',
      summary: 'Rey de Salem y sacerdote del Dios Altísimo; prototipo del sacerdocio eterno y universal de Cristo.',
      bookId: 1,
      bookName: 'Génesis',
      chapter: 14,
      hasImages: false,
    },
    {
      slug: 'logos-palabra',
      title: 'El Verbo (Logos)',
      term_en: 'The Word (Logos)',
      category: 'both',
      summary: 'El Verbo eterno encarnado que revela al Padre y sostiene la creación; eco supremo de Génesis 1.',
      bookId: 43,
      bookName: 'Juan',
      chapter: 1,
      hasImages: true,
    },
    {
      slug: 'serpiente-de-bronce',
      title: 'La Serpiente de Bronce (Nejustán)',
      term_en: 'Bronze Serpent',
      category: 'both',
      summary: 'Símbolo de juicio y sanidad levantado por Moisés en el desierto; tipo de la crucifixión de Cristo.',
      bookId: 4,
      bookName: 'Números',
      chapter: 21,
      hasImages: true,
    },
  ];

  const filtered = concepts.filter(
    (c) => filterCategory === 'all' || c.category === filterCategory
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
            Conceptos enriquecidos con tipología bíblica intertextual, datos arqueológicos y registros visuales
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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '16px' }}>
          {filtered.map((item) => (
            <div
              key={item.slug}
              className="catalog-card"
              onClick={() => onSelectConcept(item.slug)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                <span className={`concept-badge ${item.category}`}>
                  {item.category === 'both'
                    ? 'Histórico & Teológico'
                    : item.category === 'historical'
                    ? 'Histórico'
                    : 'Contexto Bíblico'}
                </span>
                {item.hasImages && (
                  <span style={{ fontSize: '0.72rem', color: 'var(--accent-gold)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Landmark size={12} /> Galería Arqueológica
                  </span>
                )}
              </div>

              <h3 className="catalog-card-title">{item.title}</h3>
              <p className="catalog-card-summary">{item.summary}</p>

              <div className="catalog-card-footer">
                <button
                  className="catalog-passage-link"
                  onClick={(e) => {
                    e.stopPropagation();
                    onNavigateToPassage(item.bookId, item.chapter);
                  }}
                  title={`Abrir lector en ${item.bookName} ${item.chapter}`}
                >
                  <BookOpen size={13} />
                  <span>{item.bookName} {item.chapter}</span>
                </button>

                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--accent-gold)', fontSize: '0.82rem', fontWeight: '600' }}>
                  <span>Ver estudio</span>
                  <ChevronRight size={14} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
