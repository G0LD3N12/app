import React, { useState, useEffect, useCallback } from 'react';
import {
  StudyConceptDetail,
  StudyExegesisResult,
  SelectionStudyRequest,
  AIProviderConfig,
} from '../types';
import { fetchConceptDetail, analyzeSelectionAI } from '../services/bibleService';
import {
  X,
  BookOpen,
  Landmark,
  Image as ImageIcon,
  Sparkles,
  Loader2,
  ArrowRight,
  ShieldCheck,
  Cpu,
  Info,
  AlertCircle,
  RefreshCw,
  Volume2,
} from 'lucide-react';
import { useAudioManager } from '../context/AudioManagerContext';

interface StudyDrawerProps {
  slug: string | null;
  aiRequest: SelectionStudyRequest | null;
  aiConfig: AIProviderConfig;
  onClose: () => void;
  onOpenDeepStudy: (result: StudyExegesisResult) => void;
  onNavigateToPassage: (bookName: string, chapter: number, verse: number) => void;
}

export const StudyDrawer: React.FC<StudyDrawerProps> = React.memo(({
  slug,
  aiRequest,
  aiConfig,
  onClose,
  onOpenDeepStudy,
  onNavigateToPassage,
}) => {
  const [concept, setConcept] = useState<StudyConceptDetail | null>(null);
  const [aiResult, setAiResult] = useState<StudyExegesisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<number | null>(null);
  const { playStudyExplanation } = useAudioManager();

  const handleListenExegesis = useCallback(() => {
    if (aiResult) {
      const parts = [
        aiResult.summary,
        aiResult.biblical_context ? `Contexto bíblico: ${aiResult.biblical_context}` : '',
        aiResult.historical_cultural_context ? `Trasfondo histórico: ${aiResult.historical_cultural_context}` : '',
        aiResult.linguistic_context ? `Léxico y traducción: ${aiResult.linguistic_context}` : '',
      ].filter(Boolean);
      playStudyExplanation(parts.join('. '), aiRequest?.selected_text || aiResult.title || 'Exégesis IA');
    } else if (concept) {
      const parts = [
        concept.term_es,
        concept.short_summary,
        concept.biblical_context_md,
        concept.historical_context_md,
      ].filter(Boolean);
      playStudyExplanation(parts.join('. '), concept.term_es);
    }
  }, [aiResult, concept, aiRequest, playStudyExplanation]);

  const loadAIAnalysis = useCallback(() => {
    if (!aiRequest) return;
    setLoading(true);
    setError(null);
    setConcept(null);
    analyzeSelectionAI(aiRequest, aiConfig)
      .then((data) => {
        setAiResult(data);
        setError(null);
      })
      .catch((err) => {
        console.error('Failed to execute AI analysis:', err);
        setError(String(err));
      })
      .finally(() => setLoading(false));
  }, [aiRequest, aiConfig]);

  // 1. If static slug is passed, load curated concept detail
  useEffect(() => {
    if (slug) {
      setLoading(true);
      setError(null);
      setAiResult(null);
      fetchConceptDetail(slug)
        .then((data) => {
          setConcept(data);
          setError(null);
        })
        .catch((err) => {
          console.error('Failed to load concept detail:', err);
          setError(String(err));
        })
        .finally(() => setLoading(false));
    }
  }, [slug]);

  // 2. If dynamic AI request is passed, execute context-aware exegesis
  useEffect(() => {
    if (aiRequest) {
      loadAIAnalysis();
    }
  }, [aiRequest, loadAIAnalysis]);

  // Escape key listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && (slug || aiRequest)) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [slug, aiRequest, onClose]);

  if (!slug && !aiRequest) return null;

  const headerTitle = aiResult
    ? aiResult.title
    : concept
    ? concept.term_es
    : aiRequest
    ? `«${aiRequest.selected_text}»`
    : 'Estudio de Contexto';

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
                {headerTitle}
              </h2>
            </div>

            {/* Badges and Provider Info */}
            {aiResult && (
              <div className="drawer-tags-row">
                <span className="concept-badge both">
                  {aiResult.selection_type.toUpperCase()}
                </span>
                <span className="ai-provider-pill" title={`Motor: ${aiResult.model_used}`}>
                  {aiResult.is_heuristic_offline ? (
                    <>
                      <Info size={11} /> Evidencia Local
                    </>
                  ) : (
                    <>
                      <Cpu size={11} /> {aiResult.provider_used} ({aiResult.model_used})
                    </>
                  )}
                </span>
              </div>
            )}

            {concept && (
              <div className="drawer-tags-row">
                <span className={`concept-badge ${concept.concept_type}`}>
                  {concept.concept_type === 'both'
                    ? 'Histórico & Teológico'
                    : concept.concept_type === 'historical'
                    ? 'Histórico'
                    : 'Contexto Bíblico'}
                </span>
                {concept.strongs_code && (
                  <span className="strongs-pill">Strong {concept.strongs_code}</span>
                )}
              </div>
            )}
          </div>

          <button className="icon-btn" onClick={onClose} title="Cerrar panel (Esc)">
            <X size={20} />
          </button>
        </div>

        {/* Adaptive Body Content */}
        <div className="drawer-body">
          {loading && (
            <div className="drawer-loading-box">
              <Loader2 className="brand-icon spin-anim" size={26} />
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                Recopilando evidencia canónica y consultando modelo...
              </span>
            </div>
          )}

          {/* Error State with Retry Button */}
          {!loading && error && !aiResult && (
            <div className="drawer-flow-content" style={{ textAlign: 'center', padding: '24px 12px' }}>
              <div style={{ color: 'var(--accent-gold)', marginBottom: '12px' }}>
                <AlertCircle size={32} style={{ margin: '0 auto' }} />
              </div>
              <h3 style={{ margin: '0 0 8px 0', fontSize: '1rem', color: 'var(--text-primary)' }}>
                No se pudo completar el análisis
              </h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0 0 18px 0', wordBreak: 'break-word' }}>
                {error}
              </p>
              <button
                className="btn-select-default active"
                onClick={loadAIAnalysis}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', margin: '0 auto' }}
              >
                <RefreshCw size={14} />
                <span>Reintentar</span>
              </button>
            </div>
          )}

          {/* Render Dynamic AI Exegesis Result */}
          {!loading && aiResult && (
            <div className="drawer-flow-content">
              {/* Listen Action Bar */}
              <div className="drawer-audio-action-row">
                <button
                  className="btn-listen-drawer"
                  onClick={handleListenExegesis}
                  title="Escuchar explicación con voz"
                >
                  <Volume2 size={13} />
                  <span>Escuchar explicación</span>
                </button>
              </div>

              {/* Executive Summary Callout */}
              <div className="summary-callout">
                <p style={{ margin: 0 }}>{aiResult.summary}</p>
              </div>

              {/* Biblical Context Section */}
              <div className="drawer-section-block">
                <div className="drawer-section-heading">
                  <BookOpen size={15} />
                  <span>Contexto Bíblico & Literario</span>
                </div>
                <p className="drawer-section-text">{aiResult.biblical_context}</p>
              </div>

              {/* Historical Context (if present) */}
              {aiResult.historical_cultural_context && (
                <div className="drawer-section-block">
                  <div className="drawer-section-heading">
                    <Landmark size={15} />
                    <span>Trasfondo Histórico & Cultural</span>
                  </div>
                  <p className="drawer-section-text">{aiResult.historical_cultural_context}</p>
                </div>
              )}

              {/* Linguistic & Lexical Context (if present) */}
              {(aiResult.linguistic_context || aiResult.translation_nuance) && (
                <div className="drawer-section-block">
                  <div className="drawer-section-heading">
                    <Sparkles size={15} />
                    <span>Léxico & Matices de Traducción</span>
                  </div>
                  {aiResult.linguistic_context && (
                    <p className="drawer-section-text">{aiResult.linguistic_context}</p>
                  )}
                  {aiResult.translation_nuance && (
                    <p className="drawer-section-text" style={{ fontStyle: 'italic', color: 'var(--text-secondary)' }}>
                      {aiResult.translation_nuance}
                    </p>
                  )}
                </div>
              )}

              {/* Interpretive Notes (Clearly distinguishes fact from tradition) */}
              {aiResult.interpretive_notes && aiResult.interpretive_notes.length > 0 && (
                <div className="drawer-section-block">
                  <div className="drawer-section-heading">
                    <ShieldCheck size={15} />
                    <span>Observaciones & Notas de Interpretación</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {aiResult.interpretive_notes.map((note, idx) => (
                      <div key={idx} className={`interpretive-note-card ${note.note_type}`}>
                        <span className="note-type-tag">
                          {note.note_type === 'observacion_textual'
                            ? 'Observación Textual'
                            : note.note_type === 'inferencia_teologica'
                            ? 'Inferencia Teológica'
                            : 'Tradición Interpretativa'}
                        </span>
                        <p style={{ margin: 0, fontSize: '0.85rem' }}>{note.text}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Related Passages */}
              {aiResult.related_passages && aiResult.related_passages.length > 0 && (
                <div className="drawer-section-block">
                  <div className="drawer-section-heading">
                    <BookOpen size={15} />
                    <span>Pasajes Relacionados</span>
                  </div>
                  <div className="drawer-passages-list">
                    {aiResult.related_passages.map((rp, idx) => (
                      <div
                        key={idx}
                        className="drawer-passage-item"
                        onClick={() => onNavigateToPassage(rp.book_name, rp.chapter, rp.verse)}
                        title={`Ir a ${rp.book_name} ${rp.chapter}:${rp.verse}`}
                      >
                        <span className="passage-item-ref">
                          {rp.book_name} {rp.chapter}:{rp.verse}
                        </span>
                        {rp.quote && <span className="passage-item-quote">«{rp.quote}»</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Archaeological Images Gallery (Only if media matched) */}
              {aiResult.images && aiResult.images.length > 0 && (
                <div className="drawer-section-block">
                  <div className="drawer-section-heading">
                    <ImageIcon size={15} />
                    <span>Registro Visual Arqueológico ({aiResult.images.length})</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {aiResult.images.map((img, idx) => (
                      <div key={img.id} className="image-card" onClick={() => setSelectedImage(idx)} style={{ cursor: 'pointer' }}>
                        <div className="image-preview-container">
                          {img.data_content ? (
                            <div style={{ width: '100%', height: '100%' }} dangerouslySetInnerHTML={{ __html: img.data_content }} />
                          ) : (
                            <img src={img.file_path} alt={img.title} />
                          )}
                        </div>
                        <div className="image-card-meta">
                          <span className="image-card-title">{img.title}</span>
                          <span className="image-card-caption">{img.caption}</span>
                          <div className="image-card-license-row">
                            <span>{img.source_attribution}</span>
                            <span>{img.license}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Call to Action: Open Deep Study Page */}
              <div className="drawer-cta-section">
                <button
                  className="btn-open-deep-study"
                  onClick={() => {
                    onOpenDeepStudy(aiResult);
                    onClose();
                  }}
                  title="Abrir vista de estudio exhaustivo a pantalla completa"
                >
                  <span>Abrir estudio completo</span>
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* Render Curated Static Concept (Fallback/Catalogue click) */}
          {!loading && concept && (
            <div className="drawer-flow-content">
              <div className="summary-callout">
                <p style={{ margin: 0 }}>{concept.short_summary}</p>
              </div>

              {concept.biblical_context_md && (
                <div className="drawer-section-block">
                  <div className="drawer-section-heading">
                    <BookOpen size={15} />
                    <span>Contexto Bíblico</span>
                  </div>
                  <div className="markdown-section" dangerouslySetInnerHTML={{ __html: concept.biblical_context_md.replace(/\n/g, '<br/>') }} />
                </div>
              )}

              {concept.historical_context_md && (
                <div className="drawer-section-block">
                  <div className="drawer-section-heading">
                    <Landmark size={15} />
                    <span>Contexto Histórico</span>
                  </div>
                  <div className="markdown-section" dangerouslySetInnerHTML={{ __html: concept.historical_context_md.replace(/\n/g, '<br/>') }} />
                </div>
              )}

              {concept.images && concept.images.length > 0 && (
                <div className="drawer-section-block">
                  <div className="drawer-section-heading">
                    <ImageIcon size={15} />
                    <span>Evidencia Visual ({concept.images.length})</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {concept.images.map((img, idx) => (
                      <div key={img.id} className="image-card" onClick={() => setSelectedImage(idx)} style={{ cursor: 'pointer' }}>
                        <div className="image-preview-container">
                          {img.data_content ? (
                            <div style={{ width: '100%', height: '100%' }} dangerouslySetInnerHTML={{ __html: img.data_content }} />
                          ) : (
                            <img src={img.file_path} alt={img.title} />
                          )}
                        </div>
                        <div className="image-card-meta">
                          <span className="image-card-title">{img.title}</span>
                          <span className="image-card-caption">{img.caption}</span>
                          <div className="image-card-license-row">
                            <span>{img.source_attribution}</span>
                            <span>{img.license}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Lightbox for Images */}
      {selectedImage !== null && ((aiResult && aiResult.images) || (concept && concept.images)) && (
        <div className="image-modal-backdrop" onClick={() => setSelectedImage(null)}>
          <div className="image-modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="icon-btn close-modal-btn" onClick={() => setSelectedImage(null)}>
              <X size={22} />
            </button>
            {(() => {
              const currentImgList = (aiResult && aiResult.images.length > 0) ? aiResult.images : (concept?.images || []);
              const activeImg = currentImgList[selectedImage];
              if (!activeImg) return null;
              return (
                <div className="modal-inner">
                  {activeImg.data_content ? (
                    <div className="modal-svg-wrapper" dangerouslySetInnerHTML={{ __html: activeImg.data_content }} />
                  ) : (
                    <img src={activeImg.file_path} alt={activeImg.title} className="modal-img-full" />
                  )}
                  <div className="modal-caption-box">
                    <div className="modal-caption-title">{activeImg.title}</div>
                    <div className="modal-caption-text">{activeImg.caption}</div>
                    <div className="modal-caption-footer">
                      <span>Fuente: {activeImg.source_attribution}</span>
                      <span>Licencia: {activeImg.license}</span>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </>
  );
});
