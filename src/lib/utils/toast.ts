import { writable } from 'svelte/store';

export type ToastType = 'info' | 'success' | 'error' | 'loading';

export type Toast = {
  id: string;
  message: string;
  type: ToastType;
  duration: number;
};

const toastsStore = writable<Toast[]>([]);

function createToast(message: string, type: ToastType, duration: number) {
  const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const toast: Toast = { id, message, type, duration };

  toastsStore.update((items) => [toast, ...items]);

  if (duration > 0) {
    setTimeout(() => dismiss(id), duration);
  }

  return id;
}

function dismiss(id?: string) {
  if (!id) {
    toastsStore.set([]);
    return;
  }
  toastsStore.update((items) => items.filter((toast) => toast.id !== id));
}

export const toasts = {
  subscribe: toastsStore.subscribe
};

export const toast = {
  info: (message: string, duration = 3000) => createToast(message, 'info', duration),
  success: (message: string, duration = 3000) => createToast(message, 'success', duration),
  error: (message: string, duration = 4000) => createToast(message, 'error', duration),
  loading: (message: string) => createToast(message, 'loading', 0),
  dismiss
};
