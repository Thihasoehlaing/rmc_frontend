import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { DataTableComponent } from './data-table.component';

@Component({
  standalone: true,
  imports: [DataTableComponent],
  template: `<app-data-table>
    <ng-template #tableHeader>
      <tr>
        <th><button (click)="reverse.set(!reverse())">Sort requests</button></th>
      </tr>
    </ng-template>
    <ng-template #tableBody>
      @for (row of reverse() ? ['B', 'A'] : ['A', 'B']; track row) {
        <tr>
          <td>{{ row }}</td>
        </tr>
      }
    </ng-template>
  </app-data-table>`,
})
class CustomTableHost {
  reverse = signal(false);
}

describe('Shared table presentation', () => {
  it('preserves custom header actions and reactive body content within one semantic table', () => {
    const fixture = TestBed.createComponent(CustomTableHost);
    fixture.detectChanges();
    const table = fixture.nativeElement.querySelector('table') as HTMLTableElement;
    expect(fixture.nativeElement.querySelectorAll('table')).toHaveLength(1);
    expect(table.querySelector('thead th button')?.textContent).toBe('Sort requests');
    expect(table.querySelectorAll('tbody tr')).toHaveLength(2);
    expect(table.querySelector('tbody td')?.textContent).toBe('A');
    (table.querySelector('thead button') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(table.querySelector('tbody td')?.textContent).toBe('B');
    expect(table.textContent).not.toContain('No entries');
  });

  it('retains column-driven headers, rows, and empty state', () => {
    const fixture = TestBed.createComponent(DataTableComponent);
    fixture.componentRef.setInput('columns', [{ key: 'name', label: 'Applicant' }]);
    fixture.componentRef.setInput('rows', [{ name: 'Sample applicant' }]);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('thead th').textContent).toContain('Applicant');
    expect(fixture.nativeElement.querySelector('tbody td').textContent).toContain(
      'Sample applicant',
    );
    fixture.componentRef.setInput('rows', []);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('tbody td').textContent).toContain('No entries');
    expect(fixture.nativeElement.querySelector('tbody td').colSpan).toBe(1);
  });
});
