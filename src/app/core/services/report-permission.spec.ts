import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { AuthService } from './auth.service';
import { mapRoleToGroups } from './auth-role.util';
import { PermissionService } from './permission.service';
import { WorkspaceService } from './workspace.service';
import { reportPermission } from '../routing/app-route-permissions';

describe('report access', () => {
  for (const role of ['SYSTEM_ADMIN', 'RMC_ADMIN', 'FINANCE', 'CFO', 'HUMAN_RESOURCE', 'RMC_STAFF', 'RMC', 'APPLICANT', 'HEAD_OF_SCHOOL']) {
    it(`restricts ${role} according to the report role policy`, () => {
      TestBed.configureTestingModule({providers: [
        {provide: AuthService, useValue: {currentUser: () => ({groups: mapRoleToGroups(role)}), mapRoleToGroups}},
        {provide: WorkspaceService, useValue: {current: () => ({role: {code: role}})}},
      ]});
      const service = TestBed.inject(PermissionService);
      expect(service.canAccess(reportPermission)).toBe(['SYSTEM_ADMIN', 'RMC_ADMIN'].includes(role));
    });
  }
});
