import { Component, input, output, signal } from '@angular/core';

@Component({
  selector: 'app-submissions-search',
  imports: [],
  templateUrl: './submissions-search.component.html',
  styleUrl: './submissions-search.component.scss',
})
export class SubmissionsSearchComponent {
  readonly placeholder = input('Search...');
  readonly value = input('');

  readonly valueChange = output<string>();
  readonly focused = signal(false);

  onInput(event: Event): void {
    this.valueChange.emit((event.target as HTMLInputElement).value);
  }

  clear(): void {
    this.valueChange.emit('');
  }
}
