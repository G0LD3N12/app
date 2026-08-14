import React, { useState } from 'react';
import {
  StudyExegesisResult,
  SelectionStudyRequest,
  AIProviderConfig,
} from '../types';
import { analyzeSelectionAI } from '../services/bibleService';
import {
  ArrowLeft,
  BookOpen,
  Landmark,
  ShieldCheck,
  Image as ImageIcon,
  Copy,
  Check,
  Sparkles,
  Loader2,
  ExternalLink,
  Cpu,
  Info,
  X,
} from 'lucide-react';

interface DeepStudyViewProps {
  initialResult: StudyExegesisResult;
  aiRequest: SelectionStudyRequest | null;
  aiConfig: AIProviderConfig;
  onBackToReader: () => void;
  onNavigateToPassage: (bookName: string, chapter: number, verse: number) => void;
}

export const DeepStudyView: React.FC<DeepStudyViewProps> = ({
  initialResult,
  aiRequest,
  aiConfig,
  onBackToReader,
  onNavigateToPassage,
}) => {
  const [result, setResult] = useState<StudyExegesisResult>(initialResult);
  const [isExpanding, setIsExpanding] = useState(false);
  const [copied, setCopied] = useState(false);
  const [selectedImage, setSelectedImage] = useState<number | null>(null);

  // Re-run exegesis in DEEP mode if current result was quick
  const handleDeepExegesis = async () => {
    if (!aiRequest) return;
    setIsExpanding(true);
    try {
      const deepReq: SelectionStudyRequest = {
        ...aiRequest,
        depth: 'deep',
      };
      const data = await analyzeSelectionAI(deepReq, aiConfig);
      setResult(data);
    } catch (err) {
      console.error('Failed to run deep exegesis:', err);
    } finally {
      setIsExpanding(false);
    }
  };

  const handleCopyStudy = () => {
    let md = `# Estudio Exegético: ${result.title}\n\n`;
    md += `**Resumen:** ${result.summary}\n\n`;
    md += `## Contexto Bíblico\n${result.biblical_context}\n\n`;
    if (result.historical_cultural_context) {
      md += `## Contexto Histórico & Cultural\n${result.historical_cultural_context}\n\n`;
    }
    if (result.linguistic_context) {
      md += `## Nota Lingüística\n${result.linguistic_context}\n\n`;
    }
    if (result.interpretive_notes.length > 0) {
      md += `## Observaciones & Notas\n`;
      result.interpretive_notes.forEach((n) => {
        md += `- [${n.note_type}] ${n.text}\n`;
      });
      md += `\n`;
    }
    navigator.clipboard.writeText(md);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="deep-study-viewport">
      <div className="deep-study-container">
        {/* Top Breadcrumb & Action Bar */}
        <header className="deep-study-header">
          <button className="deep-study-back-btn" onClick={onBackToReader} title="Volver al lector bíblico">
            <ArrowLeft size={16} />
            <span>Volver a la Lectura</span>
          </button>

          <div className="deep-study-header-actions">
            {result.depth === 'quick' && aiRequest && (
              <button
                className="deep-study-expand-btn"
                onClick={handleDeepExegesis}
                disabled={isExpanding}
                title="Generar exégesis académica completa (600–1000 palabras)"
              >
                {isExpanding ? <Loader2 size={14} className="spin-anim" /> : <Sparkles size={14} />}
                <span>{isExpanding ? 'Generando análisis profundo...' : 'Profundizar al Máximo (Modo Exhaustivo)'}</span>
              </button>
            )}

            <button className="icon-btn" onClick={handleCopyStudy} title="Copiar estudio en formato Markdown">
              {copied ? <Check size={16} color="#22c55e" /> : <Copy size={16} />}
            </button>
          </div>
        </header>

        {/* Hero Title & Metas */}
        <section className="deep-study-hero">
          <div className="deep-study-meta-badges">
            <span className="concept-badge both">{result.selection_type.toUpperCase()}</span>
            <span className="ai-provider-pill">
              {result.is_heuristic_offline ? (
                <>
                  <Info size={12} /> Evidencia Canónica Local
                </>
              ) : (
                <>
                  <Cpu size={12} /> {result.provider_used} ({result.model_used})
                </>
              )}
            </span>
            <span className="depth-badge">{result.depth === 'deep' ? 'ESTUDIO EXHAUSTIVO' : 'ESTUDIO RÁPIDO'}</span>
          </div>

          <h1 className="deep-study-title">{result.title}</h1>
        </section>

        {/* Executive Summary Card */}
        <section className="deep-study-summary-card">
          <h3 className="section-minor-heading">PROPOSICIÓN & RESUMEN EXEGÉTICO</h3>
          <p className="summary-card-text">{result.summary}</p>
        </section>

        {/* Main Content Multi-Section Flow */}
        <div className="deep-study-sections-grid">
          {/* 1. Contexto Bíblico y Literario */}
          <article className="deep-study-card">
            <div className="card-header-row">
              <BookOpen size={18} color="var(--accent-gold)" />
              <h2>Contexto Bíblico & Estructura Literaria</h2>
            </div>
            <div className="card-body-text">{result.biblical_context}</div>
          </article>

          {/* 2. Contexto Histórico y Arqueológico */}
          {result.historical_cultural_context && (
            <article className="deep-study-card">
              <div className="card-header-row">
                <Landmark size={18} color="var(--accent-gold)" />
                <h2>Trasfondo Histórico, Cultural & Arqueológico</h2>
              </div>
              <div className="card-body-text">{result.historical_cultural_context}</div>
            </article>
          )}

          {/* 3. Léxico y Matices de Traducción */}
          {(result.linguistic_context || result.translation_nuance) && (
            <article className="deep-study-card">
              <div className="card-header-row">
                <span style={{ fontFamily: 'var(--font-serif)', fontSize: '1.1rem', fontWeight: 'bold', color: 'var(--accent-gold)' }}>
                  א/Ω
                </span>
                <h2>Análisis Léxico & Cotejo de Traducciones</h2>
              </div>
              {result.linguistic_context && <div className="card-body-text">{result.linguistic_context}</div>}
              {result.translation_nuance && (
                <div className="card-body-text" style={{ marginTop: '12px', fontStyle: 'italic', color: 'var(--text-secondary)' }}>
                  {result.translation_nuance}
                </div>
              )}
            </article>
          )}

          {/* 4. Observaciones Textuales y Tradición Interpretativa */}
          {result.interpretive_notes && result.interpretive_notes.length > 0 && (
            <article className="deep-study-card">
              <div className="card-header-row">
                <ShieldCheck size={18} color="var(--accent-gold)" />
                <h2>Observaciones Textuales & Tradición Teológica</h2>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {result.interpretive_notes.map((note, idx) => (
                  <div key={idx} className={`interpretive-note-card ${note.note_type}`}>
                    <span className="note-type-tag">
                      {note.note_type === 'observacion_textual'
                        ? 'Observación Textual'
                        : note.note_type === 'inferencia_teologica'
                        ? 'Inferencia Teológica'
                        : 'Tradición Interpretativa'}
                    </span>
                    <p style={{ margin: 0, fontSize: '0.9rem' }}>{note.text}</p>
                  </div>
                ))}
              </div>
            </article>
          )}

          {/* 5. Referencias Cruzadas e Intertextualidad */}
          {result.related_passages && result.related_passages.length > 0 && (
            <article className="deep-study-card">
              <div className="card-header-row">
                <BookOpen size={18} color="var(--accent-gold)" />
                <h2>Pasajes Paralelos & Referencias Cruzadas</h2>
              </div>
              <div className="deep-study-passages-grid">
                {result.related_passages.map((rp, idx) => (
                  <div
                    key={idx}
                    className="deep-study-passage-card"
                    onClick={() => onNavigateToPassage(rp.book_name, rp.chapter, rp.verse)}
                    title={`Abrir lector en ${rp.book_name} ${rp.chapter}:${rp.verse}`}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span className="passage-ref-badge">
                        {rp.book_name} {rp.chapter}:{rp.verse}
                      </span>
                      <ExternalLink size={13} color="var(--accent-gold)" />
                    </div>
                    {rp.quote && <p className="passage-quote-text">«{rp.quote}»</p>}
                  </div>
                ))}
              </div>
            </article>
          )}

          {/* 6. Galería Arqueológica y Manuscritos */}
          {result.images && result.images.length > 0 && (
            <article className="deep-study-card">
              <div className="card-header-row">
                <ImageIcon size={18} color="var(--accent-gold)" />
                <h2>Registro Visual & Evidencia Arqueológica ({result.images.length})</h2>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
                {result.images.map((img, idx) => (
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
            </article>
          )}
        </div>
      </div>

      {/* Lightbox Modal */}
      {selectedImage !== null && result.images?.[selectedImage] && (
        <div className="search-modal-backdrop" style={{ zIndex: 80 }} onClick={() => setSelectedImage(null)}>
          <div className="search-modal-card" style={{ maxWidth: '900px', backgroundColor: '#000' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', background: '#111' }}>
              <span style={{ color: '#fff', fontWeight: 'bold' }}>{result.images[selectedImage].title}</span>
              <button className="icon-btn" onClick={() => setSelectedImage(null)}>
                <X size={18} />
              </button>
            </div>
            <div style={{ padding: '20px', display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '350px' }}>
              {result.images[selectedImage].data_content ? (
                <div
                  style={{ width: '100%', maxWidth: '800px', height: '450px' }}
                  dangerouslySetInnerHTML={{ __html: result.images[selectedImage].data_content || '' }}
                />
              ) : (
                <img src={result.images[selectedImage].file_path} alt="" style={{ maxWidth: '100%', maxHeight: '500px' }} />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
