import { invoke } from '@tauri-apps/api/core';
import { isWindowsPlatform } from '../utils/platform';

export interface WindowsCapabilities {
  isWindows: boolean;
  buildNumber: number;
  compositionEnabled: boolean;
  supportsMica: boolean;
  supportsDesktopAcrylic: boolean;
  supportsRoundedCorners: boolean;
  supportsSnapLayouts: boolean;
}

export interface WindowsCaptionState {
  focused: boolean;
  maximized: boolean;
  hovered: 'maximize' | null;
}

export interface WindowsCaptionHoverState {
  hovered: 'maximize' | null;
}

export const isTauriEnvironment = (): boolean =>
  typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

export async function getWindowsCapabilities(): Promise<WindowsCapabilities> {
  if (!isTauriEnvironment() || !isWindowsPlatform()) {
    return {
      isWindows: isWindowsPlatform(),
      buildNumber: 0,
      compositionEnabled: false,
      supportsMica: false,
      supportsDesktopAcrylic: false,
      supportsRoundedCorners: false,
      supportsSnapLayouts: false,
    };
  }

  return invoke<WindowsCapabilities>('get_windows_capabilities');
}

export async function setWindowsAppearance(
  colorMode: 'light' | 'dark',
  effectsEnabled: boolean
): Promise<void> {
  if (!isTauriEnvironment() || !isWindowsPlatform()) return;
  await invoke('set_windows_appearance', { colorMode, effectsEnabled });
}

export async function showWindowsSystemMenu(screenX: number, screenY: number): Promise<void> {
  if (!isTauriEnvironment() || !isWindowsPlatform()) return;
  await invoke('show_windows_system_menu', { x: screenX, y: screenY });
}

export async function startWindowsDrag(): Promise<void> {
  if (!isTauriEnvironment() || !isWindowsPlatform()) return;
  await invoke('start_windows_drag');
}
