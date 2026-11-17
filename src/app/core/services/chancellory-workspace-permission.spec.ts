import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { AuthService } from './auth.service';
import { mapRoleToGroups } from './auth-role.util';
import { PermissionService } from './permission.service';
import { WorkspaceService } from './workspace.service';
import { UserGroup } from '../interfaces/user.interface';
import { fundingApplicationPermission, submissionsDraftPendingPermission, submissionsInboxHistoryPermission, reportPermission, systemSettingsPermission } from '../routing/app-route-permissions';

function permissions(groups: UserGroup[], roleCode: string | null) {
  TestBed.configureTestingModule({providers: [
    {provide: AuthService, useValue: {currentUser: () => ({groups, isAcademicEligible: false}), mapRoleToGroups}},
    {provide: WorkspaceService, useValue: {current: () => ({role: roleCode ? {code: roleCode} : null})}},
  ]});
  return TestBed.inject(PermissionService);
}

describe('Chancellory group with workspace roles', () => {
  it('keeps workflow and form navigation for a member without a separate RMC role', () => {
    const service = permissions(['Chancellory'], null);
    expect(service.canAccess(submissionsInboxHistoryPermission)).toBe(true);
    expect(service.canAccess(submissionsDraftPendingPermission)).toBe(true);
    expect(service.canAccess(fundingApplicationPermission)).toBe(true);
    expect(service.canAccess(reportPermission)).toBe(false);
    expect(service.canAccess(systemSettingsPermission)).toBe(false);
  });

  it('preserves membership alongside an explicit workspace role', () => {
    const service = permissions(['Chancellory'], 'FINANCE');
    expect(service.inGroup('Chancellory')).toBe(true);
    expect(service.inGroup('Finance')).toBe(true);
  });

  it('does not retain a higher platform role after a workspace role override', () => {
    const service = permissions(['Admin', 'RMC', 'Chancellory'], 'APPLICANT');
    expect(service.inGroup('Admin')).toBe(false);
    expect(service.inGroup('RMC')).toBe(false);
    expect(service.inGroup('Chancellory')).toBe(true);
    expect(service.inGroup('Applicant')).toBe(true);
  });

  it('does not grant Chancellory access to a user without membership', () => {
    const service = permissions([], null);
    expect(service.canAccess(submissionsInboxHistoryPermission)).toBe(false);
    expect(service.canAccess(fundingApplicationPermission)).toBe(false);
  });
});
