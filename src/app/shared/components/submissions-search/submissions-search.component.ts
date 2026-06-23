import { Component, effect, input, output, signal } from '@angular/core';

@Component({
  selector: 'app-submissions-search',
  imports: [],
  templateUrl: './submissions-search.component.html',
  styleUrl: './submissions-search.component.scss',
})
export class SubmissionsSearchComponent {
  readonly placeholder = input('Search...');
  readonly value = input('');

  readonly search = output<string>();
  readonly valueChange = output<string>();
  readonly refresh = output<void>();
  readonly draftValue = signal('');
  readonly focused = signal(false);

  constructor() {
    effect(() => this.draftValue.set(this.value()));
  }

  onInput(event: Event): void {
    this.draftValue.set((event.target as HTMLInputElement).value);
  }

  submitSearch(): void {
    const query = this.draftValue().trim();
    this.search.emit(query);
    this.valueChange.emit(query);
  }

  refreshSearch(): void {
    this.draftValue.set('');
    this.refresh.emit();
  }
}
