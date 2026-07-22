import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { StepIndicatorComponent } from './step-indicator.component';

describe('StepIndicatorComponent missing-field prompt', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [StepIndicatorComponent] }).compileComponents();
  });

  it('shows the prompt only on red steps with missing fields for six seconds', fakeAsync(() => {
    const fixture = TestBed.createComponent(StepIndicatorComponent);
    fixture.componentRef.setInput('steps', [
      { label: 'Invalid', icon: 'error' },
      { label: 'Valid', icon: 'check' },
    ]);
    fixture.componentRef.setInput('stepStatuses', [
      { visited: true, valid: false, missingFields: ['Required field'] },
      { visited: true, valid: true, missingFields: [] },
    ]);
    fixture.componentRef.setInput('submitAttempted', true);

    fixture.componentInstance.showMissingFieldPrompt();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('.step__missing-prompt').length).toBe(1);
    tick(5999);
    expect(fixture.componentInstance.missingFieldPromptVisible()).toBe(true);
    tick(1);
    expect(fixture.componentInstance.missingFieldPromptVisible()).toBe(false);
  }));

  it('dismisses the prompt when an invalid red step is hovered', () => {
    const fixture = TestBed.createComponent(StepIndicatorComponent);
    fixture.componentRef.setInput('steps', [{ label: 'Invalid', icon: 'error' }]);
    fixture.componentRef.setInput('stepStatuses', [
      { visited: true, valid: false, missingFields: ['Required field'] },
    ]);
    fixture.componentRef.setInput('submitAttempted', true);

    fixture.componentInstance.showMissingFieldPrompt();
    fixture.detectChanges();
    fixture.nativeElement.querySelector('.step').dispatchEvent(new MouseEvent('mousemove'));

    expect(fixture.componentInstance.missingFieldPromptVisible()).toBe(false);
  });
});
