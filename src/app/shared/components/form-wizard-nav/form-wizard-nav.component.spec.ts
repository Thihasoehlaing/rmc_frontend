import { TestBed } from '@angular/core/testing';
import { describe, expect, it, vi } from 'vitest';
import { FormWizardNavComponent } from './form-wizard-nav.component';

describe('form preview navigation', () => {
  it('disables application writes while keeping Previous available', async () => {
    await TestBed.configureTestingModule({imports: [FormWizardNavComponent]}).compileComponents();
    const fixture = TestBed.createComponent(FormWizardNavComponent);
    fixture.componentRef.setInput('currentStep', 2);
    fixture.componentRef.setInput('totalSteps', 2);
    fixture.componentRef.setInput('actionsDisabled', true);
    const save = vi.fn(); const submit = vi.fn();
    fixture.componentInstance.saveDraft.subscribe(save);
    fixture.componentInstance.submitForm.subscribe(submit);
    fixture.detectChanges();
    const buttons = [...fixture.nativeElement.querySelectorAll('button')] as HTMLButtonElement[];
    const previous = buttons.find(button => button.textContent?.includes('Previous'))!;
    const draft = buttons.find(button => button.textContent?.includes('Save as Draft'))!;
    const send = buttons.find(button => button.textContent?.includes('Submit Application'))!;
    expect(previous.disabled).toBe(false);
    expect(draft.disabled).toBe(true);
    expect(send.disabled).toBe(true);
    draft.click(); send.click();
    expect(save).not.toHaveBeenCalled(); expect(submit).not.toHaveBeenCalled();
  });

  it('keeps Next available during a System Admin preview', () => {
    const fixture = TestBed.createComponent(FormWizardNavComponent);
    fixture.componentRef.setInput('totalSteps', 2);
    fixture.componentRef.setInput('actionsDisabled', true);
    fixture.detectChanges();
    const next = [...fixture.nativeElement.querySelectorAll('button')].find((button: any) => button.textContent.includes('Next')) as HTMLButtonElement;
    expect(next.disabled).toBe(false);
  });
});
