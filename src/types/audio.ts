export type AudioPlaybackState =
  | 'idle'
  | 'requested'
  | 'queued'
  | 'prefetching'
  | 'generating'
  | 'ready'
  | 'playing'
  | 'paused'
  | 'cancelling'
  | 'cancelled'
  | 'completed'
  | 'failed';

export type NarrationType = 'verse' | 'selection' | 'study' | 'chapter';

export interface NarrationItem {
  id: string;
  type: NarrationType;
  text: string;
  location?: {
    bookId: number;
    bookName?: string;
    chapter: number;
    verse?: number;
  };
  translation?: string;
  engine: 'voicebox' | 'system';
  profileId?: string;
  status: AudioPlaybackState;
  generationId?: string;
  audioUrl?: string;
  audioBase64?: string;
  duration?: number;
  error?: string;
}

export interface VoiceProfile {
  id: string;
  name: string;
  engine: string;
  language?: string;
}

export interface VoiceboxStatus {
  available: boolean;
  installed: boolean;
  url: string;
  version?: string;
  active_engine?: string;
  error?: string;
}

export interface VoiceboxSetupResult {
  success: boolean;
  is_running: boolean;
  message: string;
  endpoint: string;
  profiles: VoiceProfile[];
}

export interface SpeechRequest {
  text: string;
  profile_id?: string;
  engine?: string;
  language?: string;
  translation?: string;
  voicebox_url?: string;
  max_cache_mb?: number;
}

export interface SpeechResponse {
  success: boolean;
  audio_base64?: string;
  mime_type: string;
  generation_id?: string;
  cached: boolean;
  error?: string;
}

export interface AudioEngineResult {
  audioUrl?: string;
  audioBase64?: string;
  duration?: number;
  isSystemDirectSpeech?: boolean;
}

export interface AudioEngine {
  speak(
    item: NarrationItem,
    settings: VoiceSettings,
    onStatusChange?: (status: AudioPlaybackState) => void
  ): Promise<AudioEngineResult>;
  stop(): Promise<void>;
  pause(): void;
  resume(): void;
}

export interface VoiceSettings {
  preferredEngine: 'voicebox' | 'system';
  voiceboxUrl: string;
  selectedProfileId: string;
  selectedEngineName: string;
  defaultSpeed: number;
  autoAdvanceChapter: boolean;
  autoScroll: boolean;
  maxCacheMb: number; // 0 for unlimited, 500, 1000, 2000
}

export const DEFAULT_VOICE_SETTINGS: VoiceSettings = {
  preferredEngine: 'voicebox',
  voiceboxUrl: 'http://127.0.0.1:17493',
  selectedProfileId: 'verbum-narrator',
  selectedEngineName: 'qwen',
  defaultSpeed: 1.0,
  autoAdvanceChapter: true,
  autoScroll: true,
  maxCacheMb: 1000,
};
