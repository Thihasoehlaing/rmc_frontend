import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SubmissionsTableSkeletonComponent } from './submissions-table-skeleton.component';

describe('SubmissionsTableSkeletonComponent', () => {
  let fixture: ComponentFixture<SubmissionsTableSkeletonComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SubmissionsTableSkeletonComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(SubmissionsTableSkeletonComponent);
  });

  it('renders the configured columns and default five rows', () => {
    fixture.componentRef.setInput('columns', [
      { width: '50%' },
      { width: '30%' },
      { width: '20%' },
    ]);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('thead th')).toHaveLength(3);
    expect(fixture.nativeElement.querySelectorAll('tbody tr')).toHaveLength(5);
  });

  it('renders optional controls and exposes the loading state accessibly', () => {
    fixture.componentRef.setInput('showTypeFilter', true);
    fixture.componentRef.setInput('loadingLabel', 'Loading pending applications');
    fixture.detectChanges();

    const status = fixture.nativeElement.querySelector('[role="status"]');

    expect(status.getAttribute('aria-busy')).toBe('true');
    expect(status.getAttribute('aria-label')).toBe('Loading pending applications');
    expect(fixture.nativeElement.querySelector('.submissions-skeleton__search')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.submissions-skeleton__filter')).toBeTruthy();
  });
});
