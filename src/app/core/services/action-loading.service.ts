import { Injectable, signal } from '@angular/core';

export interface ActionLoadingState {
  id: number;
  title: string;
  message: string;
}

@Injectable({ providedIn: 'root' })
export class ActionLoadingService {
  private readonly activeAction = signal<ActionLoadingState | null>(null);
  private nextId = 0;

  readonly state = this.activeAction.asReadonly();

  begin(
    title: string,
    message = 'Please wait while we securely complete this action. Do not close or refresh this page.',
  ): number {
    const id = ++this.nextId;
    this.activeAction.set({ id, title, message });
    return id;
  }

  end(id: number): void {
    if (this.activeAction()?.id === id) {
      this.activeAction.set(null);
    }
  }
}
