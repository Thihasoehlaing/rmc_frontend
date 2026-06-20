import { Component, Input } from '@angular/core';
import { FieldNoteComponent } from '../field-note/field-note.component';

@Component({
  selector: 'app-custom-subheader',
  standalone: true,
  imports: [FieldNoteComponent],
  templateUrl: './custom-subheader.component.html',
  styleUrls: ['./custom-subheader.component.scss']
})
export class CustomSubheaderComponent {
  @Input() iconSvg = '';
  @Input() icon = '';
  @Input() title = '';
  @Input() tooltip = '';
}
