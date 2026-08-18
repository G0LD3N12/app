import React, { useState, useEffect, useCallback } from 'react';
import {
  Volume2,
  Cpu,
  RefreshCw,
  Trash2,
  Play,
  Square,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Loader2,
  DownloadCloud,
  CheckCircle2,
  AlertCircle,
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

  const [checking, setChecking] = useState<boolean>(false);
  const [profiles, setProfiles] = useState<VoiceProfile[]>([]);
  const [cacheSize, setCacheSize] = useState<number>(0);
  const [clearingCache, setClearingCache] = useState<boolean>(false);
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);
  const [endpointInput, setEndpointInput] = useState<string>(voiceSettings.voiceboxUrl);

  // 1-Click Auto Setup state
  const [isSettingUp, setIsSettingUp] = useState<boolean>(false);
  const [setupMessage, setSetupMessage] = useState<{ text: string; success: boolean } | null>(null);

  const fetchStatusAndProfiles = useCallback(async () => {
    setChecking(true);
    const status = await refreshVoiceboxStatus();
    if (status.available) {
      const profs = await getVoiceboxProfiles(voiceSettings.voiceboxUrl);
      setProfiles(profs);
    }
    const size = await getAudioCacheSize();
    setCacheSize(size);
    setChecking(false);
  }, [refreshVoiceboxStatus, voiceSettings.voiceboxUrl]);

  useEffect(() => {
    fetchStatusAndProfiles();
  }, [fetchStatusAndProfiles]);

  const handleAutoSetup = async () => {
    setIsSettingUp(true);
    setSetupMessage(null);
    try {
      const res = await autoSetupVoicebox(voiceSettings.voiceboxUrl);
      if (res.success || res.is_running) {
        setSetupMessage({ text: res.message, success: true });
        updateVoiceSettings({ preferredEngine: 'voicebox' });
        await fetchStatusAndProfiles();
      } else {
        setSetupMessage({ text: res.message, success: false });
      }
    } catch (err: any) {
      setSetupMessage({
        text: `Error durante la configuración: ${err?.message || err}`,
        success: false,
      });
    } finally {
      setIsSettingUp(false);
    }
  };

  const handleTestVoice = () => {
    if (playbackState === 'playing' || playbackState === 'generating') {
      stop();
    } else {
      const sampleText =
        'En el principio era el Verbo, y el Verbo era con Dios, y el Verbo era Dios. Todas las cosas por él fueron hechas.';
      playSelection(sampleText, 'Prueba de voz', 'RV1909');
    }
  };

  const handleClearCache = async () => {
    setClearingCache(true);
    await clearAudioCache();
    const size = await getAudioCacheSize();
    setCacheSize(size);
    setClearingCache(false);
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const handleSaveEndpoint = () => {
    updateVoiceSettings({ voiceboxUrl: endpointInput.trim() });
    setTimeout(fetchStatusAndProfiles, 100);
  };

  const isTestingAudio = playbackState === 'playing' || playbackState === 'generating';

  return (
    <section className="settings-section">
      <div className="settings-section-header">
        <Volume2 size={18} color="var(--accent-gold)" />
        <h2>Voz & Lectura en Audio (TTS)</h2>
      </div>

      <div className="settings-group">
        {/* 1-Click Auto Setup Card (When Voicebox is offline or upon user request) */}
        {!voiceboxStatus?.available && (
          <div
            style={{
              padding: '16px 18px',
              borderBottom: '1px solid var(--border-subtle)',
              background: 'linear-gradient(135deg, rgba(212, 163, 89, 0.08), rgba(212, 163, 89, 0.02))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '16px',
              flexWrap: 'wrap',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', flex: '1 1 300px' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '8px',
                  backgroundColor: 'rgba(212, 163, 89, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--accent-gold)',
                  flexShrink: 0,
                }}
              >
                <Sparkles size={20} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                <span style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Activar Motor de Voz IA Local (1 Clic)
                </span>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                  Instala, inicia y enlaza automáticamente el servicio local de Voicebox (puerto 17493) para síntesis neuronal offline de alta fidelidad.
                </span>
              </div>
            </div>

            <button
              type="button"
              className="btn-select-default active"
              onClick={handleAutoSetup}
              disabled={isSettingUp}
              style={{
                padding: '8px 16px',
                fontSize: '0.85rem',
                fontWeight: 700,
                gap: '8px',
                whiteSpace: 'nowrap',
              }}
            >
              {isSettingUp ? (
                <>
                  <Loader2 size={15} className="spin-anim" />
                  <span>Configurando Voicebox...</span>
                </>
              ) : (
                <>
                  <DownloadCloud size={15} />
                  <span>Instalar y Configurar</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* Setup Result Banner */}
        {setupMessage && (
          <div
            style={{
              padding: '10px 18px',
              backgroundColor: setupMessage.success ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
              borderBottom: `1px solid ${setupMessage.success ? 'rgba(34, 197, 94, 0.25)' : 'rgba(239, 68, 68, 0.25)'}`,
              color: setupMessage.success ? '#22c55e' : '#ef4444',
              fontSize: '0.82rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            {setupMessage.success ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            <span>{setupMessage.text}</span>
          </div>
        )}

        {/* 1. Status Row */}
        <div className="settings-row">
          <div className="settings-label-col">
            <span className="settings-row-title">Estado del Motor de Voz</span>
            <span className="settings-row-desc">
              {voiceboxStatus?.available
                ? `Voicebox Local activo en ${voiceboxStatus.url} · Motor ${voiceboxStatus.active_engine || 'Qwen3-TTS'}`
                : 'Voicebox no detectado en localhost. Usando síntesis nativa del sistema (Voz del Sistema).'}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              className="live-status-pill"
              style={
                voiceboxStatus?.available
                  ? {}
                  : {
                      backgroundColor: 'rgba(245, 158, 11, 0.08)',
                      borderColor: 'rgba(245, 158, 11, 0.25)',
                      color: '#f59e0b',
                    }
              }
            >
              <div
                className="live-status-dot"
                style={
                  voiceboxStatus?.available
                    ? {}
                    : {
                        backgroundColor: '#f59e0b',
                        boxShadow: 'none',
                        animation: 'none',
                      }
                }
              />
              <span>{voiceboxStatus?.available ? 'Voicebox Conectado' : 'Voz del Sistema'}</span>
            </div>

            <button
              type="button"
              className="btn-select-default"
              onClick={fetchStatusAndProfiles}
              disabled={checking}
              title="Verificar conexión con Voicebox"
            >
              <RefreshCw size={13} className={checking ? 'spin-anim' : ''} />
              <span>Verificar</span>
            </button>
          </div>
        </div>

        {/* 2. Engine Mode Row */}
        <div className="settings-row">
          <div className="settings-label-col">
            <span className="settings-row-title">Motor Preferido</span>
            <span className="settings-row-desc">
              Elige entre inferencia neuronal local con IA (Voicebox) o la voz nativa del sistema operativo.
            </span>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              className={`btn-select-default ${voiceSettings.preferredEngine === 'voicebox' ? 'active' : ''}`}
              onClick={() => updateVoiceSettings({ preferredEngine: 'voicebox' })}
            >
              <Cpu size={14} />
              <span>Voicebox Local (IA)</span>
            </button>
            <button
              type="button"
              className={`btn-select-default ${voiceSettings.preferredEngine === 'system' ? 'active' : ''}`}
              onClick={() => updateVoiceSettings({ preferredEngine: 'system' })}
            >
              <Volume2 size={14} />
              <span>Voz del Sistema</span>
            </button>
          </div>
        </div>

        {/* 3. Voice Profile Row (if Voicebox) */}
        {voiceSettings.preferredEngine === 'voicebox' && (
          <div className="settings-row">
            <div className="settings-label-col">
              <span className="settings-row-title">Voz Narradora</span>
              <span className="settings-row-desc">
                Perfil de voz utilizado para la lectura bíblica y la locución de exégesis.
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <select
                className="settings-text-input"
                style={{ width: 'auto', minWidth: '240px', cursor: 'pointer' }}
                value={voiceSettings.selectedProfileId}
                onChange={(e) => {
                  const profId = e.target.value;
                  const found = profiles.find((p) => p.id === profId);
                  updateVoiceSettings({
                    selectedProfileId: profId,
                    selectedEngineName: found ? found.engine : voiceSettings.selectedEngineName,
                  });
                }}
              >
                <option value="verbum-narrator">Verbum — Narrador (Qwen3-TTS 0.6B)</option>
                {profiles.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.engine})
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* 4. Speed Pills Row */}
        <div className="settings-row">
          <div className="settings-label-col">
            <span className="settings-row-title">Velocidad Predeterminada</span>
            <span className="settings-row-desc">
              Ritmo de lectura inicial (se puede alternar en vivo en el reproductor).
            </span>
          </div>

          <div style={{ display: 'flex', gap: '6px' }}>
            {[0.75, 1.0, 1.25, 1.5, 2.0].map((s) => (
              <button
                key={s}
                type="button"
                className={`btn-select-default ${voiceSettings.defaultSpeed === s ? 'active' : ''}`}
                onClick={() => updateVoiceSettings({ defaultSpeed: s })}
              >
                {s}×
              </button>
            ))}
          </div>
        </div>

        {/* 5. Auto Scroll Toggle */}
        <div className="settings-row">
          <div className="settings-label-col">
            <span className="settings-row-title">Seguimiento Visual (Auto-Scroll)</span>
            <span className="settings-row-desc">
              Desplazar suavemente el visor bíblico hacia el versículo en locución.
            </span>
          </div>

          <button
            type="button"
            className={`verbum-switch ${voiceSettings.autoScroll ? 'active' : ''}`}
            onClick={() => updateVoiceSettings({ autoScroll: !voiceSettings.autoScroll })}
            title={voiceSettings.autoScroll ? 'Desactivar auto-scroll' : 'Activar auto-scroll'}
            aria-label="Alternar auto-scroll"
          >
            <div className="verbum-switch-knob" />
          </button>
        </div>

        {/* 6. Test Voice Row */}
        <div className="settings-row">
          <div className="settings-label-col">
            <span className="settings-row-title">Prueba de Síntesis de Audio</span>
            <span className="settings-row-desc">
              Reproduce una muestra de Juan 1:1 para verificar volumen y entonación.
            </span>
          </div>

          <button
            type="button"
            className={`btn-select-default ${isTestingAudio ? 'active' : ''}`}
            onClick={handleTestVoice}
            style={{ minWidth: '130px', justifyContent: 'center' }}
          >
            {isTestingAudio ? <Square size={13} /> : <Play size={13} />}
            <span>{isTestingAudio ? 'Detener' : 'Probar voz'}</span>
          </button>
        </div>

        {/* 7. Cache Management Row */}
        <div className="settings-row">
          <div className="settings-label-col">
            <span className="settings-row-title">Caché de Audio en Disco</span>
            <span className="settings-row-desc">
              Espacio ocupado por versículos generados para reproducción instantánea offline.
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: 'var(--accent-gold)', fontWeight: 600 }}>
              {formatBytes(cacheSize)}
            </span>

            <select
              className="settings-text-input"
              style={{ width: 'auto', fontSize: '0.8rem', padding: '4px 8px', cursor: 'pointer' }}
              value={voiceSettings.maxCacheMb}
              onChange={(e) => updateVoiceSettings({ maxCacheMb: parseInt(e.target.value, 10) })}
              title="Límite máximo de retención LRU"
            >
              <option value="500">Límite: 500 MB</option>
              <option value="1000">Límite: 1 GB</option>
              <option value="2000">Límite: 2 GB</option>
              <option value="0">Sin límite</option>
            </select>

            <button
              type="button"
              className="btn-select-default"
              onClick={handleClearCache}
              disabled={clearingCache || cacheSize === 0}
              title="Eliminar todos los archivos de audio en caché"
            >
              <Trash2 size={13} />
              <span>{clearingCache ? 'Limpiando...' : 'Vaciar'}</span>
            </button>
          </div>
        </div>

        {/* 8. Collapsible Advanced Settings */}
        <div style={{ borderTop: '1px solid var(--border-subtle)' }}>
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 18px',
              background: 'none',
              border: 'none',
              color: 'var(--text-secondary)',
              fontSize: '0.82rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'color 0.15s ease',
            }}
          >
            <span>Configuración Avanzada de Voicebox</span>
            {showAdvanced ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
          </button>

          {showAdvanced && (
            <div style={{ padding: '0 18px 16px 18px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label className="settings-input-label">Endpoint URL (FastAPI)</label>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <input
                      type="text"
                      className="settings-text-input"
                      value={endpointInput}
                      onChange={(e) => setEndpointInput(e.target.value)}
                      placeholder="http://127.0.0.1:17493"
                    />
                    <button
                      type="button"
                      className="btn-select-default"
                      onClick={handleSaveEndpoint}
                    >
                      Guardar
                    </button>
                  </div>
                </div>

                <div>
                  <label className="settings-input-label">Identificador del Motor (Engine ID)</label>
                  <input
                    type="text"
                    className="settings-text-input"
                    value={voiceSettings.selectedEngineName}
                    onChange={(e) => updateVoiceSettings({ selectedEngineName: e.target.value.trim() })}
                    placeholder="qwen"
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '6px' }}>
                <button
                  type="button"
                  className="btn-select-default"
                  onClick={handleAutoSetup}
                  disabled={isSettingUp}
                  style={{ fontSize: '0.78rem' }}
                >
                  <RefreshCw size={12} className={isSettingUp ? 'spin-anim' : ''} />
                  <span>Reinstalar / Reiniciar Servicio Voicebox</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
