import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { AuthService } from './auth.service';
import { mapRoleToGroups } from './auth-role.util';
import { PermissionService } from './permission.service';
import { WorkspaceService } from './workspace.service';
import {
  fundingApplicationPermission,
  rdigPermission,
  externalProjectDataEntryPermission,
  submissionsDraftPendingPermission,
  submissionsInboxHistoryPermission,
} from '../routing/app-route-permissions';

describe('Applicant workspace permissions', () => {
  function permissions(academicEligible: boolean, systemAdmin = false) {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: AuthService,
          useValue: {
            currentUser: () => ({ groups: systemAdmin ? ['Admin', 'SystemAdmin'] : ['Applicant'], isAcademicEligible: academicEligible }),
            mapRoleToGroups,
          },
        },
        {
          provide: WorkspaceService,
          useValue: { current: () => ({ role: { code: 'APPLICANT' } }) },
        },
      ],
    });
    return TestBed.inject(PermissionService);
  }

  it('allows non-academic applicants to manage submissions without academic form access', () => {
    const service = permissions(false);
    expect(service.canAccess(submissionsDraftPendingPermission)).toBe(true);
    expect(service.canAccess(submissionsInboxHistoryPermission)).toBe(true);
    expect(service.canAccess(fundingApplicationPermission)).toBe(false);
  });

  it('lets System Admin preview forms while disabling application writes', () => {
    const service = permissions(false, true);
    expect(service.canAccess(fundingApplicationPermission)).toBe(true);
    expect(service.canAccess(rdigPermission)).toBe(true);
    expect(service.canAccess(externalProjectDataEntryPermission)).toBe(true);
    expect(service.applicationActionsDisabled()).toBe(true);
  });

  it('does not disable applicant write actions', () => {
    expect(permissions(true).applicationActionsDisabled()).toBe(false);
  });

  it('preserves academic form access in the selected workspace', () => {
    const service = permissions(true);
    expect(service.canAccess(fundingApplicationPermission)).toBe(true);
  });
});
