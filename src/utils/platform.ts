export type DesktopPlatform = 'windows' | 'macos' | 'linux' | 'other';

export function getDesktopPlatform(): DesktopPlatform {
  if (typeof navigator === 'undefined') return 'other';

  const identity = `${navigator.platform || ''} ${navigator.userAgent || ''}`.toLowerCase();
  if (identity.includes('win')) return 'windows';
  if (identity.includes('mac')) return 'macos';
  if (identity.includes('linux') || identity.includes('x11')) return 'linux';
  return 'other';
}

export const isWindowsPlatform = (): boolean => getDesktopPlatform() === 'windows';

