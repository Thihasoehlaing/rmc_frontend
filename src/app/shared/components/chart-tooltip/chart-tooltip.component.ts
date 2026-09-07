import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

@Component({
  selector: 'app-chart-tooltip',
  standalone: true,
  templateUrl: './chart-tooltip.component.html',
  styleUrls: ['./chart-tooltip.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChartTooltipComponent {
  @Input() visible = false;
  @Input() inline = false;
  @Input() animate = true;
  @Input() color = 'var(--color-primary)';
  @Input() label = '';
  @Input() value = '';
  @Input() detail = '';
}
