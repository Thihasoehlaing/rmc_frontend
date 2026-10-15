import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-field-note',
  standalone: true,
  templateUrl: './field-note.component.html',
  styleUrl: './field-note.component.scss',
})
export class FieldNoteComponent {
  @Input() tone: 'warning' | 'error' = 'warning';
}
