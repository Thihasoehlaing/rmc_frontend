import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-custom-header',
  standalone: true,
  imports: [],
  templateUrl: './custom-header.component.html',
  styleUrls: ['./custom-header.component.scss']
})
export class CustomHeaderComponent {
  @Input() iconSvg = '';
  @Input() icon = '';
  @Input() title = '';
}
