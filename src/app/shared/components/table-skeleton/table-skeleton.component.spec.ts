import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TableSkeletonComponent } from './table-skeleton.component';

describe('TableSkeletonComponent', () => {
  let fixture: ComponentFixture<TableSkeletonComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TableSkeletonComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TableSkeletonComponent);
    fixture.componentRef.setInput('columns', [
      { width: '20%' },
      { width: '30%' },
      { width: '50%' },
    ]);
    fixture.componentRef.setInput('rows', 5);
    fixture.detectChanges();
  });

  it('renders the configured table shape and accessible loading state', () => {
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelectorAll('thead th').length).toBe(3);
    expect(element.querySelectorAll('tbody tr').length).toBe(5);
    expect(element.querySelector('[role="status"]')?.getAttribute('aria-busy')).toBe('true');
  });
});
