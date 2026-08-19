import React, { useCallback, useEffect, useState } from 'react';
import {
  AlertCircle,
  Check,
  Cpu,
  Database,
  DownloadCloud,
  Loader2,
  RefreshCw,
  Sparkles,
  Wifi,
} from 'lucide-react';
import { AIConnectionStatus, AIProviderConfig, OllamaModelInstallStatus } from '../../types';
import {
  checkOllamaModelStatus,
  installOrPullOllamaModel,
  testAIConnection,
} from '../../services/bibleService';

interface SettingsAISectionProps {
  aiConfig: AIProviderConfig;
  onUpdateAIConfig: (cfg: AIProviderConfig) => void;
}

type ProviderType = AIProviderConfig['provider_type'];

const PROVIDERS: Array<{
  id: ProviderType;
  label: string;
  note: string;
  icon: React.ComponentType<{ size?: number }>;
}> = [
  { id: 'gemini', label: 'Gemini', note: 'Google AI', icon: Sparkles },
  { id: 'ollama', label: 'Ollama', note: 'En este equipo', icon: Cpu },
  { id: 'openai_compatible', label: 'API', note: 'OpenAI compatible', icon: Wifi },
  { id: 'heuristic_offline', label: 'Sin IA', note: 'Biblioteca local', icon: Database },
];

const providerDefaults: Record<ProviderType, string> = {
  gemini: 'gemini-3.7-flash',
  ollama: 'qwen2.5:3b',
  openai_compatible: 'qwen/qwen-2.5-7b-instruct',
  heuristic_offline: '',
};

export const SettingsAISection: React.FC<SettingsAISectionProps> = ({
  aiConfig,
  onUpdateAIConfig,
}) => {
  const [testing, setTesting] = useState(false);
  const [testStatus, setTestStatus] = useState<AIConnectionStatus | null>(null);
  const [ollamaStatus, setOllamaStatus] = useState<OllamaModelInstallStatus | null>(null);
  const [checkingOllama, setCheckingOllama] = useState(false);
  const [installingOllama, setInstallingOllama] = useState(false);
  const [ollamaError, setOllamaError] = useState<string | null>(null);

  const selectProvider = (provider: ProviderType) => {
    setTestStatus(null);
    onUpdateAIConfig({
      ...aiConfig,
      provider_type: provider,
      model_name:
        provider === aiConfig.provider_type
          ? aiConfig.model_name
          : providerDefaults[provider],
    });
  };

  const refreshOllama = useCallback(async () => {
    setCheckingOllama(true);
    setOllamaError(null);
    try {
      const model = aiConfig.model_name.trim() || providerDefaults.ollama;
      setOllamaStatus(await checkOllamaModelStatus(aiConfig.ollama_endpoint, model));
    } catch (error) {
      setOllamaError(String(error));
    } finally {
      setCheckingOllama(false);
    }
  }, [aiConfig.model_name, aiConfig.ollama_endpoint]);

  useEffect(() => {
    if (aiConfig.provider_type !== 'ollama') return;
    const statusCheck = window.setTimeout(() => void refreshOllama(), 350);
    return () => window.clearTimeout(statusCheck);
  }, [aiConfig.provider_type, refreshOllama]);

  const installOllama = async () => {
    setInstallingOllama(true);
    setOllamaError(null);
    try {
      const model = aiConfig.model_name.trim() || providerDefaults.ollama;
      const status = await installOrPullOllamaModel(aiConfig.ollama_endpoint, model);
      setOllamaStatus(status);
      if (status.is_model_installed) {
        setTestStatus({
          is_connected: true,
          provider_type: 'ollama',
          model_name: status.model_name,
          message: 'Modelo local listo.',
          latency_ms: 0,
        });
      }
    } catch (error) {
      setOllamaError(String(error));
    } finally {
      setInstallingOllama(false);
    }
  };

  const testConnection = async () => {
    setTesting(true);
    setTestStatus(null);
    try {
      setTestStatus(await testAIConnection(aiConfig));
    } catch (error) {
      setTestStatus({
        is_connected: false,
        provider_type: aiConfig.provider_type,
        model_name: aiConfig.model_name,
        message: `No se pudo conectar: ${String(error)}`,
      });
    } finally {
      setTesting(false);
    }
  };

  const ollamaReady = Boolean(ollamaStatus?.is_model_installed);
  const ollamaRunning = Boolean(ollamaStatus?.is_ollama_running);
  const ollamaInstalled = Boolean(ollamaStatus?.is_ollama_installed);
  const ollamaResolved = ollamaStatus !== null;

  return (
    <section className="settings-block settings-ai-block">
      <div className="settings-provider-grid" role="radiogroup" aria-label="Motor de inteligencia">
        {PROVIDERS.map(({ id, label, note, icon: Icon }) => (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={aiConfig.provider_type === id}
            className={`settings-provider-card ${aiConfig.provider_type === id ? 'active' : ''}`}
            onClick={() => selectProvider(id)}
          >
            <span><Icon size={17} /></span>
            <strong>{label}</strong>
            <small>{note}</small>
            {aiConfig.provider_type === id && <Check size={13} className="settings-provider-check" />}
          </button>
        ))}
      </div>

      <div className="settings-ai-config">
        {aiConfig.provider_type === 'gemini' && (
          <div className="settings-control-grid">
            <div className="settings-field settings-field-span">
              <label>Clave de Google AI Studio</label>
              <input
                type="password"
                className="settings-text-input"
                value={aiConfig.api_key || ''}
                onChange={(event) => onUpdateAIConfig({ ...aiConfig, api_key: event.target.value })}
                placeholder="AIzaSy…"
                autoComplete="off"
              />
            </div>
            <div className="settings-field settings-field-span">
              <label>Modelo</label>
              <input
                className="settings-text-input"
                value={aiConfig.model_name}
                onChange={(event) => onUpdateAIConfig({ ...aiConfig, model_name: event.target.value })}
              />
            </div>
          </div>
        )}

        {aiConfig.provider_type === 'ollama' && (
          <>
            <div className={`settings-service-hero ${ollamaReady ? 'ready' : ollamaInstalled ? 'waiting' : 'missing'}`}>
              <span className="settings-service-icon">
                {!ollamaResolved || checkingOllama || installingOllama ? (
                  <Loader2 size={19} className="spin-anim" />
                ) : ollamaReady ? (
                  <Check size={19} />
                ) : (
                  <Cpu size={19} />
                )}
              </span>
              <div className="settings-service-copy">
                <strong>Ollama</strong>
                <span>
                  {!ollamaResolved || checkingOllama
                    ? 'Preparando servicio…'
                    : installingOllama
                      ? `Descargando ${aiConfig.model_name}…`
                      : ollamaReady
                        ? `${ollamaStatus?.model_name} · inicio automático activo`
                        : ollamaRunning
                          ? 'Servicio activo · falta el modelo'
                          : ollamaInstalled
                            ? 'Instalado · intentando iniciar'
                          : 'IA privada en este equipo'}
                </span>
              </div>
              <span className="settings-service-state">
                {!ollamaResolved || checkingOllama ? 'Comprobando' : ollamaReady ? 'Listo' : ollamaInstalled ? 'Instalado' : 'Opcional'}
              </span>
              {ollamaResolved && !checkingOllama && !ollamaReady && !ollamaInstalled && (
                <button
                  type="button"
                  className="settings-primary-action"
                  onClick={installOllama}
                  disabled={installingOllama}
                >
                  <DownloadCloud size={14} />
                  {installingOllama ? 'Instalando…' : 'Activar'}
                </button>
              )}
              {ollamaResolved && !checkingOllama && ollamaInstalled && ollamaRunning && !ollamaReady && (
                <button
                  type="button"
                  className="settings-primary-action"
                  onClick={installOllama}
                  disabled={installingOllama}
                >
                  <DownloadCloud size={14} />
                  {installingOllama ? 'Descargando…' : 'Descargar modelo'}
                </button>
              )}
              {ollamaResolved && !checkingOllama && ollamaInstalled && !ollamaRunning && (
                <button type="button" className="settings-quiet-action" onClick={refreshOllama}>
                  <RefreshCw size={14} /> Reintentar
                </button>
              )}
              {!checkingOllama && ollamaReady && (
                <button type="button" className="settings-icon-action" onClick={refreshOllama} title="Comprobar">
                  <RefreshCw size={14} />
                </button>
              )}
            </div>

            {ollamaError && (
              <div className="settings-inline-error"><AlertCircle size={14} /> {ollamaError}</div>
            )}

            <div className="settings-control-grid settings-ai-local-fields">
              <div className="settings-field settings-field-span">
                <label>Modelo local</label>
                <input
                  className="settings-text-input"
                  value={aiConfig.model_name}
                  onChange={(event) => onUpdateAIConfig({ ...aiConfig, model_name: event.target.value })}
                  placeholder="qwen2.5:3b"
                />
              </div>
              <div className="settings-field settings-field-span">
                <label>Dirección</label>
                <input
                  className="settings-text-input"
                  value={aiConfig.ollama_endpoint}
                  onChange={(event) => onUpdateAIConfig({ ...aiConfig, ollama_endpoint: event.target.value })}
                  placeholder="http://localhost:11434"
                />
              </div>
            </div>
          </>
        )}

        {aiConfig.provider_type === 'openai_compatible' && (
          <div className="settings-control-grid">
            <div className="settings-field settings-field-span">
              <label>Dirección API</label>
              <input
                className="settings-text-input"
                value={aiConfig.base_url || ''}
                onChange={(event) => onUpdateAIConfig({ ...aiConfig, base_url: event.target.value })}
                placeholder="https://openrouter.ai/api/v1"
              />
            </div>
            <div className="settings-field">
              <label>Modelo</label>
              <input
                className="settings-text-input"
                value={aiConfig.model_name}
                onChange={(event) => onUpdateAIConfig({ ...aiConfig, model_name: event.target.value })}
              />
            </div>
            <div className="settings-field">
              <label>Clave API</label>
              <input
                type="password"
                className="settings-text-input"
                value={aiConfig.api_key || ''}
                onChange={(event) => onUpdateAIConfig({ ...aiConfig, api_key: event.target.value })}
                placeholder="sk-…"
                autoComplete="off"
              />
            </div>
          </div>
        )}

        {aiConfig.provider_type === 'heuristic_offline' && (
          <div className="settings-offline-note">
            <Database size={18} />
            <div><strong>Biblioteca local</strong><span>Estudio básico sin cuentas ni conexión.</span></div>
          </div>
        )}
      </div>

      <footer className="settings-ai-footer">
        <label className="settings-inline-toggle">
          <span>Solo conexiones locales</span>
          <button
            type="button"
            className={`verbum-switch ${aiConfig.local_only_privacy ? 'active' : ''}`}
            onClick={() => onUpdateAIConfig({ ...aiConfig, local_only_privacy: !aiConfig.local_only_privacy })}
            aria-label="Alternar conexiones locales"
          >
            <i className="verbum-switch-knob" />
          </button>
        </label>

        {aiConfig.provider_type !== 'heuristic_offline' && (
          <button type="button" className="settings-quiet-action" onClick={testConnection} disabled={testing}>
            {testing ? <Loader2 size={13} className="spin-anim" /> : <Sparkles size={13} />}
            {testing ? 'Probando…' : 'Probar'}
          </button>
        )}
      </footer>

      {testStatus && (
        <div className={`settings-connection-result ${testStatus.is_connected ? 'success' : 'error'}`}>
          {testStatus.is_connected ? <Check size={14} /> : <AlertCircle size={14} />}
          <span>{testStatus.message}</span>
          {testStatus.latency_ms !== undefined && <small>{testStatus.latency_ms} ms</small>}
        </div>
      )}
    </section>
  );
};
