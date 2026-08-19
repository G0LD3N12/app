import React, {
  createContext,
  useContext,
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
} from 'react';
import { invoke } from '@tauri-apps/api/core';
import {
  AudioPlaybackState,
  NarrationItem,
  VoiceSettings,
  VoiceboxStatus,
} from '../types/audio';
import { VoiceboxEngine } from '../services/voiceboxEngine';
import { SystemSpeechEngine } from '../services/systemSpeechEngine';
import {
  checkVoiceboxStatus,
  loadVoiceSettings,
  saveVoiceSettings,
} from '../services/audioService';

interface AudioManagerContextType {
  queue: NarrationItem[];
  currentIndex: number;
  currentItem: NarrationItem | null;
  playbackState: AudioPlaybackState;
  activeEngineType: 'voicebox' | 'system';
  currentTime: number;
  duration: number;
  speed: number;
  voiceSettings: VoiceSettings;
  voiceboxStatus: VoiceboxStatus | null;
  isAudioBarVisible: boolean;
  activeVerseNumber: number | null;
  playChapter: (
    verses: { verseNumber: number; text: string }[],
    bookId: number,
    bookName: string,
    chapter: number,
    translation: string,
    startVerse?: number
  ) => Promise<void>;
  playSelection: (text: string, title?: string, translation?: string) => Promise<void>;
  playStudyExplanation: (text: string, conceptName?: string) => Promise<void>;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  nextVerse: () => void;
  prevVerse: () => void;
  jumpToVerse: (verseNumber: number) => void;
  setSpeed: (speed: number) => void;
  seekTo: (timeInSeconds: number) => void;
  updateVoiceSettings: (newSettings: Partial<VoiceSettings>) => void;
  refreshVoiceboxStatus: () => Promise<VoiceboxStatus>;
  closeAudioBar: () => void;
}

interface NativePlaybackSession {
  seq: number;
  applied_speed: number;
  source_offset_sec: number;
  playback_duration_sec?: number;
}

const AudioManagerContext = createContext<AudioManagerContextType | null>(null);

export const AudioManagerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [voiceSettings, setVoiceSettings] = useState<VoiceSettings>(() => loadVoiceSettings());
  const [voiceboxStatus, setVoiceboxStatus] = useState<VoiceboxStatus | null>(null);
  const [queue, setQueue] = useState<NarrationItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(-1);
  const [playbackState, setPlaybackState] = useState<AudioPlaybackState>('idle');
  const [activeEngineType, setActiveEngineType] = useState<'voicebox' | 'system'>('voicebox');
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [speed, setSpeedState] = useState<number>(voiceSettings.defaultSpeed || 1.0);
  const [isAudioBarVisible, setIsAudioBarVisible] = useState<boolean>(false);

  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const voiceboxEngineRef = useRef<VoiceboxEngine>(new VoiceboxEngine());
  const systemSpeechEngineRef = useRef<SystemSpeechEngine>(new SystemSpeechEngine());
  const prefetchingIndexRef = useRef<number | null>(null);
  const isCancelledRef = useRef<boolean>(false);
  const isNativePausedRef = useRef<boolean>(false);
  const progressIntervalRef = useRef<any>(null);
  // Coalesces rapid speed-button clicks so only the latest requested restart
  // is allowed to take ownership of native playback.
  const speedChangeTokenRef = useRef<number>(0);
  // Token that invalidates async chains when a new playback takes over
  const playTokenRef = useRef<number>(0);
  // Always-fresh view of the queue (including prefetched audio), used by the
  // async advance chain, whose closure over `items` would otherwise go stale
  const queueRef = useRef<NarrationItem[]>([]);
  // Always-fresh values for the async chains. Reading speed/state from a ref
  // (instead of closure capture) is what makes the speed button work: the
  // recursion inside playItemAtIndex would otherwise replay a stale closure
  // with the speed captured when the chapter started playing.
  const speedRef = useRef<number>(speed);
  const currentIndexRef = useRef<number>(currentIndex);
  const activeEngineTypeRef = useRef<'voicebox' | 'system'>(activeEngineType);
  const playbackStateRef = useRef<AudioPlaybackState>(playbackState);
  const settingsRef = useRef<VoiceSettings>(voiceSettings);
  // Audio-content seconds consumed of the verse currently playing
  const audioClockRef = useRef<number>(0);

  useEffect(() => {
    queueRef.current = queue;
  }, [queue]);
  useEffect(() => {
    currentIndexRef.current = currentIndex;
  }, [currentIndex]);
  useEffect(() => {
    activeEngineTypeRef.current = activeEngineType;
  }, [activeEngineType]);
  useEffect(() => {
    playbackStateRef.current = playbackState;
  }, [playbackState]);
  useEffect(() => {
    settingsRef.current = voiceSettings;
  }, [voiceSettings]);

  // Initialize HTML5 Audio element
  useEffect(() => {
    const audio = new Audio();
    audio.preload = 'auto';
    audioElementRef.current = audio;

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleLoadedMetadata = () => {
      setDuration(audio.duration || 0);
    };

    const handleEnded = () => {
      handleTrackEnded();
    };

    const handleError = (e: any) => {
      console.warn('Audio playback error:', e);
      setPlaybackState('failed');
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);

    return () => {
      audio.pause();
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
      audioElementRef.current = null;
    };
  }, []);

  // Check Voicebox status periodically or on mount
  const refreshVoiceboxStatus = useCallback(async () => {
    const status = await checkVoiceboxStatus(voiceSettings.voiceboxUrl);
    setVoiceboxStatus(status);
    return status;
  }, [voiceSettings.voiceboxUrl]);

  useEffect(() => {
    refreshVoiceboxStatus();
  }, [refreshVoiceboxStatus]);

  const updateVoiceSettings = useCallback((newSettings: Partial<VoiceSettings>) => {
    setVoiceSettings((prev) => {
      const merged = { ...prev, ...newSettings };
      saveVoiceSettings(merged);
      return merged;
    });
  }, []);

  const currentItem = useMemo(() => {
    if (currentIndex >= 0 && currentIndex < queue.length) {
      return queue[currentIndex];
    }
    return null;
  }, [queue, currentIndex]);

  const activeVerseNumber = useMemo(() => {
    if (currentItem && currentItem.type === 'verse' && currentItem.location?.verse) {
      return currentItem.location.verse;
    }
    return null;
  }, [currentItem]);

  // Clean stop for all audio sources
  const stop = useCallback(async () => {
    isCancelledRef.current = true;
    playTokenRef.current += 1;
    speedChangeTokenRef.current += 1;
    playbackStateRef.current = 'idle';
    isNativePausedRef.current = false;
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
    if (audioElementRef.current) {
      audioElementRef.current.pause();
      audioElementRef.current.src = '';
    }
    systemSpeechEngineRef.current.stop();
    await voiceboxEngineRef.current.stop();

    setPlaybackState('idle');
    setCurrentTime(0);
    setDuration(0);
    prefetchingIndexRef.current = null;
  }, []);

  const closeAudioBar = useCallback(() => {
    stop();
    setIsAudioBarVisible(false);
  }, [stop]);

  // Single verse / item prefetch
  const prefetchNextItem = useCallback(
    async (nextIdx: number, items: NarrationItem[], settings: VoiceSettings) => {
      // Prefer the freshest queue snapshot: earlier prefetches for this index
      // only live in state, not in the `items` array captured by the caller
      const source = queueRef.current.length ? queueRef.current : items;
      if (nextIdx < 0 || nextIdx >= source.length) return;
      const target = source[nextIdx];
      if (target.audioUrl || target.status === 'ready' || target.status === 'generating') {
        return;
      }

      if (prefetchingIndexRef.current !== null) return;
      prefetchingIndexRef.current = nextIdx;
      setQueue((prev) =>
        prev.map((it, idx) => (idx === nextIdx ? { ...it, status: 'prefetching' } : it))
      );

      try {
        const res = await voiceboxEngineRef.current.speak(target, settings);
        if (res.audioUrl) {
          setQueue((prev) =>
            prev.map((it, idx) =>
              idx === nextIdx
                ? {
                    ...it,
                    audioUrl: res.audioUrl,
                    audioBase64: res.audioBase64,
                    duration: res.duration,
                    status: 'ready',
                  }
                : it
            )
          );
        }
      } catch (e) {
        console.warn(`Prefetch failed for item #${nextIdx}:`, e);
      } finally {
        if (prefetchingIndexRef.current === nextIdx) {
          prefetchingIndexRef.current = null;
        }
      }
    },
    []
  );

  // Play a specific item at index. Rust first confirms the physical playback
  // rate and transformed duration, then verse advancement is driven by the
  // native process exit rather than by the visual progress clock.
  // `resumeFromSec` restarts the verse mid-stream (speed change mid-verse).
  const playItemAtIndex = useCallback(
    async (
      idx: number,
      items: NarrationItem[],
      settings: VoiceSettings,
      resumeFromSec?: number,
      reuseActiveEngine: boolean = false
    ) => {
      if (idx < 0 || idx >= items.length) {
        setPlaybackState('completed');
        return;
      }

      // Any explicit navigation/play request supersedes a pending speed-only
      // restart that may still be waiting for the old process to stop.
      speedChangeTokenRef.current += 1;
      const myToken = ++playTokenRef.current;
      isCancelledRef.current = false;
      setCurrentIndex(idx);
      setIsAudioBarVisible(true);
      const item = items[idx];

      // Check if Voicebox is preferred and available
      const shouldUseVoicebox = settings.preferredEngine === 'voicebox';
      let engineToUse: 'voicebox' | 'system' = shouldUseVoicebox ? 'voicebox' : 'system';

      // A speed-only restart already has a healthy, active Voicebox session.
      // Re-probing HTTP health here adds a noticeable dead spot to the button.
      if (shouldUseVoicebox && !reuseActiveEngine) {
        const vbStatus = await checkVoiceboxStatus(settings.voiceboxUrl);
        setVoiceboxStatus(vbStatus);
        if (!vbStatus.available) {
          engineToUse = 'system';
        }
      }

      if (myToken !== playTokenRef.current) return;
      setActiveEngineType(engineToUse);

      if (engineToUse === 'voicebox') {
        try {
          let audioBase64 = item.audioBase64;
          let dur = item.duration || 3.0;

          if (!audioBase64) {
            setPlaybackState('generating');
            setQueue((prev) =>
              prev.map((it, i) => (i === idx ? { ...it, status: 'generating' } : it))
            );
            const res = await voiceboxEngineRef.current.speak(item, settings);
            if (myToken !== playTokenRef.current) return;
            audioBase64 = res.audioBase64;
            dur = res.duration || dur;
          }

          if (audioBase64) {
            const requestedSpeed = speedRef.current || 1.0;
            const startAt = Math.max(0, Math.min(resumeFromSec || 0, dur - 0.2));

            playbackStateRef.current = 'requested';
            setPlaybackState('requested');
            setDuration(dur);
            setCurrentTime(startAt);
            audioClockRef.current = startAt;

            setQueue((prev) =>
              prev.map((it, i) => (i === idx ? { ...it, audioBase64, duration: dur, status: 'requested' } : it))
            );

            // Trigger sequential prefetch for next item (1 ahead)
            if (idx + 1 < items.length) {
              prefetchNextItem(idx + 1, items, settings);
            }

            // Do not start the ring until Rust confirms that the transformed
            // audio is ready and the native process is actually running.
            const session = await invoke<NativePlaybackSession>('start_native_audio', {
              audioBase64,
              speed: requestedSpeed,
              offsetSec: startAt,
            });
            if (myToken !== playTokenRef.current || isCancelledRef.current) return;

            const appliedSpeed = session.applied_speed;
            speedRef.current = appliedSpeed;
            setSpeedState(appliedSpeed);
            playbackStateRef.current = 'playing';
            setPlaybackState('playing');
            setQueue((prev) =>
              prev.map((it, i) => (i === idx ? { ...it, status: 'playing' } : it))
            );

            // The ring uses the transformed file's measured wall duration,
            // not an optimistic frontend multiplication by the selected rate.
            const remainingSourceSec = Math.max(0, dur - session.source_offset_sec);
            const playbackWallDuration =
              session.playback_duration_sec && session.playback_duration_sec > 0
                ? session.playback_duration_sec
                : remainingSourceSec / appliedSpeed;
            isNativePausedRef.current = false;
            let elapsedWallSec = 0;
            let lastTick = performance.now();

            if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);

            const progressInterval = setInterval(() => {
              if (isCancelledRef.current || myToken !== playTokenRef.current) {
                clearInterval(progressInterval);
                if (progressIntervalRef.current === progressInterval) {
                  progressIntervalRef.current = null;
                }
                return;
              }

              const now = performance.now();
              const delta = (now - lastTick) / 1000;
              lastTick = now;

              if (!isNativePausedRef.current) {
                elapsedWallSec = Math.min(playbackWallDuration, elapsedWallSec + delta);
                const fraction = Math.min(1, elapsedWallSec / Math.max(0.001, playbackWallDuration));
                const currentSec = session.source_offset_sec + remainingSourceSec * fraction;
                audioClockRef.current = currentSec;
                setCurrentTime(Math.min(dur, currentSec));
              }
            }, 80);
            progressIntervalRef.current = progressInterval;

            const outcome = await invoke<'completed' | 'superseded' | 'failed'>('wait_native_audio', {
              seq: session.seq,
            });

            // Clear only this playback session's clock. A speed change may
            // already have installed the replacement session's interval.
            clearInterval(progressInterval);
            if (progressIntervalRef.current === progressInterval) {
              progressIntervalRef.current = null;
            }
            if (myToken !== playTokenRef.current || isCancelledRef.current) return;
            if (outcome === 'superseded') return;

            if (outcome === 'failed') {
              console.warn('Native audio player exited with an error; moving to next item');
            } else {
              audioClockRef.current = dur;
              setCurrentTime(dur);
            }

            // Brief natural breath between verses so transitions feel fluid
            await new Promise((r) => setTimeout(r, 150));
            if (myToken !== playTokenRef.current || isCancelledRef.current) return;

            setQueue((prev) =>
              prev.map((it, i) => (i === idx ? { ...it, status: 'completed' } : it))
            );

            const itemsNow = queueRef.current.length ? queueRef.current : items;
            const nextIdx = idx + 1;
            if (nextIdx < itemsNow.length) {
              playItemAtIndex(nextIdx, itemsNow, settingsRef.current);
            } else {
              setPlaybackState('completed');
            }
          }
        } catch (err: any) {
          if (myToken !== playTokenRef.current) return;
          console.warn('Voicebox failed, falling back to System TTS:', err);
          setActiveEngineType('system');
          // Graceful fallback to System Speech Engine
          await playWithSystemSpeech(item, idx, items, settings);
        }
      } else {
        await playWithSystemSpeech(item, idx, items, settings);
      }
    },
    [prefetchNextItem]
  );

  const playWithSystemSpeech = async (
    item: NarrationItem,
    idx: number,
    items: NarrationItem[],
    settings: VoiceSettings
  ) => {
    try {
      setPlaybackState('playing');
      systemSpeechEngineRef.current.setRate(speedRef.current || 1.0);
      setQueue((prev) =>
        prev.map((it, i) => (i === idx ? { ...it, status: 'playing', engine: 'system' } : it))
      );

      systemSpeechEngineRef.current.setOnEnd(() => {
        if (!isCancelledRef.current) {
          const itemsNow = queueRef.current.length ? queueRef.current : items;
          const nextIdx = idx + 1;
          if (nextIdx < itemsNow.length) {
            playItemAtIndex(nextIdx, itemsNow, settings);
          } else {
            setPlaybackState('completed');
          }
        }
      });

      await systemSpeechEngineRef.current.speak(item, settings);
    } catch (err) {
      console.error('System speech engine failed:', err);
      setPlaybackState('failed');
    }
  };

  const handleTrackEnded = useCallback(() => {
    if (currentIndex + 1 < queue.length) {
      playItemAtIndex(currentIndex + 1, queue, voiceSettings);
    } else {
      setPlaybackState('completed');
    }
  }, [currentIndex, queue, voiceSettings, playItemAtIndex]);

  // Main Action: Play Bible Chapter as continuous audiobook
  const playChapter = useCallback(
    async (
      verses: { verseNumber: number; text: string }[],
      bookId: number,
      bookName: string,
      chapter: number,
      translation: string,
      startVerse: number = 1
    ) => {
      await stop();

      const items: NarrationItem[] = verses.map((v) => ({
        id: `verse-${bookId}-${chapter}-${v.verseNumber}`,
        type: 'verse',
        text: v.text,
        location: {
          bookId,
          bookName,
          chapter,
          verse: v.verseNumber,
        },
        translation,
        engine: voiceSettings.preferredEngine,
        status: 'queued',
      }));

      setQueue(items);
      const startIdx = Math.max(0, verses.findIndex((v) => v.verseNumber >= startVerse));
      playItemAtIndex(startIdx, items, voiceSettings);
    },
    [stop, voiceSettings, playItemAtIndex]
  );

  // Play a single selection
  const playSelection = useCallback(
    async (text: string, title?: string, translation?: string) => {
      await stop();

      const item: NarrationItem = {
        id: `selection-${Date.now()}`,
        type: 'selection',
        text,
        location: {
          bookId: 0,
          bookName: title || 'Selección',
          chapter: 1,
          verse: 1,
        },
        translation,
        engine: voiceSettings.preferredEngine,
        status: 'queued',
      };

      const items = [item];
      setQueue(items);
      playItemAtIndex(0, items, voiceSettings);
    },
    [stop, voiceSettings, playItemAtIndex]
  );

  // Play AI Study Explanation
  const playStudyExplanation = useCallback(
    async (explanationText: string, conceptName?: string) => {
      await stop();

      const item: NarrationItem = {
        id: `study-${Date.now()}`,
        type: 'study',
        text: explanationText,
        location: {
          bookId: 0,
          bookName: conceptName ? `Exégesis: ${conceptName}` : 'Exégesis IA',
          chapter: 1,
          verse: 1,
        },
        engine: voiceSettings.preferredEngine,
        status: 'queued',
      };

      const items = [item];
      setQueue(items);
      playItemAtIndex(0, items, voiceSettings);
    },
    [stop, voiceSettings, playItemAtIndex]
  );

  const pause = useCallback(async () => {
    playbackStateRef.current = 'paused';
    if (activeEngineType === 'voicebox') {
      try {
        await invoke('pause_native_audio');
      } catch {
        // ignore
      }
      isNativePausedRef.current = true;
    } else {
      systemSpeechEngineRef.current.pause();
    }
    setPlaybackState('paused');
  }, [activeEngineType]);

  const resume = useCallback(async () => {
    playbackStateRef.current = 'playing';
    if (activeEngineType === 'voicebox') {
      try {
        await invoke('resume_native_audio');
      } catch {
        // ignore
      }
      isNativePausedRef.current = false;
    } else {
      systemSpeechEngineRef.current.resume();
    }
    setPlaybackState('playing');
  }, [activeEngineType]);

  // Silences the current verse right away when skipping, without tearing down
  // the queue; playItemAtIndex takes over the timeline via its own token.
  const cutNativeAudioNow = useCallback(() => {
    invoke('stop_native_audio').catch(() => {});
  }, []);

  const nextVerse = useCallback(() => {
    if (currentIndex + 1 < queue.length) {
      cutNativeAudioNow();
      playItemAtIndex(currentIndex + 1, queue, voiceSettings);
    }
  }, [currentIndex, queue, voiceSettings, playItemAtIndex, cutNativeAudioNow]);

  const prevVerse = useCallback(() => {
    if (currentIndex > 0) {
      cutNativeAudioNow();
      playItemAtIndex(currentIndex - 1, queue, voiceSettings);
    }
  }, [currentIndex, queue, voiceSettings, playItemAtIndex, cutNativeAudioNow]);

  const jumpToVerse = useCallback(
    (verseNum: number) => {
      const idx = queue.findIndex((it) => it.location?.verse === verseNum);
      if (idx !== -1) {
        cutNativeAudioNow();
        playItemAtIndex(idx, queue, voiceSettings);
      }
    },
    [queue, voiceSettings, playItemAtIndex, cutNativeAudioNow]
  );

  const setSpeed = useCallback(
    (newSpeed: number) => {
      const prevSpeed = speedRef.current;
      const normalizedSpeed = Math.max(0.5, Math.min(2, newSpeed));
      setSpeedState(normalizedSpeed);
      speedRef.current = normalizedSpeed;
      systemSpeechEngineRef.current.setRate(normalizedSpeed);
      if (audioElementRef.current) {
        audioElementRef.current.playbackRate = normalizedSpeed;
      }

      // A native player process cannot be re-rated while running, so apply the
      // new speed immediately by restarting the current verse from the
      // position it was at. The old wait chain resolves 'superseded' and
      // stands down without advancing.
      if (
        prevSpeed !== normalizedSpeed &&
        activeEngineTypeRef.current === 'voicebox' &&
        playbackStateRef.current === 'playing'
      ) {
        const idx = currentIndexRef.current;
        const item = queueRef.current[idx];
        if (item?.audioBase64) {
          const restartAt = audioClockRef.current;
          const changeToken = ++speedChangeTokenRef.current;

          // Invalidate the old async completion chain immediately so it can
          // never advance the queue while native playback is being replaced.
          playTokenRef.current += 1;
          if (progressIntervalRef.current) {
            clearInterval(progressIntervalRef.current);
            progressIntervalRef.current = null;
          }

          void (async () => {
            try {
              await invoke('stop_native_audio');
            } catch {
              // start_native_audio also supersedes the previous process.
            }
            if (
              changeToken !== speedChangeTokenRef.current ||
              playbackStateRef.current !== 'playing' ||
              currentIndexRef.current !== idx
            ) return;
            playItemAtIndex(idx, queueRef.current, settingsRef.current, restartAt, true);
          })();
        }
      }
    },
    [playItemAtIndex]
  );

  const seekTo = useCallback((timeSec: number) => {
    if (audioElementRef.current) {
      audioElementRef.current.currentTime = timeSec;
      setCurrentTime(timeSec);
    }
  }, []);

  const value = useMemo(
    () => ({
      queue,
      currentIndex,
      currentItem,
      playbackState,
      activeEngineType,
      currentTime,
      duration,
      speed,
      voiceSettings,
      voiceboxStatus,
      isAudioBarVisible,
      activeVerseNumber,
      playChapter,
      playSelection,
      playStudyExplanation,
      pause,
      resume,
      stop,
      nextVerse,
      prevVerse,
      jumpToVerse,
      setSpeed,
      seekTo,
      updateVoiceSettings,
      refreshVoiceboxStatus,
      closeAudioBar,
    }),
    [
      queue,
      currentIndex,
      currentItem,
      playbackState,
      activeEngineType,
      currentTime,
      duration,
      speed,
      voiceSettings,
      voiceboxStatus,
      isAudioBarVisible,
      activeVerseNumber,
      playChapter,
      playSelection,
      playStudyExplanation,
      pause,
      resume,
      stop,
      nextVerse,
      prevVerse,
      jumpToVerse,
      setSpeed,
      seekTo,
      updateVoiceSettings,
      refreshVoiceboxStatus,
      closeAudioBar,
    ]
  );

  return <AudioManagerContext.Provider value={value}>{children}</AudioManagerContext.Provider>;
};

export const useAudioManager = (): AudioManagerContextType => {
  const context = useContext(AudioManagerContext);
  if (!context) {
    throw new Error('useAudioManager must be used within an AudioManagerProvider');
  }
  return context;
};
