import { Injectable, signal } from '@angular/core';

export interface Toast {
  id: number;
  message: string;
  tone: 'default' | 'success' | 'error';
  action?: { label: string; run: () => void };
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  readonly toasts = signal<Toast[]>([]);
  private nextId = 1;
  private readonly timers = new Map<number, ReturnType<typeof setTimeout>>();

  show(message: string, opts: { tone?: Toast['tone']; action?: Toast['action']; duration?: number } = {}): void {
    const toast: Toast = { id: this.nextId++, message, tone: opts.tone ?? 'default', action: opts.action };
    this.toasts.update((list) => [...list.slice(-2), toast]);
    this.timers.set(toast.id, setTimeout(() => this.dismiss(toast.id), opts.duration ?? (opts.action ? 5500 : 3200)));
  }

  success(message: string, action?: Toast['action']): void {
    this.show(message, { tone: 'success', action });
  }

  error(message: string): void {
    this.show(message, { tone: 'error', duration: 5000 });
  }

  dismiss(id: number): void {
    clearTimeout(this.timers.get(id));
    this.timers.delete(id);
    this.toasts.update((list) => list.filter((t) => t.id !== id));
  }
}
