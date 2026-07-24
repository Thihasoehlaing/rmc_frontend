import { provideHttpClient } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GuidelinesModalComponent } from './guidelines-modal.component';

describe('GuidelinesModalComponent', () => {
  let component: GuidelinesModalComponent;
  let fixture: ComponentFixture<GuidelinesModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GuidelinesModalComponent],
      providers: [provideHttpClient()],
    }).compileComponents();

    fixture = TestBed.createComponent(GuidelinesModalComponent);
    component = fixture.componentInstance;
  });

  it('renders stored table markup in the shared guideline viewer', () => {
    fixture.componentRef.setInput(
      'contentOverride',
      '<table><thead><tr><th>Requirement</th></tr></thead><tbody><tr><td>Completed form</td></tr></tbody></table>',
    );
    fixture.detectChanges();

    component.open();
    fixture.detectChanges();

    const modal = fixture.nativeElement as HTMLElement;
    const table = modal.querySelector('.guidelines-content table');

    expect(table).not.toBeNull();
    expect(table?.querySelector('th')?.textContent).toBe('Requirement');
    expect(table?.querySelector('td')?.textContent).toBe('Completed form');
  });
});
