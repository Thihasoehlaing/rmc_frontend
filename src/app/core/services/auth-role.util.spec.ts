import { describe, expect, it } from 'vitest';
import { mapRoleToGroups } from './auth-role.util';
import { showInboxApplicantInfo } from './request-display.util';

describe('Applicant roles and academic eligibility', () => {
  it('keeps non-academic applicants out of academic permission groups', () => {
    expect(mapRoleToGroups('APPLICANT', false)).toEqual(['Applicant']);
    expect(mapRoleToGroups('APPLICANT')).toEqual(['Applicant']);
  });

  it('preserves academic application permissions for eligible applicants', () => {
    expect(mapRoleToGroups('APPLICANT', true)).toEqual(['Applicant', 'full_time', 'academic']);
  });

  it('does not infer academic eligibility from a legacy role', () => {
    expect(mapRoleToGroups('ACADEMIC', false)).toEqual(['Applicant']);
    expect(mapRoleToGroups('LECTURER', false)).toEqual(['Applicant']);
  });

  it('keeps HOS review access independent of academic application eligibility', () => {
    expect(mapRoleToGroups('HEAD_OF_SCHOOL', false)).toEqual(['HOS']);
    expect(mapRoleToGroups('HEAD_OF_SCHOOL', true)).toEqual(['HOS', 'full_time', 'academic']);
  });

  it('does not broaden administrator or reviewer application permissions', () => {
    expect(mapRoleToGroups('SYSTEM_ADMIN', true)).toEqual(['Admin', 'SystemAdmin']);
    expect(mapRoleToGroups('REVIEWER', true)).toEqual(['Reviewer']);
  });

  it('recognizes renamed applicants in Inbox display rules', () => {
    expect(showInboxApplicantInfo('APPLICANT')).toBe(false);
    expect(showInboxApplicantInfo('HUMAN_RESOURCE')).toBe(true);
  });
});
