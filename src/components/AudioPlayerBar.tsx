import React, { useMemo } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  X,
} from 'lucide-react';
import { useAudioManager } from '../context/AudioManagerContext';

const RING_RADIUS = 16;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

export const AudioPlayerBar: React.FC = () => {
  const {
    isAudioBarVisible,
    currentItem,
    playbackState,
    activeEngineType,
    currentTime,
    duration,
    speed,
    pause,
    resume,
    nextVerse,
    prevVerse,
    setSpeed,
    closeAudioBar,
    queue,
    currentIndex,
  } = useAudioManager();

  if (!isAudioBarVisible || !currentItem) {
    return null;
  }

  const isPlaying = playbackState === 'playing' || playbackState === 'paused';
  const isGenerating =
    playbackState === 'generating' || playbackState === 'prefetching' || playbackState === 'requested';

  const speedOptions = [0.75, 1.0, 1.25, 1.5, 2.0];

  const cycleSpeed = () => {
    const currentIdx = speedOptions.indexOf(speed);
    const nextIdx = (currentIdx + 1) % speedOptions.length;
    setSpeed(speedOptions[nextIdx]);
  };

  // Verse progress shown as a ring around the play button. For the native
  // voicebox engine the clock is estimated; it is visual-only — verse
  // advancement waits for the real end of the audio stream.
  const progressPercent = useMemo(() => {
    if (activeEngineType !== 'voicebox' || duration <= 0) return 0;
    return Math.min(100, (currentTime / duration) * 100);
  }, [activeEngineType, currentTime, duration]);

  const ringOffset = RING_CIRCUMFERENCE * (1 - progressPercent / 100);

  // Determine Title & Translation label
  const { passageLabel, secondaryLabel } = useMemo(() => {
    if (currentItem.type === 'verse' && currentItem.location) {
      return {
        passageLabel: `${currentItem.location.bookName || 'Libro'} ${currentItem.location.chapter}:${currentItem.location.verse}`,
        secondaryLabel: currentItem.translation || 'RV1909',
      };
    }
    if (currentItem.type === 'study') {
      return {
        passageLabel: currentItem.location?.bookName || 'Exégesis IA',
        secondaryLabel: 'Estudio',
      };
    }
    return {
      passageLabel: 'Selección',
      secondaryLabel: currentItem.translation || 'Lectura',
    };
  }, [currentItem]);

  return (
    <div className="audio-player-bar-container" role="region" aria-label="Reproductor de lectura">
      <div className="audio-player-bar-compact">
        {/* Transport Controls */}
        <div className="audio-compact-transport">
          {queue.length > 1 && (
            <button
              className="audio-btn-ctrl-compact"
              onClick={prevVerse}
              disabled={currentIndex <= 0}
              title="Versículo anterior"
              aria-label="Versículo anterior"
            >
              <SkipBack size={13} />
            </button>
          )}

          {/* Play button wrapped in a verse-progress ring */}
          <div className="audio-play-ring-wrap" title={isPlaying ? 'Pausar' : 'Reproducir'}>
            <svg className="audio-play-ring" viewBox="0 0 36 36" aria-hidden="true">
              <circle className="audio-play-ring-track" cx="18" cy="18" r={RING_RADIUS} />
              {activeEngineType === 'voicebox' && duration > 0 && (
                <circle
                  className="audio-play-ring-progress"
                  cx="18"
                  cy="18"
                  r={RING_RADIUS}
                  strokeDasharray={RING_CIRCUMFERENCE}
                  strokeDashoffset={ringOffset}
                />
              )}
            </svg>
            <button
              className={`audio-btn-play-compact ${isGenerating ? 'loading' : ''}`}
              onClick={playbackState === 'playing' ? pause : resume}
              disabled={isGenerating}
              aria-label={playbackState === 'playing' ? 'Pausar' : 'Reproducir'}
            >
              {isGenerating ? (
                <div className="audio-spinner-small" />
              ) : playbackState === 'playing' ? (
                <Pause size={13} />
              ) : (
                <Play size={13} style={{ marginLeft: '1px' }} />
              )}
            </button>
          </div>

          {queue.length > 1 && (
            <button
              className="audio-btn-ctrl-compact"
              onClick={nextVerse}
              disabled={currentIndex >= queue.length - 1}
              title="Versículo siguiente"
              aria-label="Versículo siguiente"
            >
              <SkipForward size={13} />
            </button>
          )}
        </div>

        <div className="audio-compact-divider" />

        {/* Passage Info Tag */}
        <div className="audio-compact-passage">
          <span className="audio-compact-title">{passageLabel}</span>
          <span className="audio-compact-secondary">· {secondaryLabel}</span>
          <span
            className={`audio-engine-dot ${activeEngineType === 'voicebox' ? 'voicebox' : 'system'}`}
            title={activeEngineType === 'voicebox' ? 'Voicebox Local' : 'Voz del Sistema'}
          />
        </div>

        {/* Speed Pill */}
        <button
          className="audio-compact-speed-btn"
          onClick={cycleSpeed}
          title="Velocidad de lectura"
          aria-label={`Velocidad ${speed}x`}
        >
          {speed}×
        </button>

        {/* Close Button */}
        <button
          className="audio-compact-close-btn"
          onClick={closeAudioBar}
          title="Cerrar reproductor"
          aria-label="Cerrar reproductor"
        >
          <X size={13} />
        </button>
      </div>
    </div>
  );
};
