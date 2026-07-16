import { ComponentFixture, TestBed } from '@angular/core/testing';

import {
  RdigApplicationComponent,
  isApplicantSubmissionWindowOpen,
} from './rdig_form.component';

describe('RdigApplicationComponent', () => {
  let component: RdigApplicationComponent;
  let fixture: ComponentFixture<RdigApplicationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RdigApplicationComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(RdigApplicationComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
describe('isApplicantSubmissionWindowOpen', () => {
  it('accepts the backend decision for a retrieved active batch', () => {
    expect(isApplicantSubmissionWindowOpen(true, 'active', '2026-07-16T16:47:00', '2026-07-31T16:47:00', new Date('2026-07-17T12:00:00').getTime())).toBe(true);
  });

  it('accepts a current Applicant window when the backend decision is unavailable', () => {
    const now = new Date('2026-07-16T12:00:00').getTime();
    expect(
      isApplicantSubmissionWindowOpen(
        true,
        'active',
        '2026-07-16T00:00:00',
        '2026-07-16T23:59:00',
        now,
      ),
    ).toBe(true);
  });

  it('rejects a response with no active batch', () => {
    expect(isApplicantSubmissionWindowOpen(false, 'active', null, null)).toBe(false);
  });
});
