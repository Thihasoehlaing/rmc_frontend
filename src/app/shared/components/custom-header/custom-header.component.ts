import { Component, Input } from '@angular/core';
import { SvgIconComponent } from '../svg-icon/svg-icon.component';
import { SvgIconDefinition } from '../../icons/svg-icons';

@Component({
  selector: 'app-custom-header',
  standalone: true,
  imports: [SvgIconComponent],
  templateUrl: './custom-header.component.html',
  styleUrls: ['./custom-header.component.scss'],
})
export class CustomHeaderComponent {
  @Input() svgIcon: SvgIconDefinition | null = null;
  @Input() icon = '';
  @Input() title = '';
}
