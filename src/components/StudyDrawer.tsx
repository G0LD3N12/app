import React, { useState, useEffect } from 'react';
import { StudyConceptDetail } from '../types';
import { fetchConceptDetail } from '../services/bibleService';
import { X, BookOpen, Landmark, Image as ImageIcon, Sparkles, Loader2, ExternalLink } from 'lucide-react';

interface StudyDrawerProps {
  slug: string | null;
  onClose: () => void;
}

type StudyTab = 'biblical' | 'historical' | 'gallery';

export const StudyDrawer: React.FC<StudyDrawerProps> = ({ slug, onClose }) => {
  const [concept, setConcept] = useState<StudyConceptDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<StudyTab>('biblical');
  const [selectedImage, setSelectedImage] = useState<number | null>(null);

  useEffect(() => {
    if (!slug) {
      setConcept(null);
      return;
    }

    setLoading(true);
    fetchConceptDetail(slug)
      .then((data) => {
        setConcept(data);
        if (data.concept_type === 'historical' && !data.biblical_context_md) {
          setActiveTab('historical');
        } else {
          setActiveTab('biblical');
        }
      })
      .catch((err) => console.error('Failed to load concept detail:', err))
      .finally(() => setLoading(false));
  }, [slug]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && slug) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [slug, onClose]);

  if (!slug) return null;

  const renderMarkdown = (mdText?: string) => {
    if (!mdText) return <p style={{ color: 'var(--text-muted)' }}>Sin contenido disponible.</p>;

    // Simple markdown renderer for headers, bold, and list items
    const lines = mdText.split('\n');
    return (
      <div className="markdown-section">
        {lines.map((line, idx) => {
          const trimmed = line.trim();
          if (trimmed.startsWith('### ')) {
            return <h3 key={idx}>{trimmed.replace('### ', '')}</h3>;
          }
          if (trimmed.startsWith('## ')) {
            return <h3 key={idx}>{trimmed.replace('## ', '')}</h3>;
          }
          if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
            const content = trimmed.replace(/^[\*\-]\s+/, '');
            return (
              <ul key={idx}>
                <li dangerouslySetInnerHTML={{ __html: formatInlineMd(content) }} />
              </ul>
            );
          }
          if (trimmed.match(/^\d+\.\s+/)) {
            const content = trimmed.replace(/^\d+\.\s+/, '');
            return (
              <p key={idx} style={{ paddingLeft: '14px', marginBottom: '8px' }}>
                <b style={{ color: 'var(--accent-gold)' }}>{trimmed.match(/^\d+\./)?.[0]} </b>
                <span dangerouslySetInnerHTML={{ __html: formatInlineMd(content) }} />
              </p>
            );
          }
          if (trimmed === '') {
            return <div key={idx} style={{ height: '8px' }} />;
          }
          return <p key={idx} dangerouslySetInnerHTML={{ __html: formatInlineMd(trimmed) }} />;
        })}
      </div>
    );
  };

  const formatInlineMd = (text: string): string => {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')
      .replace(/\*(.*?)\*/g, '<i>$1</i>')
      .replace(/\«(.*?)\»/g, '<span style="color: var(--accent-gold); font-style: italic;">«$1»</span>');
  };

  return (
    <>
      <div className="drawer-backdrop" onClick={onClose} />
      <div className="study-drawer">
        {/* Header */}
        <div className="drawer-header">
          <div className="drawer-title-group">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sparkles size={18} color="var(--accent-gold)" />
              <h2 className="drawer-concept-title">
                {concept ? concept.term_es : 'Cargando...'}
              </h2>
            </div>

            {concept && (
              <div className="drawer-tags-row">
                {concept.term_en && (
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                    En inglés: <i>{concept.term_en}</i>
                  </span>
                )}
                <span className={`concept-badge ${concept.concept_type}`}>
                  {concept.concept_type === 'both'
                    ? 'Histórico & Teológico'
                    : concept.concept_type === 'historical'
                    ? 'Histórico'
                    : 'Contexto Bíblico'}
                </span>
                {concept.strongs_code && (
                  <span className="strongs-pill" title="Código Léxico de Concordancia Strong">
                    Strong {concept.strongs_code}
                  </span>
                )}
              </div>
            )}
          </div>

          <button className="icon-btn" onClick={onClose} title="Cerrar panel (Esc)">
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        {concept && (
          <div className="drawer-tabs">
            <button
              className={`drawer-tab-btn ${activeTab === 'biblical' ? 'active' : ''}`}
              onClick={() => setActiveTab('biblical')}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <BookOpen size={15} />
                <span>Contexto Bíblico</span>
              </div>
            </button>

            <button
              className={`drawer-tab-btn ${activeTab === 'historical' ? 'active' : ''}`}
              onClick={() => setActiveTab('historical')}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Landmark size={15} />
                <span>Contexto Histórico</span>
              </div>
            </button>

            {concept.images && concept.images.length > 0 && (
              <button
                className={`drawer-tab-btn ${activeTab === 'gallery' ? 'active' : ''}`}
                onClick={() => setActiveTab('gallery')}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <ImageIcon size={15} />
                  <span>Imágenes ({concept.images.length})</span>
                </div>
              </button>
            )}
          </div>
        )}

        {/* Body */}
        <div className="drawer-body">
          {loading && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px', gap: '10px' }}>
              <Loader2 className="brand-icon" style={{ animation: 'spin 1s linear infinite' }} />
              <span style={{ color: 'var(--text-secondary)' }}>Cargando contexto de estudio...</span>
            </div>
          )}

          {!loading && concept && (
            <>
              {/* Short Summary Callout */}
              <div className="summary-callout">
                {concept.short_summary}
              </div>

              {/* Tab Content */}
              {activeTab === 'biblical' && (
                <div>{renderMarkdown(concept.biblical_context_md)}</div>
              )}

              {activeTab === 'historical' && (
                <div>
                  {renderMarkdown(concept.historical_context_md)}
                  {/* Inline visual showcase if historical tab has images */}
                  {concept.images && concept.images.length > 0 && (
                    <div style={{ marginTop: '20px' }}>
                      <h4 style={{ fontSize: '0.85rem', color: 'var(--accent-gold)', marginBottom: '10px', textTransform: 'uppercase' }}>
                        Registro Visual Arqueológico
                      </h4>
                      {concept.images.map((img) => (
                        <div key={img.id} className="image-card" style={{ marginBottom: '14px' }}>
                          <div className="image-preview-container">
                            {img.data_content ? (
                              <div
                                style={{ width: '100%', height: '100%', display: 'flex' }}
                                dangerouslySetInnerHTML={{ __html: img.data_content }}
                              />
                            ) : (
                              <img src={img.file_path} alt={img.title} />
                            )}
                          </div>
                          <div className="image-card-meta">
                            <span className="image-card-title">{img.title}</span>
                            <span className="image-card-caption">{img.caption}</span>
                            <div className="image-card-license-row">
                              <span>{img.source_attribution}</span>
                              <span style={{ fontWeight: '600' }}>{img.license}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'gallery' && concept.images && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {concept.images.map((img, idx) => (
                    <div key={img.id} className="image-card">
                      <div
                        className="image-preview-container"
                        style={{ cursor: 'pointer' }}
                        onClick={() => setSelectedImage(idx)}
                      >
                        {img.data_content ? (
                          <div
                            style={{ width: '100%', height: '100%', display: 'flex' }}
                            dangerouslySetInnerHTML={{ __html: img.data_content }}
                          />
                        ) : (
                          <img src={img.file_path} alt={img.title} />
                        )}
                      </div>
                      <div className="image-card-meta">
                        <span className="image-card-title">{img.title}</span>
                        <span className="image-card-caption">{img.caption}</span>
                        <div className="image-card-license-row">
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <ExternalLink size={12} />
                            {img.source_attribution}
                          </span>
                          <span style={{ fontWeight: '600' }}>{img.license}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Image Zoom Lightbox Modal */}
        {selectedImage !== null && concept?.images?.[selectedImage] && (
          <div
            className="search-modal-backdrop"
            style={{ zIndex: 70 }}
            onClick={() => setSelectedImage(null)}
          >
            <div
              className="search-modal-card"
              style={{ maxWidth: '900px', backgroundColor: '#000' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', background: '#111' }}>
                <span style={{ color: '#fff', fontWeight: 'bold' }}>{concept.images[selectedImage].title}</span>
                <button className="icon-btn" onClick={() => setSelectedImage(null)}>
                  <X size={18} />
                </button>
              </div>
              <div style={{ padding: '20px', display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '350px' }}>
                {concept.images[selectedImage].data_content ? (
                  <div
                    style={{ width: '100%', maxWidth: '800px', height: '450px' }}
                    dangerouslySetInnerHTML={{ __html: concept.images[selectedImage].data_content || '' }}
                  />
                ) : (
                  <img src={concept.images[selectedImage].file_path} alt="" style={{ maxWidth: '100%', maxHeight: '500px' }} />
                )}
              </div>
              <div style={{ padding: '12px 16px', background: '#111', color: '#bbb', fontSize: '0.85rem' }}>
                {concept.images[selectedImage].caption} • {concept.images[selectedImage].source_attribution} ({concept.images[selectedImage].license})
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};
