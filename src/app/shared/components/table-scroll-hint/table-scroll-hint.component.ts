import { Component } from '@angular/core';

@Component({
  selector: 'app-table-scroll-hint',
  standalone: true,
  template: `
    <p class="table-scroll-hint">
      <span>Scroll to see all columns</span>
      <span class="material-icons scroll-arrow" aria-hidden="true">arrow_forward</span>
    </p>
  `,
})
export class TableScrollHintComponent {}
