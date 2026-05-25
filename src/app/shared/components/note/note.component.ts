import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FieldNoteComponent } from '../field-note/field-note.component';

@Component({
  selector: 'app-note',
  standalone: true,
  imports: [CommonModule, FieldNoteComponent],
  templateUrl: './note.component.html',
  styleUrls: ['./note.component.scss']
})
export class NoteComponent {
  @Input() text = '';
  /** Deprecated: retained only so existing app-note usages keep compiling. */
  @Input() isTooltip = true;
}
