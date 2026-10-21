import { TestBed } from '@angular/core/testing';
import { FormBuilder } from '@angular/forms';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BatchSittingComponent } from './batch-sitting.component';
import { BatchSittingService } from '../batch-sitting.service';
import { AuthService } from '../../../core/services/auth.service';
import { isApplicantSubmissionWindowOpen } from '../../rdig/rdig_form.component';

describe('Immediate Malaysia batch scheduling', () => {
  let component: BatchSittingComponent;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-21T09:30:00Z'));
    TestBed.configureTestingModule({ providers: [
      FormBuilder,
      { provide: BatchSittingService, useValue: {} },
      { provide: AuthService, useValue: {} },
    ] });
    component = TestBed.runInInjectionContext(() => new BatchSittingComponent());
  });

  afterEach(() => {
    component.ngOnDestroy();
    vi.useRealTimers();
  });

  it('defaults an active batch to now and permits a start less than one hour ahead', () => {
    component.startEditActive();
    expect(component.activeForm.get('startDate')?.value).toBe('2026-10-21T17:30');
    expect(component.activeForm.get('startDate')?.valid).toBe(true);
    component.activeForm.get('startDate')?.setValue('2026-10-21T17:31');
    expect(component.activeForm.get('startDate')?.valid).toBe(true);
  });

  it('allows planned batches now while retaining the past-date guard', () => {
    component.startAddPlanned();
    expect(component.plannedForm.get('startDate')?.value).toBe('2026-10-21T17:30');
    expect(component.plannedForm.get('startDate')?.valid).toBe(true);
    component.plannedForm.get('startDate')?.setValue('2026-10-21T17:31');
    expect(component.plannedForm.get('startDate')?.valid).toBe(true);
    component.plannedForm.get('startDate')?.setValue('2026-10-21T17:29');
    expect(component.plannedForm.get('startDate')?.valid).toBe(false);
  });

  it('opens the applicant form at the exact Malaysia start time', () => {
    const start = '2026-10-21T17:30:00';
    const end = '2026-10-26T23:59:00';
    const now = Date.parse('2026-10-21T09:30:00Z');
    expect(isApplicantSubmissionWindowOpen(true, 'active', start, end, now - 1)).toBe(false);
    expect(isApplicantSubmissionWindowOpen(true, 'active', start, end, now)).toBe(true);
    expect(isApplicantSubmissionWindowOpen(true, 'active', start, end, Date.parse('2026-10-26T15:59:00Z') + 1)).toBe(false);
  });
});
