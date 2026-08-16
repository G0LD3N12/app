import React, { useState, useEffect, useCallback } from 'react';
import { AIProviderConfig, AIConnectionStatus, OllamaModelInstallStatus } from '../../types';
import {
  testAIConnection,
  checkOllamaModelStatus,
  installOrPullOllamaModel,
} from '../../services/bibleService';
import {
  Sparkles,
  Cpu,
  Database,
  Loader2,
  Wifi,
  DownloadCloud,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';

interface SettingsAISectionProps {
  aiConfig: AIProviderConfig;
  onUpdateAIConfig: (cfg: AIProviderConfig) => void;
}

export const SettingsAISection: React.FC<SettingsAISectionProps> = ({
  aiConfig,
  onUpdateAIConfig,
}) => {
  const [testingAI, setTestingAI] = useState<boolean>(false);
  const [testStatus, setTestStatus] = useState<AIConnectionStatus | null>(null);

  // Ollama local installer state
  const [ollamaStatus, setOllamaStatus] = useState<OllamaModelInstallStatus | null>(null);
  const [isInstallingOllama, setIsInstallingOllama] = useState<boolean>(false);
  const [ollamaError, setOllamaError] = useState<string | null>(null);

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
  );
};
