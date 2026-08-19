import React, { useCallback, useEffect, useState } from 'react';
import {
  AlertCircle,
  Check,
  ChevronDown,
  ChevronUp,
  Loader2,
  Play,
  RefreshCw,
  Square,
  Trash2,
  Volume2,
} from 'lucide-react';
import { useAudioManager } from '../../context/AudioManagerContext';
import {
  autoSetupVoicebox,
  clearAudioCache,
  getAudioCacheSize,
  getVoiceboxProfiles,
} from '../../services/audioService';
import { VoiceProfile } from '../../types/audio';

export const SettingsVoiceSection: React.FC = () => {
  const {
    voiceSettings,
    updateVoiceSettings,
    voiceboxStatus,
    refreshVoiceboxStatus,
    playSelection,
    stop,
    playbackState,
  } = useAudioManager();
  const [checking, setChecking] = useState(true);
  const [profiles, setProfiles] = useState<VoiceProfile[]>([]);
  const [cacheSize, setCacheSize] = useState(0);
  const [clearingCache, setClearingCache] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [endpoint, setEndpoint] = useState(voiceSettings.voiceboxUrl);
  const [installing, setInstalling] = useState(false);
  const [serviceError, setServiceError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setChecking(true);
    setServiceError(null);
    try {
      const status = await refreshVoiceboxStatus();
      if (status.available) {
        setProfiles(await getVoiceboxProfiles(voiceSettings.voiceboxUrl));
      }
      setCacheSize(await getAudioCacheSize());
    } catch (error) {
      setServiceError(String(error));
    } finally {
      setChecking(false);
    }
  }, [refreshVoiceboxStatus, voiceSettings.voiceboxUrl]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const installVoicebox = async () => {
    setInstalling(true);
    setServiceError(null);
    try {
      const result = await autoSetupVoicebox(voiceSettings.voiceboxUrl);
      if (!result.success && !result.is_running) throw new Error(result.message);
      updateVoiceSettings({ preferredEngine: 'voicebox' });
      await refresh();
    } catch (error) {
      setServiceError(String(error));
    } finally {
      setInstalling(false);
    }
  };

  const testVoice = () => {
    if (playbackState === 'playing' || playbackState === 'generating') {
      void stop();
      return;
    }
    void playSelection(
      'En el principio era el Verbo, y el Verbo era con Dios, y el Verbo era Dios.',
      'Prueba de voz',
      'RV1909'
    );
  };

  const clearCache = async () => {
    setClearingCache(true);
    await clearAudioCache();
    setCacheSize(await getAudioCacheSize());
    setClearingCache(false);
  };

  const saveEndpoint = () => {
    const clean = endpoint.trim();
    updateVoiceSettings({ voiceboxUrl: clean });
    window.setTimeout(() => void refresh(), 100);
  };

  const formatBytes = (bytes: number) => {
    if (!bytes) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    const index = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
    return `${(bytes / 1024 ** index).toFixed(index ? 1 : 0)} ${units[index]}`;
  };

  const isTesting = playbackState === 'playing' || playbackState === 'generating';
  const isReady = Boolean(voiceboxStatus?.available);
  const isInstalled = Boolean(voiceboxStatus?.installed);

  return (
    <section className="settings-block settings-service-block">
      <div className={`settings-service-hero ${isReady ? 'ready' : isInstalled ? 'waiting' : 'missing'}`}>
        <span className="settings-service-icon">
          {checking || installing ? (
            <Loader2 size={19} className="spin-anim" />
          ) : isReady ? (
            <Check size={19} />
          ) : (
            <Volume2 size={19} />
          )}
        </span>
        <div className="settings-service-copy">
          <strong>Voicebox</strong>
          <span>
            {checking
              ? 'Preparando servicio…'
              : isReady
                ? 'Listo · inicio automático activo'
                : isInstalled
                  ? 'Instalado · intentando iniciar'
                  : 'Voces neuronales locales'}
          </span>
        </div>
        <span className="settings-service-state">
          {checking ? 'Comprobando' : isReady ? 'Conectado' : isInstalled ? 'Instalado' : 'Opcional'}
        </span>
        {!checking && !isReady && !isInstalled && (
          <button
            type="button"
            className="settings-primary-action"
            onClick={installVoicebox}
            disabled={installing}
          >
            {installing ? 'Instalando…' : 'Activar'}
          </button>
        )}
        {!checking && isInstalled && !isReady && (
          <button type="button" className="settings-quiet-action" onClick={refresh}>
            <RefreshCw size={13} /> Reintentar
          </button>
        )}
      </div>

      {serviceError && (
        <div className="settings-inline-error">
          <AlertCircle size={14} /> {serviceError}
        </div>
      )}

      <div className="settings-control-grid">
        <div className="settings-field">
          <label>Motor</label>
          <div className="settings-segmented settings-segmented-wide">
            <button
              type="button"
              className={voiceSettings.preferredEngine === 'voicebox' ? 'active' : ''}
              onClick={() => updateVoiceSettings({ preferredEngine: 'voicebox' })}
            >
              Voicebox
            </button>
            <button
              type="button"
              className={voiceSettings.preferredEngine === 'system' ? 'active' : ''}
              onClick={() => updateVoiceSettings({ preferredEngine: 'system' })}
            >
              Sistema
            </button>
          </div>
        </div>

        <div className="settings-field">
          <label>Voz</label>
          <select
            className="settings-text-input"
            value={voiceSettings.selectedProfileId}
            disabled={voiceSettings.preferredEngine !== 'voicebox'}
            onChange={(event) => {
              const profile = profiles.find((item) => item.id === event.target.value);
              updateVoiceSettings({
                selectedProfileId: event.target.value,
                selectedEngineName: profile?.engine || voiceSettings.selectedEngineName,
              });
            }}
          >
            <option value="verbum-narrator">Verbum Narrador</option>
            {profiles
              .filter((profile) => profile.id !== 'verbum-narrator')
              .map((profile) => (
                <option key={profile.id} value={profile.id}>{profile.name}</option>
              ))}
          </select>
        </div>

        <div className="settings-field settings-field-span">
          <label>Velocidad inicial</label>
          <div className="settings-segmented settings-speed-options">
            {[0.75, 1, 1.25, 1.5, 2].map((rate) => (
              <button
                key={rate}
                type="button"
                className={voiceSettings.defaultSpeed === rate ? 'active' : ''}
                onClick={() => updateVoiceSettings({ defaultSpeed: rate })}
              >
                {rate}×
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="settings-audio-preview">
        <button type="button" className={isTesting ? 'active' : ''} onClick={testVoice}>
          {isTesting ? <Square size={14} /> : <Play size={14} />}
        </button>
        <div>
          <strong>Escuchar muestra</strong>
          <span>Juan 1:1 · voz y ritmo actuales</span>
        </div>
        <label className="settings-inline-toggle">
          <span>Seguir versículo</span>
          <button
            type="button"
            className={`verbum-switch ${voiceSettings.autoScroll ? 'active' : ''}`}
            onClick={() => updateVoiceSettings({ autoScroll: !voiceSettings.autoScroll })}
            aria-label="Alternar seguimiento del versículo"
          >
            <i className="verbum-switch-knob" />
          </button>
        </label>
      </div>

      <button
        type="button"
        className="settings-disclosure"
        onClick={() => setShowAdvanced((current) => !current)}
      >
        <span>Detalles</span>
        {showAdvanced ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>

      {showAdvanced && (
        <div className="settings-advanced-panel">
          <div className="settings-field settings-field-span">
            <label>Dirección local</label>
            <div className="settings-inline-input">
              <input
                className="settings-text-input"
                value={endpoint}
                onChange={(event) => setEndpoint(event.target.value)}
              />
              <button type="button" className="settings-quiet-action" onClick={saveEndpoint}>Guardar</button>
            </div>
          </div>
          <div className="settings-cache-row">
            <span>Caché · {formatBytes(cacheSize)}</span>
            <select
              className="settings-text-input"
              value={voiceSettings.maxCacheMb}
              onChange={(event) => updateVoiceSettings({ maxCacheMb: Number(event.target.value) })}
            >
              <option value="500">500 MB</option>
              <option value="1000">1 GB</option>
              <option value="2000">2 GB</option>
              <option value="0">Sin límite</option>
            </select>
            <button
              type="button"
              className="settings-quiet-action"
              onClick={clearCache}
              disabled={clearingCache || cacheSize === 0}
            >
              <Trash2 size={13} /> {clearingCache ? 'Limpiando…' : 'Vaciar'}
            </button>
          </div>
          {isInstalled && !isReady && (
            <button type="button" className="settings-quiet-action" onClick={installVoicebox}>
              Reparar instalación
            </button>
          )}
        </div>
      )}
    </section>
  );
};
