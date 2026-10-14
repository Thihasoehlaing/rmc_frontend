import { Injectable, signal } from '@angular/core';

export interface ActionLoadingState {
  id: number;
  title: string;
  message: string;
}

@Injectable({ providedIn: 'root' })
export class ActionLoadingService {
  private readonly activeAction = signal<ActionLoadingState | null>(null);
  private readonly actions = new Map<number, { state: ActionLoadingState; request: boolean }>();
  private nextId = 0;

  readonly state = this.activeAction.asReadonly();

  begin(
    title: string,
    message = 'Please wait a moment.',
  ): number {
    const id = ++this.nextId;
    this.actions.set(id, { state: { id, title, message }, request: false });
    this.publish();
    return id;
  }

  end(id: number): void {
    this.actions.delete(id);
    this.publish();
  }

  beginRequest(method: string): number {
    const titles: Record<string, string> = {
      GET: 'Loading',
      POST: 'Processing your request',
      PUT: 'Saving your changes',
      PATCH: 'Saving your changes',
      DELETE: 'Removing the selected item',
    };
    const id = ++this.nextId;
    this.actions.set(id, {
      state: { id, title: titles[method] || 'Please wait', message: 'Please wait a moment.' },
      request: true,
    });
    this.publish();
    return id;
  }

  private publish(): void {
    const actions = [...this.actions.values()];
    const manual = actions.filter(action => !action.request);
    this.activeAction.set((manual.at(-1) || actions.at(-1))?.state ?? null);
  }
}
