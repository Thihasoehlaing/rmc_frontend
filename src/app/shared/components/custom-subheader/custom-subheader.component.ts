import { Component, Input } from '@angular/core';
import { NoteComponent } from '../note/note.component';

@Component({
  selector: 'app-custom-subheader',
  standalone: true,
  imports: [NoteComponent],
  templateUrl: './custom-subheader.component.html',
  styleUrls: ['./custom-subheader.component.scss']
})
export class CustomSubheaderComponent {
  @Input() iconSvg = '';
  @Input() icon = '';
  @Input() title = '';
  /** Optional tooltip text shown as info icon next to the title */
  @Input() tooltip = '';
}
