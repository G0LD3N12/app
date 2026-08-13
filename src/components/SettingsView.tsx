import React, { useState } from 'react';
import { AppTheme, BibleVersion } from '../types';
import { THEME_PALETTES } from '../themeDefinitions';
import { VerbumLogo } from './VerbumLogo';
import { setWindowDecorations } from '../services/bibleService';
import { Palette, BookOpen, Database, Search, ShieldCheck, Check, Cpu, LayoutTemplate } from 'lucide-react';

interface SettingsViewProps {
  theme: AppTheme;
  onSelectTheme: (theme: AppTheme) => void;
  fontSize: number;
  onChangeFontSize: (size: number) => void;
  versions: BibleVersion[];
  currentVersion: string;
  onSelectDefaultVersion: (vId: string) => void;
  hideTopBar: boolean;
  onToggleHideTopBar: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  theme,
  onSelectTheme,
  fontSize,
  onChangeFontSize,
  versions,
  currentVersion,
  onSelectDefaultVersion,
}) => {
  const [themeFilter, setThemeFilter] = useState<'all' | 'dark' | 'light'>('all');
  const [nativeDecorations, setNativeDecorations] = useState<boolean>(() => {
    return localStorage.getItem('verbum_native_decorations') === 'true';
  });

  const activeNormalized = theme === 'dark' ? 'obsidian' : theme === 'light' ? 'white' : theme;
  const filteredThemes = THEME_PALETTES.filter(
    (t) => themeFilter === 'all' || t.category === themeFilter
  );

  const handleToggleDecorations = async () => {
    const nextVal = !nativeDecorations;
    setNativeDecorations(nextVal);
    localStorage.setItem('verbum_native_decorations', nextVal.toString());
    try {
      await setWindowDecorations(nextVal);
    } catch (e) {
      console.error('Failed to toggle window decorations:', e);
    }
  };

  return (
    <div className="settings-viewport">
      <div className="settings-content-wrapper">
        {/* Header */}
        <div className="settings-header">
          <h1 className="settings-title">Configuración</h1>
          <p className="settings-subtitle">Personaliza la lectura, temas cromáticos nativos, aceleración gráfica y versiones offline</p>
        </div>

        {/* 1. Rendimiento y Ventana */}
        <section className="settings-section">
          <div className="settings-section-header">
            <Cpu size={19} color="var(--accent-gold)" />
            <h2>Rendimiento y Ventana</h2>
          </div>

          <div className="settings-card">
            {/* Native Titlebar toggle */}
            <div className="settings-row">
              <div className="settings-label-col">
                <span className="settings-row-title">Barra de Título Nativa del Sistema (GTK)</span>
                <span className="settings-row-desc">
                  {nativeDecorations
                    ? 'La barra nativa del sistema operativo está visible arriba.'
                    : 'Modo Integrado Elegante (Barra nativa GTK oculta por defecto, controles integrados en la cabecera).'}
                </span>
              </div>

              <button
                className={`btn-select-default ${nativeDecorations ? 'active' : ''}`}
                onClick={handleToggleDecorations}
                style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <LayoutTemplate size={15} />
                <span>{nativeDecorations ? 'Ocultar Barra GTK' : 'Mostrar Barra GTK'}</span>
              </button>
            </div>

            {/* Hardware acceleration info */}
            <div className="settings-row">
              <div className="settings-label-col">
                <span className="settings-row-title">Aceleración por Hardware y GPU</span>
                <span className="settings-row-desc">
                  WebKitGTK Compositing / OpenGL activo con virtualización CSS de versículos (60+ FPS fluidos).
                </span>
              </div>

              <span
                style={{
                  fontSize: '0.75rem',
                  fontWeight: '700',
                  padding: '4px 10px',
                  borderRadius: '6px',
                  backgroundColor: 'var(--accent-gold-soft)',
                  color: 'var(--accent-gold)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                }}
              >
                <Check size={13} /> Activa por Hardware
              </span>
            </div>
          </div>
        </section>

        {/* 2. Galería de Temas Cromáticos */}
        <section className="settings-section">
          <div className="settings-section-header">
            <Palette size={19} color="var(--accent-gold)" />
            <h2>Temas y Paletas Cromáticas (100% Nativos)</h2>
          </div>

          <div className="settings-card" style={{ gap: '18px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
              <span className="settings-row-desc">
                Colores puros oficiales (OLED Pitch Black sin amarillo, Tokyo Night azul tormenta, Catppuccin, Vercel, Nord, etc.)
              </span>

              {/* Theme filter pills */}
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  className={`catalog-filter-btn ${themeFilter === 'all' ? 'active' : ''}`}
                  onClick={() => setThemeFilter('all')}
                  style={{ padding: '4px 10px', fontSize: '0.78rem' }}
                >
                  Todos ({THEME_PALETTES.length})
                </button>
                <button
                  className={`catalog-filter-btn ${themeFilter === 'dark' ? 'active' : ''}`}
                  onClick={() => setThemeFilter('dark')}
                  style={{ padding: '4px 10px', fontSize: '0.78rem' }}
                >
                  Oscuros
                </button>
                <button
                  className={`catalog-filter-btn ${themeFilter === 'light' ? 'active' : ''}`}
                  onClick={() => setThemeFilter('light')}
                  style={{ padding: '4px 10px', fontSize: '0.78rem' }}
                >
                  Claros
                </button>
              </div>
            </div>

            {/* Grid of Themes */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '14px' }}>
              {filteredThemes.map((t) => {
                const isCurrent = activeNormalized === t.id;

                return (
                  <div
                    key={t.id}
                    className={`theme-card-preview ${isCurrent ? 'active-theme' : ''}`}
                    onClick={() => onSelectTheme(t.id)}
                    style={{
                      backgroundColor: t.surfacePreview,
                      borderColor: isCurrent ? t.accentPreview : 'var(--border-subtle)',
                    }}
                  >
                    {/* Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span
                          style={{
                            width: '12px',
                            height: '12px',
                            borderRadius: '50%',
                            backgroundColor: t.accentPreview,
                            boxShadow: `0 0 8px ${t.accentPreview}`,
                          }}
                        />
                        <h3 style={{ fontSize: '0.96rem', fontWeight: '700', color: t.textPreview }}>
                          {t.name}
                        </h3>
                      </div>

                      {isCurrent ? (
                        <span
                          style={{
                            fontSize: '0.7rem',
                            fontWeight: '700',
                            padding: '2px 7px',
                            borderRadius: '6px',
                            backgroundColor: t.accentPreview,
                            color: t.bgPreview === '#ffffff' || t.accentPreview === '#ffffff' ? '#000000' : '#ffffff',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '3px',
                          }}
                        >
                          <Check size={11} /> Activo
                        </span>
                      ) : (
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                          {t.category === 'dark' ? 'Oscuro' : 'Claro'}
                        </span>
                      )}
                    </div>

                    <p style={{ fontSize: '0.8rem', color: t.textPreview, opacity: 0.82, lineHeight: '1.4', marginBottom: '12px' }}>
                      {t.description}
                    </p>

                    {/* Color Swatches */}
                    <div style={{ display: 'flex', gap: '5px', marginBottom: '10px' }}>
                      <div
                        title={`Fondo: ${t.bgPreview}`}
                        style={{ width: '22px', height: '22px', borderRadius: '5px', backgroundColor: t.bgPreview, border: '1px solid rgba(255,255,255,0.1)' }}
                      />
                      <div
                        title={`Superficie: ${t.surfacePreview}`}
                        style={{ width: '22px', height: '22px', borderRadius: '5px', backgroundColor: t.surfacePreview, border: '1px solid rgba(255,255,255,0.1)' }}
                      />
                      <div
                        title={`Acento: ${t.accentPreview}`}
                        style={{ width: '22px', height: '22px', borderRadius: '5px', backgroundColor: t.accentPreview }}
                      />
                      <div
                        title={`Texto: ${t.textPreview}`}
                        style={{ width: '22px', height: '22px', borderRadius: '5px', backgroundColor: t.textPreview }}
                      />
                    </div>

                    {/* Scripture Preview */}
                    <div
                      style={{
                        padding: '8px 12px',
                        borderRadius: '6px',
                        backgroundColor: t.bgPreview,
                        border: `1px solid ${isCurrent ? t.accentPreview : 'rgba(255,255,255,0.08)'}`,
                        fontFamily: 'var(--font-serif)',
                        fontSize: '0.82rem',
                        color: t.textPreview,
                        lineHeight: '1.45',
                      }}
                    >
                      <span style={{ color: t.accentPreview, fontWeight: 'bold', fontSize: '0.72rem', marginRight: '5px' }}>1</span>
                      «En el principio era el Verbo, y el Verbo era con Dios...»
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* 3. Tipografía y Legibilidad */}
        <section className="settings-section">
          <div className="settings-section-header">
            <BookOpen size={19} color="var(--accent-gold)" />
            <h2>Tipografía y Legibilidad</h2>
          </div>

          <div className="settings-card">
            <div className="settings-row">
              <div className="settings-label-col">
                <span className="settings-row-title">Tamaño de Texto Bíblico ({fontSize}px)</span>
                <span className="settings-row-desc">Ajusta el tamaño tipográfico de los versículos</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <input
                  type="range"
                  min="15"
                  max="26"
                  value={fontSize}
                  onChange={(e) => onChangeFontSize(parseInt(e.target.value, 10))}
                  style={{ width: '150px', accentColor: 'var(--accent-gold)', cursor: 'pointer' }}
                />
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.9rem', color: 'var(--accent-gold)', fontWeight: 'bold' }}>
                  {fontSize}px
                </span>
              </div>
            </div>

            <div className="typography-preview-box" style={{ fontSize: `${fontSize}px` }}>
              <span className="preview-label">Vista Previa Editorial:</span>
              <p style={{ fontFamily: 'var(--font-serif)', lineHeight: '1.7', color: 'var(--text-primary)' }}>
                «En el principio era el Verbo, y el Verbo era con Dios, y el Verbo era Dios. Este era en el principio con Dios.»
              </p>
            </div>
          </div>
        </section>

        {/* 4. Versiones Bíblicas Offline */}
        <section className="settings-section">
          <div className="settings-section-header">
            <BookOpen size={19} color="var(--accent-gold)" />
            <h2>Versiones Bíblicas Instaladas (100% Offline)</h2>
          </div>

          <div className="settings-card">
            {versions.map((v) => (
              <div key={v.id} className="version-setting-row">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontWeight: '700', fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                      {v.name} ({v.short_name})
                    </span>
                    <span className="version-lang-pill">{v.language.toUpperCase()}</span>
                    {currentVersion === v.id && <span className="default-version-badge">Activa por defecto</span>}
                  </div>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    Licencia: {v.license} • Empaquetado localmente en SQLite
                  </span>
                </div>

                <button
                  className={`btn-select-default ${currentVersion === v.id ? 'active' : ''}`}
                  onClick={() => onSelectDefaultVersion(v.id)}
                >
                  {currentVersion === v.id ? 'Seleccionada' : 'Establecer por defecto'}
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* 5. Motor de Búsqueda FTS5 & Lematización */}
        <section className="settings-section">
          <div className="settings-section-header">
            <Search size={19} color="var(--accent-gold)" />
            <h2>Motor de Búsqueda SQLite FTS5</h2>
          </div>

          <div className="settings-card">
            <div className="stats-grid">
              <div className="stat-box">
                <span className="stat-num">120,962</span>
                <span className="stat-desc">Versículos indexados en el equipo</span>
              </div>

              <div className="stat-box">
                <span className="stat-num">&lt; 10 ms</span>
                <span className="stat-desc">Velocidad media de consulta global</span>
              </div>

              <div className="stat-box">
                <span className="stat-num">remove_diacritics 2</span>
                <span className="stat-desc">Búsqueda insensible a tildes (ej. jose → José)</span>
              </div>

              <div className="stat-box">
                <span className="stat-num">Lematización Activa</span>
                <span className="stat-desc">Expansión de variantes (anaquitas ⇄ anaceos ⇄ anakim)</span>
              </div>
            </div>
          </div>
        </section>

        {/* 6. Sistema y Almacenamiento */}
        <section className="settings-section">
          <div className="settings-section-header">
            <Database size={19} color="var(--accent-gold)" />
            <h2>Almacenamiento Local</h2>
          </div>

          <div className="settings-card">
            <div className="settings-row">
              <div className="settings-label-col">
                <span className="settings-row-title">Base de Datos Central (`bible.db`)</span>
                <span className="settings-row-desc">Contiene textos canónicos, índice FTS5, lemas y conceptos</span>
              </div>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                ~29.7 MB (Local)
              </span>
            </div>

            <div className="settings-row">
              <div className="settings-label-col">
                <span className="settings-row-title">Galería de Imágenes de Estudio</span>
                <span className="settings-row-desc">Artefactos arqueológicos y manuscritos de dominio público</span>
              </div>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                WebP / SVG Vectorial
              </span>
            </div>
          </div>
        </section>

        {/* 7. Acerca de Verbum */}
        <section className="settings-section" style={{ marginBottom: '40px' }}>
          <div className="settings-section-header">
            <ShieldCheck size={19} color="var(--accent-gold)" />
            <h2>Acerca de Verbum</h2>
          </div>

          <div className="settings-card" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
              <div className="app-brand-logo-container">
                <VerbumLogo size={26} />
              </div>
              <div>
                <h3 style={{ fontFamily: 'var(--font-title-luxury)', fontSize: '1.2rem', color: 'var(--accent-gold)' }}>
                  VERBUM DESKTOP
                </h3>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Versión 1.0.0 (Rust 1.97 + Tauri v2)</span>
              </div>
            </div>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
              Software bíblico 100% offline para lectura profunda, búsqueda de alto rendimiento e investigación arqueológica e intertextual. Cero telemetría, cero conexión a internet en tiempo de ejecución.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
};
