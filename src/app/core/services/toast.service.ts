import { Injectable, signal } from '@angular/core';

export type ToastType = 'success' | 'error' | 'info';

export interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private nextId = 0;

  readonly toasts = signal<Toast[]>([]);

  success(message: string): void {
    this.show(message, 'success');
  }

  error(message: string): void {
    this.show(message, 'error', 6000);
  }

  info(message: string): void {
    this.show(message, 'info');
  }

  dismiss(id: number): void {
    this.toasts.update(items => items.filter(item => item.id !== id));
  }

  private show(message: string, type: ToastType, duration = 4500): void {
    const normalizedMessage = message.trim();
    if (!normalizedMessage) return;

    const existing = this.toasts().find(
      toast => toast.message === normalizedMessage && toast.type === type,
    );
    if (existing) return;

    const toast: Toast = {
      id: ++this.nextId,
      message: normalizedMessage,
      type,
    };

    this.toasts.update(items => [...items.slice(-3), toast]);
    window.setTimeout(() => this.dismiss(toast.id), duration);
  }
}
