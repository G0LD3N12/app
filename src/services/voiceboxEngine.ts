import { invoke } from '@tauri-apps/api/core';
import {
  AudioEngine,
  AudioEngineResult,
  AudioPlaybackState,
  NarrationItem,
  SpeechRequest,
  SpeechResponse,
  VoiceSettings,
} from '../types/audio';
import { resolveAudioDuration } from '../utils/audioDuration';

export class VoiceboxEngine implements AudioEngine {
  private currentGenerationId?: string;
  private currentVoiceboxUrl?: string;

  async speak(
    item: NarrationItem,
    settings: VoiceSettings,
    onStatusChange?: (status: AudioPlaybackState) => void
  ): Promise<AudioEngineResult> {
    onStatusChange?.('generating');
    this.currentVoiceboxUrl = settings.voiceboxUrl;

    const req: SpeechRequest = {
      text: item.text,
      profile_id: item.profileId || settings.selectedProfileId || undefined,
      engine: settings.selectedEngineName || undefined,
      language: 'es',
      translation: item.translation,
      voicebox_url: settings.voiceboxUrl,
      max_cache_mb: settings.maxCacheMb,
    };

    try {
      const resp = await invoke<SpeechResponse>('synthesize_speech', { request: req });
      if (!resp.success || !resp.audio_base64) {
        throw new Error(resp.error || 'Failed to synthesize speech with Voicebox');
      }

      this.currentGenerationId = resp.generation_id;
      onStatusChange?.('ready');

      // Convert Base64 into playable Blob URL & resolve real duration
      const byteCharacters = atob(resp.audio_base64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const mimeType = resp.mime_type || 'audio/mpeg';
      const blob = new Blob([byteArray], { type: mimeType });
      const audioUrl = URL.createObjectURL(blob);

      // Voicebox returns MP3 (edge-tts); decode the real duration instead of
      // assuming WAV PCM, which cuts every verse after ~12% of its audio.
      const duration = await resolveAudioDuration(byteArray, mimeType);

      return {
        audioUrl,
        audioBase64: resp.audio_base64,
        duration,
      };
    } catch (err: any) {
      onStatusChange?.('failed');
      throw err;
    }
  }

  async stop(): Promise<void> {
    try {
      await invoke('stop_native_audio');
    } catch (e) {
      console.warn('Could not stop native audio playback:', e);
    }

    if (this.currentGenerationId) {
      try {
        await invoke('cancel_speech', {
          url: this.currentVoiceboxUrl,
          generationId: this.currentGenerationId,
        });
      } catch (e) {
        console.warn('Could not send cancel to Voicebox:', e);
      }
      this.currentGenerationId = undefined;
    }
  }

  pause(): void {
    try {
      invoke('stop_native_audio');
    } catch {
      // ignore
    }
  }

  resume(): void {
    // Handled by re-playing item
  }
}
