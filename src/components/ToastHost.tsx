import { useEffect, useState } from 'react';

type ToastMsg = { id: number; text: string };

let nextId = 1;
const listeners = new Set<(toast: ToastMsg) => void>();

export function showToast(text: string) {
  const toast = { id: nextId++, text };
  listeners.forEach((listener) => listener(toast));
}

export function ToastHost() {
  const [toasts, setToasts] = useState<ToastMsg[]>([]);

  useEffect(() => {
    const onToast = (toast: ToastMsg) => {
      setToasts((prev) => [...prev, toast]);
      window.setTimeout(() => {
        setToasts((prev) => prev.filter((item) => item.id !== toast.id));
      }, 1600);
    };
    listeners.add(onToast);
    return () => {
      listeners.delete(onToast);
    };
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="app-toast-stack" aria-live="polite" aria-atomic="true">
      {toasts.map((toast) => (
        <div key={toast.id} className="app-toast glass-surface">
          {toast.text}
        </div>
      ))}
    </div>
  );
}
