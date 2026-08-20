import { useEffect, useState } from 'react';
import { listen, UnlistenFn } from '@tauri-apps/api/event';
import { getCurrentWindow } from '@tauri-apps/api/window';
import {
  isTauriEnvironment,
  WindowsCaptionState,
  WindowsCaptionHoverState,
} from '../services/windowsService';
import { isWindowsPlatform } from '../utils/platform';

const DEFAULT_STATE: WindowsCaptionState = {
  focused: true,
  maximized: false,
  hovered: null,
};

export function useWindowsCaptionState(): WindowsCaptionState {
  const [state, setState] = useState(DEFAULT_STATE);

  useEffect(() => {
    if (!isWindowsPlatform() || !isTauriEnvironment()) return;

    let disposed = false;
    const unlisteners: UnlistenFn[] = [];
    const appWindow = getCurrentWindow();

    void Promise.all([appWindow.isFocused(), appWindow.isMaximized()]).then(
      ([focused, maximized]) => {
        if (!disposed) setState((current) => ({ ...current, focused, maximized }));
      }
    );

    void listen<WindowsCaptionState>('windows-caption-state', ({ payload }) => {
      if (!disposed) setState(payload);
    }).then((unlisten) => unlisteners.push(unlisten));

    void listen<WindowsCaptionHoverState>('windows-caption-hover-state', ({ payload }) => {
      if (!disposed) setState((current) => ({ ...current, hovered: payload.hovered }));
    }).then((unlisten) => unlisteners.push(unlisten));

    void appWindow.onFocusChanged(({ payload: focused }) => {
      if (!disposed) setState((current) => ({ ...current, focused }));
    }).then((unlisten) => unlisteners.push(unlisten));

    void appWindow.onResized(async () => {
      const maximized = await appWindow.isMaximized();
      if (!disposed) setState((current) => ({ ...current, maximized }));
    }).then((unlisten) => unlisteners.push(unlisten));

    return () => {
      disposed = true;
      unlisteners.forEach((unlisten) => unlisten());
    };
  }, []);

  return state;
}
