import '@angular/compiler';

import { PaginationComponent } from './pagination.component';

describe('PaginationComponent', () => {
  it('shows a zero end position when there are no results', () => {
    const component = new PaginationComponent();
    component.totalItems = 0;
    component.itemCount = 0;

    expect(component.resultStart).toBe(0);
    expect(component.resultEnd).toBe(0);
  });
});
