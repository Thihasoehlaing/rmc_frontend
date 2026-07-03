import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

/**
 * Generic "no results" empty state for read-only lists/tables — e.g. a search
 * or filter that matched nothing. Distinct from data-table's default
 * "No entries added yet" message, which implies the viewer can add an entry;
 * use this instead wherever the list is populated externally and the user has
 * no add action available.
 */
@Component({
  selector: 'app-no-entry-found',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './no-entry-found.component.html',
  styleUrl: './no-entry-found.component.scss',
})
export class NoEntryFoundComponent {
  @Input() icon = 'search_off';
  @Input() message = 'No entries found.';
}
