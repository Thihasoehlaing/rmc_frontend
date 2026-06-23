import { Component, Input } from '@angular/core';
import { FieldNoteComponent } from '../field-note/field-note.component';
import { SvgIconComponent } from '../svg-icon/svg-icon.component';
import { SvgIconDefinition } from '../../icons/svg-icons';

@Component({
  selector: 'app-custom-subheader',
  standalone: true,
  imports: [FieldNoteComponent, SvgIconComponent],
  templateUrl: './custom-subheader.component.html',
  styleUrls: ['./custom-subheader.component.scss'],
})
export class CustomSubheaderComponent {
  @Input() svgIcon: SvgIconDefinition | null = null;
  @Input() icon = '';
  @Input() title = '';
  @Input() tooltip = '';
}
