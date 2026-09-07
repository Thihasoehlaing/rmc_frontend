import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-table-row-counter',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'table-row-counter',
    '[class.table-row-counter--full]': 'current() >= max()',
  },
  template: `{{ current() }}/{{ max() }}`,
  styleUrl: './table-row-counter.component.scss',
})
export class TableRowCounterComponent {
  readonly current = input(0);
  readonly max = input(0);
}
