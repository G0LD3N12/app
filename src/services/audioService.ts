import { invoke } from '@tauri-apps/api/core';
import {
  DEFAULT_VOICE_SETTINGS,
  VoiceProfile,
  VoiceSettings,
  VoiceboxStatus,
} from '../types/audio';

const SETTINGS_STORAGE_KEY = 'verbum_voice_settings';

export async function checkVoiceboxStatus(url?: string): Promise<VoiceboxStatus> {
  try {
    return await invoke<VoiceboxStatus>('check_voicebox_status', { url: url || undefined });
  } catch (err: any) {
    return {
      available: false,
      installed: false,
      url: url || 'http://127.0.0.1:17493',
      error: err.toString(),
    };
  }
}

export async function autoSetupVoicebox(endpoint?: string): Promise<import('../types/audio').VoiceboxSetupResult> {
  return await invoke<import('../types/audio').VoiceboxSetupResult>('auto_setup_voicebox', {
    endpoint: endpoint || undefined,
  });
}

export async function getVoiceboxProfiles(url?: string): Promise<VoiceProfile[]> {
  try {
    return await invoke<VoiceProfile[]>('get_voicebox_profiles', { url: url || undefined });
  } catch (err) {
    console.warn('Could not fetch voice profiles from Voicebox:', err);
    return [];
  }
}

export async function getAudioCacheSize(): Promise<number> {
  try {
    return await invoke<number>('get_audio_cache_size');
  } catch (err) {
    console.warn('Could not get audio cache size:', err);
    return 0;
  }
}

export async function clearAudioCache(): Promise<number> {
  try {
    return await invoke<number>('clear_audio_cache');
  } catch (err) {
    console.warn('Could not clear audio cache:', err);
    return 0;
  }
}

export function loadVoiceSettings(): VoiceSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (raw) {
      return { ...DEFAULT_VOICE_SETTINGS, ...JSON.parse(raw) };
    }
  } catch (e) {
    console.warn('Failed to parse voice settings from localStorage:', e);
  }
  return DEFAULT_VOICE_SETTINGS;
}

export function saveVoiceSettings(settings: VoiceSettings): void {
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch (e) {
    console.warn('Failed to save voice settings to localStorage:', e);
  }
}
