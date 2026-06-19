import { TestBed } from '@angular/core/testing';
import { ConferenceGuidelinesModalComponent } from './conference-guidelines-modal.component';

describe('ConferenceGuidelinesModalComponent', () => {
  it('emits closed when the custom modal closes', async () => {
    await TestBed.configureTestingModule({
      imports: [ConferenceGuidelinesModalComponent],
    }).compileComponents();

    const fixture = TestBed.createComponent(ConferenceGuidelinesModalComponent);
    const component = fixture.componentInstance;
    let closeCount = 0;
    component.closed.subscribe(() => closeCount++);

    component.open();
    component.close();

    expect(component.isOpen()).toBe(false);
    expect(closeCount).toBe(1);
  });
});
