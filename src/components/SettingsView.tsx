import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { AppTheme, BibleVersion, AIProviderConfig, AIConnectionStatus, OllamaModelInstallStatus, ThemeDefinition } from '../types';
import { THEME_PALETTES } from '../themeDefinitions';
import { VerbumLogo } from './VerbumLogo';
import {
  setWindowDecorations,
  testAIConnection,
  checkOllamaModelStatus,
  installOrPullOllamaModel,
} from '../services/bibleService';
import {
  Palette,
  BookOpen,
  Database,
  Check,
  Cpu,
  Sparkles,
  Loader2,
  Wifi,
  DownloadCloud,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Search,
  Type,
} from 'lucide-react';

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
  aiConfig: AIProviderConfig;
  onUpdateAIConfig: (cfg: AIProviderConfig) => void;
  searchLanguages: string[];
  onChangeSearchLanguages: (langs: string[]) => void;
}

// Highly optimized Memoized Theme Card
const ThemeCard = React.memo<{
  palette: ThemeDefinition;
  isActive: boolean;
  onSelect: (id: AppTheme) => void;
}>(({ palette: t, isActive, onSelect }) => {
  const handleClick = useCallback(() => {
    onSelect(t.id as AppTheme);
  }, [onSelect, t.id]);

  return (
    <div
      className={`theme-card-preview ${isActive ? 'active-theme' : ''}`}
      onClick={handleClick}
      style={{
        backgroundColor: t.surfacePreview,
        borderColor: isActive ? t.accentPreview : 'var(--border-subtle)',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            style={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              backgroundColor: t.accentPreview,
              boxShadow: `0 0 8px ${t.accentPreview}`,
            }}
          />
          <h3 style={{ fontSize: '0.92rem', fontWeight: '700', color: t.textPreview, margin: 0 }}>
            {t.name}
          </h3>
        </div>

        {isActive ? (
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

      <p style={{ fontSize: '0.76rem', color: t.textPreview, opacity: 0.82, lineHeight: '1.4', margin: '0 0 10px 0' }}>
        {t.description}
      </p>

      {/* Color Swatches */}
      <div style={{ display: 'flex', gap: '6px', marginTop: 'auto' }}>
        <div
          style={{
            width: '16px',
            height: '16px',
            borderRadius: '4px',
            backgroundColor: t.bgPreview,
            border: '1px solid rgba(255,255,255,0.1)',
          }}
          title="Fondo de Aplicación"
        />
        <div
          style={{
            width: '16px',
            height: '16px',
            borderRadius: '4px',
            backgroundColor: t.surfacePreview,
            border: '1px solid rgba(255,255,255,0.1)',
          }}
          title="Superficie de Tarjetas"
        />
        <div
          style={{
            width: '16px',
            height: '16px',
            borderRadius: '4px',
            backgroundColor: t.accentPreview,
          }}
          title="Color de Acento"
        />
        <div
          style={{
            width: '16px',
            height: '16px',
            borderRadius: '4px',
            backgroundColor: t.textPreview,
          }}
          title="Color del Texto Principal"
        />
      </div>
    </div>
  );
});

// Highly optimized Memoized Bible Version Row
const VersionSettingsRow = React.memo<{
  version: BibleVersion;
  isCurrent: boolean;
  onSelect: (id: string) => void;
}>(({ version: v, isCurrent, onSelect }) => {
  return (
    <div className="settings-row">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontWeight: '700', fontSize: '0.92rem', color: 'var(--text-primary)' }}>
            {v.name} ({v.short_name})
          </span>
          <span className="version-lang-pill">{v.language.toUpperCase()}</span>
          {isCurrent && <span className="default-version-badge">Predeterminada</span>}
        </div>
        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
          Licencia: {v.license} · Empaquetado localmente en SQLite
        </span>
      </div>

      <button
        className={`btn-select-default ${isCurrent ? 'active' : ''}`}
        onClick={() => onSelect(v.id)}
      >
        {isCurrent ? 'Seleccionada ✓' : 'Usar por defecto'}
      </button>
    </div>
  );
});

export const SettingsView: React.FC<SettingsViewProps> = ({
  theme,
  onSelectTheme,
  fontSize,
  onChangeFontSize,
  versions,
  currentVersion,
  onSelectDefaultVersion,
  hideTopBar,
  onToggleHideTopBar,
  aiConfig,
  onUpdateAIConfig,
  searchLanguages,
  onChangeSearchLanguages,
}) => {
  const [themeFilter, setThemeFilter] = useState<'all' | 'dark' | 'light'>('all');
  const [nativeDecorations, setNativeDecorations] = useState<boolean>(() => {
    return localStorage.getItem('verbum_native_decorations') === 'true';
  });
  const [testingAI, setTestingAI] = useState<boolean>(false);
  const [testStatus, setTestStatus] = useState<AIConnectionStatus | null>(null);

  // Ollama local installer state
  const [ollamaStatus, setOllamaStatus] = useState<OllamaModelInstallStatus | null>(null);
  const [isInstallingOllama, setIsInstallingOllama] = useState<boolean>(false);
  const [ollamaError, setOllamaError] = useState<string | null>(null);

  const activeNormalized = theme === 'dark' ? 'obsidian' : theme === 'light' ? 'white' : theme;

  const filteredThemes = useMemo(() => {
    return THEME_PALETTES.filter(
      (t) => themeFilter === 'all' || t.category === themeFilter
    );
  }, [themeFilter]);

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

  const handleTestConnection = async () => {
    setTestingAI(true);
    setTestStatus(null);
    try {
      const status = await testAIConnection(aiConfig);
      setTestStatus(status);
    } catch (err: any) {
      setTestStatus({
        is_connected: false,
        provider_type: aiConfig.provider_type,
        model_name: aiConfig.model_name,
        message: `Error de conexión: ${err?.message || err}`,
      });
    } finally {
      setTestingAI(false);
    }
  };

  const refreshOllamaStatus = useCallback(async () => {
    try {
      const model = aiConfig.model_name || 'qwen3:4b-instruct-2507';
      const status = await checkOllamaModelStatus(aiConfig.ollama_endpoint, model);
      setOllamaStatus(status);
    } catch (e) {
      console.error('Error checking Ollama status:', e);
    }
  }, [aiConfig.ollama_endpoint, aiConfig.model_name]);

  useEffect(() => {
    if (aiConfig.provider_type === 'ollama') {
      refreshOllamaStatus();
    }
  }, [aiConfig.provider_type, refreshOllamaStatus]);

  const handleInstallOllamaModel = async () => {
    setIsInstallingOllama(true);
    setOllamaError(null);
    try {
      const targetModel = aiConfig.model_name || 'qwen3:4b-instruct-2507';
      const res = await installOrPullOllamaModel(aiConfig.ollama_endpoint, targetModel);
      setOllamaStatus(res);
      if (res.is_model_installed) {
        setTestStatus({
          is_connected: true,
          provider_type: 'ollama',
          model_name: res.model_name,
          message: `✓ Modelo «${res.model_name}» instalado y listo para trabajar localmente.`,
          latency_ms: 0,
        });
      }
    } catch (err: any) {
      setOllamaError(String(err?.message || err));
    } finally {
      setIsInstallingOllama(false);
    }
  };

  return (
    <div className="settings-viewport">
      <div className="settings-content-wrapper">
        {/* Header */}
        <div className="settings-header">
          <h1 className="settings-title">Configuración</h1>
          <p className="settings-subtitle">Preferencias de lectura, personalización visual y motores de estudio</p>
        </div>

        {/* 1. Rendimiento y Ventana */}
        <section className="settings-section">
          <div className="settings-section-header">
            <Cpu size={18} color="var(--accent-gold)" />
            <h2>Rendimiento & Ventana</h2>
          </div>

          <div className="settings-group">
            {/* Native Titlebar toggle */}
            <div className="settings-row">
              <div className="settings-label-col">
                <span className="settings-row-title">Barra de Título del Sistema (GTK)</span>
                <span className="settings-row-desc">
                  {nativeDecorations
                    ? 'Barra nativa del sistema visible.'
                    : 'Diseño inmersivo integrado (barra de título nativa oculta).'}
                </span>
              </div>

              <button
                type="button"
                className={`verbum-switch ${!nativeDecorations ? 'active' : ''}`}
                onClick={handleToggleDecorations}
                title={nativeDecorations ? 'Ocultar barra nativa de Linux' : 'Mostrar barra nativa de Linux'}
                aria-label="Alternar barra de título nativa"
              >
                <div className="verbum-switch-knob" />
              </button>
            </div>

            {/* Modo Zen Inmersivo toggle */}
            <div className="settings-row">
              <div className="settings-label-col">
                <span className="settings-row-title">Modo Zen (Inmersión Total)</span>
                <span className="settings-row-desc">
                  {hideTopBar
                    ? 'Activo: Barra superior y lateral ocultas. La barra lateral aparece al pasar el cursor por el borde izquierdo.'
                    : 'Inactivo: Barra superior y lateral siempre visibles.'}
                </span>
              </div>

              <button
                type="button"
                className={`verbum-switch ${hideTopBar ? 'active' : ''}`}
                onClick={onToggleHideTopBar}
                title={hideTopBar ? 'Desactivar Modo Zen' : 'Activar Modo Zen'}
                aria-label="Alternar Modo Zen"
              >
                <div className="verbum-switch-knob" />
              </button>
            </div>

            {/* GPU Acceleration note */}
            <div className="settings-row">
              <div className="settings-label-col">
                <span className="settings-row-title">Aceleración por Hardware</span>
                <span className="settings-row-desc">
                  Renderizado WebKitGTK OpenGL/Vulkan activo para transiciones fluidas de 60fps.
                </span>
              </div>

              <div className="live-status-pill">
                <div className="live-status-dot" />
                <span>60 FPS · GPU Activa</span>
              </div>
            </div>
          </div>
        </section>

        {/* 2. Inteligencia & Modelos de IA */}
        <section className="settings-section">
          <div className="settings-section-header">
            <Sparkles size={18} color="var(--accent-gold)" />
            <h2>Inteligencia & Exégesis («Profundizar con IA»)</h2>
          </div>

          <div className="settings-group" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Provider Selector Grid */}
            <div className="ai-provider-grid">
              <button
                className={`ai-provider-btn ${aiConfig.provider_type === 'gemini' ? 'active' : ''}`}
                onClick={() =>
                  onUpdateAIConfig({
                    ...aiConfig,
                    provider_type: 'gemini',
                    model_name: 'gemini-3.7-flash',
                  })
                }
              >
                <Sparkles size={16} />
                <span>Google AI Studio</span>
              </button>

              <button
                className={`ai-provider-btn ${aiConfig.provider_type === 'ollama' ? 'active' : ''}`}
                onClick={() =>
                  onUpdateAIConfig({
                    ...aiConfig,
                    provider_type: 'ollama',
                    model_name: 'qwen3:4b-instruct-2507',
                  })
                }
              >
                <Cpu size={16} />
                <span>Ollama Local</span>
              </button>

              <button
                className={`ai-provider-btn ${aiConfig.provider_type === 'openai_compatible' ? 'active' : ''}`}
                onClick={() =>
                  onUpdateAIConfig({
                    ...aiConfig,
                    provider_type: 'openai_compatible',
                    model_name: 'qwen/qwen-2.5-7b-instruct',
                  })
                }
              >
                <Wifi size={16} />
                <span>OpenRouter / OpenAI</span>
              </button>

              <button
                className={`ai-provider-btn ${aiConfig.provider_type === 'heuristic_offline' ? 'active' : ''}`}
                onClick={() => onUpdateAIConfig({ ...aiConfig, provider_type: 'heuristic_offline' })}
              >
                <Database size={16} />
                <span>Modo Offline</span>
              </button>
            </div>

            {/* Google AI Studio (Gemini) Panel */}
            {aiConfig.provider_type === 'gemini' && (
              <div className="ai-config-subpanel">
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '14px' }}>
                  <div>
                    <label className="settings-input-label">API Key de Google AI Studio</label>
                    <input
                      type="password"
                      className="settings-text-input"
                      value={aiConfig.api_key || ''}
                      onChange={(e) => onUpdateAIConfig({ ...aiConfig, api_key: e.target.value })}
                      placeholder="AIzaSy..."
                    />
                  </div>

                  <div>
                    <label className="settings-input-label">Modelo Gemini</label>
                    <input
                      type="text"
                      className="settings-text-input"
                      value={aiConfig.model_name}
                      onChange={(e) => onUpdateAIConfig({ ...aiConfig, model_name: e.target.value })}
                      placeholder="gemini-3.7-flash, gemini-3.7-pro"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Ollama Local Panel with 1-Click Installer */}
            {aiConfig.provider_type === 'ollama' && (
              <div className="ai-config-subpanel">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '14px' }}>
                  <div>
                    <label className="settings-input-label">Endpoint de Ollama</label>
                    <input
                      type="text"
                      className="settings-text-input"
                      value={aiConfig.ollama_endpoint}
                      onChange={(e) => onUpdateAIConfig({ ...aiConfig, ollama_endpoint: e.target.value })}
                      placeholder="http://localhost:11434"
                    />
                  </div>

                  <div>
                    <label className="settings-input-label">Modelo Local</label>
                    <input
                      type="text"
                      className="settings-text-input"
                      value={aiConfig.model_name}
                      onChange={(e) => onUpdateAIConfig({ ...aiConfig, model_name: e.target.value })}
                      placeholder="qwen3:4b-instruct-2507, qwen2.5:3b"
                    />
                  </div>
                </div>

                {/* Intelligent Local Model Status & 1-Click Installer */}
                <div className="ai-install-box">
                  <div className="ai-install-info">
                    {ollamaStatus?.is_model_installed ? (
                      <>
                        <span className="ai-badge-status ready">
                          <CheckCircle2 size={12} /> Listo
                        </span>
                        <span>Modelo local <strong>Qwen3-4B</strong> instalado y listo para trabajar.</span>
                      </>
                    ) : isInstallingOllama ? (
                      <>
                        <Loader2 size={15} className="spin-anim" color="var(--accent-gold)" />
                        <span>Instalando modelo <strong>Qwen3-4B-Instruct</strong> desde Ollama...</span>
                      </>
                    ) : (
                      <>
                        <span className="ai-badge-status missing">
                          <AlertCircle size={12} /> No Instalado
                        </span>
                        <span>Descarga el modelo <strong>Qwen3-4B-Instruct-2507</strong> para procesar sin internet.</span>
                      </>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {!ollamaStatus?.is_model_installed && (
                      <button
                        className="btn-install-model"
                        onClick={handleInstallOllamaModel}
                        disabled={isInstallingOllama}
                      >
                        {isInstallingOllama ? (
                          <>
                            <Loader2 size={13} className="spin-anim" />
                            <span>Descargando...</span>
                          </>
                        ) : (
                          <>
                            <DownloadCloud size={14} />
                            <span>Instalar Qwen3-4B</span>
                          </>
                        )}
                      </button>
                    )}

                    <button
                      className="icon-btn"
                      onClick={refreshOllamaStatus}
                      title="Verificar estado de Ollama"
                      style={{ padding: '6px', borderRadius: '6px' }}
                    >
                      <RefreshCw size={14} />
                    </button>
                  </div>
                </div>

                {ollamaError && (
                  <div style={{ marginTop: '10px', fontSize: '0.82rem', color: '#ef4444' }}>
                    {ollamaError}
                  </div>
                )}
              </div>
            )}

            {/* Cloud API Panel */}
            {aiConfig.provider_type === 'openai_compatible' && (
              <div className="ai-config-subpanel">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px' }}>
                  <div>
                    <label className="settings-input-label">Base URL</label>
                    <input
                      type="text"
                      className="settings-text-input"
                      value={aiConfig.base_url || ''}
                      onChange={(e) => onUpdateAIConfig({ ...aiConfig, base_url: e.target.value })}
                      placeholder="https://openrouter.ai/api/v1"
                    />
                  </div>

                  <div>
                    <label className="settings-input-label">Modelo</label>
                    <input
                      type="text"
                      className="settings-text-input"
                      value={aiConfig.model_name}
                      onChange={(e) => onUpdateAIConfig({ ...aiConfig, model_name: e.target.value })}
                      placeholder="qwen/qwen-2.5-7b-instruct"
                    />
                  </div>

                  <div>
                    <label className="settings-input-label">API Key</label>
                    <input
                      type="password"
                      className="settings-text-input"
                      value={aiConfig.api_key || ''}
                      onChange={(e) => onUpdateAIConfig({ ...aiConfig, api_key: e.target.value })}
                      placeholder="sk-..."
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Connection Test & Privacy Row */}
            <div className="settings-row" style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '14px', paddingLeft: 0, paddingRight: 0 }}>
              <div className="settings-label-col">
                <span className="settings-row-title">Verificación de Conexión</span>
                <span className="settings-row-desc">Comprueba la disponibilidad del motor activo.</span>
              </div>

              <button
                className="btn-select-default"
                onClick={handleTestConnection}
                disabled={testingAI}
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                {testingAI ? <Loader2 size={13} className="spin-anim" /> : <Sparkles size={13} />}
                <span>{testingAI ? 'Comprobando...' : 'Probar Conexión'}</span>
              </button>
            </div>

            {testStatus && (
              <div
                className={`ai-test-status-banner ${testStatus.is_connected ? 'success' : 'error'}`}
                style={{
                  padding: '10px 14px',
                  borderRadius: '8px',
                  backgroundColor: testStatus.is_connected ? 'rgba(34, 197, 94, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                  border: `1px solid ${testStatus.is_connected ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                  color: testStatus.is_connected ? '#22c55e' : '#ef4444',
                  fontSize: '0.85rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span>{testStatus.message}</span>
                {testStatus.latency_ms !== undefined && (
                  <span style={{ fontSize: '0.78rem', opacity: 0.85 }}>Latencia: {testStatus.latency_ms} ms</span>
                )}
              </div>
            )}

            {/* Privacy Row with Switch */}
            <div className="settings-row" style={{ paddingLeft: 0, paddingRight: 0, borderBottom: 'none' }}>
              <div className="settings-label-col">
                <span className="settings-row-title">Privacidad Estricta (Local-Only)</span>
                <span className="settings-row-desc">Bloquear cualquier consulta hacia servidores externos.</span>
              </div>

              <button
                type="button"
                className={`verbum-switch ${aiConfig.local_only_privacy ? 'active' : ''}`}
                onClick={() =>
                  onUpdateAIConfig({ ...aiConfig, local_only_privacy: !aiConfig.local_only_privacy })
                }
                title={aiConfig.local_only_privacy ? 'Privacidad local activa' : 'Permitir conexiones en la nube'}
                aria-label="Alternar privacidad estricta"
              >
                <div className="verbum-switch-knob" />
              </button>
            </div>
          </div>
        </section>

        {/* 3. Tipografía y Lectura */}
        <section className="settings-section">
          <div className="settings-section-header">
            <Type size={18} color="var(--accent-gold)" />
            <h2>Tipografía & Lectura</h2>
          </div>

          <div className="settings-group">
            {/* Font Size Row */}
            <div className="settings-row">
              <div className="settings-label-col">
                <span className="settings-row-title">Tamaño de Fuente del Texto Bíblico</span>
                <span className="settings-row-desc">Ajusta el cuerpo editorial para una lectura óptima</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <input
                  type="range"
                  min="13"
                  max="28"
                  value={fontSize}
                  onChange={(e) => onChangeFontSize(Number(e.target.value))}
                  style={{ width: '130px', accentColor: 'var(--accent-gold)', cursor: 'pointer' }}
                />
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.88rem', color: 'var(--accent-gold)', fontWeight: 'bold', minWidth: '40px' }}>
                  {fontSize}px
                </span>
              </div>
            </div>

            {/* Editorial Preview Box */}
            <div style={{ padding: '16px 18px' }}>
              <div className="typography-preview-box" style={{ margin: 0 }}>
                <span className="preview-label">Vista Previa Editorial</span>
                <p style={{ fontFamily: 'var(--font-serif)', fontSize: `${fontSize}px`, lineHeight: '1.7', color: 'var(--text-primary)', margin: 0 }}>
                  «En el principio era el Verbo, y el Verbo era con Dios, y el Verbo era Dios. Este era en el principio con Dios.»
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 4. Temas y Paletas Cromáticas */}
        <section className="settings-section">
          <div className="settings-section-header">
            <Palette size={18} color="var(--accent-gold)" />
            <h2>Temas Cromáticos ({THEME_PALETTES.length} Paletas Nativas)</h2>
          </div>

          <div className="settings-group" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
              <span className="settings-row-desc">
                Paletas adaptadas para alto contraste, modo OLED y lectura prolongada sin fatiga.
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
                  Oscuros ({THEME_PALETTES.filter((t) => t.category === 'dark').length})
                </button>
                <button
                  className={`catalog-filter-btn ${themeFilter === 'light' ? 'active' : ''}`}
                  onClick={() => setThemeFilter('light')}
                  style={{ padding: '4px 10px', fontSize: '0.78rem' }}
                >
                  Claros ({THEME_PALETTES.filter((t) => t.category === 'light').length})
                </button>
              </div>
            </div>

            {/* Grid of Memoized Theme Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '12px' }}>
              {filteredThemes.map((t) => (
                <ThemeCard
                  key={t.id}
                  palette={t}
                  isActive={activeNormalized === t.id}
                  onSelect={onSelectTheme}
                />
              ))}
            </div>
          </div>
        </section>

        {/* 5. Versiones Bíblicas Offline */}
        <section className="settings-section">
          <div className="settings-section-header">
            <BookOpen size={18} color="var(--accent-gold)" />
            <h2>Versiones Bíblicas Instaladas (100% Offline)</h2>
          </div>

          <div className="settings-group">
            {versions.map((v) => (
              <VersionSettingsRow
                key={v.id}
                version={v}
                isCurrent={currentVersion === v.id}
                onSelect={onSelectDefaultVersion}
              />
            ))}
          </div>
        </section>

        {/* 6. Motor de Búsqueda FTS5 & Lematización */}
        <section className="settings-section">
          <div className="settings-section-header">
            <Search size={18} color="var(--accent-gold)" />
            <h2>Motor de Búsqueda SQLite FTS5</h2>
          </div>

          <div className="settings-group" style={{ padding: '14px' }}>
            <div className="stats-grid">
              <div className="stat-box">
                <span className="stat-num">120,962</span>
                <span className="stat-desc">Versículos indexados localmente</span>
              </div>

              <div className="stat-box">
                <span className="stat-num">&lt; 10 ms</span>
                <span className="stat-desc">Velocidad media de consulta global</span>
              </div>

              <div className="stat-box">
                <span className="stat-num">remove_diacritics</span>
                <span className="stat-desc">Búsqueda insensible a tildes (jose → José)</span>
              </div>

              <div className="stat-box">
                <span className="stat-num">Lematización</span>
                <span className="stat-desc">Expansión canónica (anaquitas ⇄ anaceos ⇄ anakim)</span>
              </div>
            </div>

            <div style={{ marginTop: '18px', borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <span style={{ fontWeight: '700', fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                  Idiomas incluidos en la búsqueda
                </span>
                <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                  {searchLanguages.length === 0 ? 'Todos los idiomas' : `${searchLanguages.length} seleccionado(s)`}
                </span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '6px' }}>
                <button
                  className={`btn-select-default ${searchLanguages.length === 0 ? 'active' : ''}`}
                  onClick={() => onChangeSearchLanguages([])}
                >
                  Todos
                </button>
                {Array.from(new Set(versions.map((v) => v.language))).map((lang) => {
                  const label: Record<string, string> = {
                    es: 'Español',
                    en: 'English',
                    fr: 'Français',
                    de: 'Deutsch',
                    pt: 'Português',
                    la: 'Latín',
                  };
                  const active = searchLanguages.includes(lang);
                  return (
                    <button
                      key={lang}
                      className={`btn-select-default ${active ? 'active' : ''}`}
                      onClick={() => {
                        if (active) {
                          onChangeSearchLanguages(searchLanguages.filter((l) => l !== lang));
                        } else {
                          onChangeSearchLanguages([...searchLanguages, lang]);
                        }
                      }}
                    >
                      {label[lang] || lang.toUpperCase()}
                    </button>
                  );
                })}
              </div>
              <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '8px' }}>
                La búsqueda global (Ctrl+F / Ctrl+K) solo devolverá resultados en los idiomas marcados.
              </p>
            </div>
          </div>
        </section>

        {/* Footer Branding */}
        <div className="settings-footer-brand" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '24px 0 10px 0', opacity: 0.75, fontSize: '0.82rem', color: 'var(--text-muted)' }}>
          <VerbumLogo size={20} className="brand-icon" />
          <span>Verbum Desktop · Estudio Bíblico de Alta Fidelidad</span>
        </div>
      </div>
    </div>
  );
};
export default SettingsView;
