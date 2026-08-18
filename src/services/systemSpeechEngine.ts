import {
  AudioEngine,
  AudioEngineResult,
  AudioPlaybackState,
  NarrationItem,
  VoiceSettings,
} from '../types/audio';

export class SystemSpeechEngine implements AudioEngine {
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private onEndCallback: (() => void) | null = null;
  private rate = 1.0;

  setRate(rate: number) {
    this.rate = Math.max(0.5, Math.min(2, rate));
  }

  async speak(
    item: NarrationItem,
    _settings: VoiceSettings,
    onStatusChange?: (status: AudioPlaybackState) => void
  ): Promise<AudioEngineResult> {
    if (!('speechSynthesis' in window)) {
      throw new Error('Web Speech API is not supported in this environment');
    }

    this.stop();
    onStatusChange?.('ready');

    return new Promise((resolve, reject) => {
      try {
        const utterance = new SpeechSynthesisUtterance(item.text);
        utterance.lang = 'es-ES';

        // Select an appropriate Spanish voice if available
        const voices = window.speechSynthesis.getVoices();
        const esVoice = voices.find(
          (v) => v.lang.startsWith('es') || v.lang.includes('ES') || v.lang.includes('spanish')
        );
        if (esVoice) {
          utterance.voice = esVoice;
        }

        utterance.rate = this.rate;
        utterance.pitch = 1.0;

        utterance.onstart = () => {
          onStatusChange?.('playing');
        };

        utterance.onend = () => {
          onStatusChange?.('completed');
          if (this.onEndCallback) {
            this.onEndCallback();
            this.onEndCallback = null;
          }
        };

        utterance.onerror = (e) => {
          if (e.error !== 'canceled' && e.error !== 'interrupted') {
            onStatusChange?.('failed');
            reject(new Error(`System speech error: ${e.error}`));
          } else {
            onStatusChange?.('cancelled');
          }
        };

        this.currentUtterance = utterance;
        window.speechSynthesis.speak(utterance);

        resolve({ isSystemDirectSpeech: true });
      } catch (err) {
        onStatusChange?.('failed');
        reject(err);
      }
    });
  }

  async stop(): Promise<void> {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    this.currentUtterance = null;
    this.onEndCallback = null;
  }

  pause(): void {
    if (this.currentUtterance && 'speechSynthesis' in window) {
      window.speechSynthesis.pause();
    }
  }

  resume(): void {
    if (this.currentUtterance && 'speechSynthesis' in window) {
      window.speechSynthesis.resume();
    }
  }

  setOnEnd(callback: () => void): void {
    this.onEndCallback = callback;
  }
}
