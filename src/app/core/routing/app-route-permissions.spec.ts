import { describe, expect, it } from 'vitest';

import { NAVIGATION_DATA } from '../constants/nav-data';
import {
  conferencePermission,
  externalProjectDataEntryPermission,
  externalProjectDetailPermission,
  partnershipPermission,
  ragraPermission,
  rdigPermission,
  travelAuthorizationPermission,
} from './app-route-permissions';

describe('conferencePermission', () => {
  it('allows every special group shown the Conference Application navigation item', () => {
    const allowedGroups = conferencePermission.anyCondition.flatMap(
      (condition) => condition.anyOf ?? [],
    );

    expect(allowedGroups).toEqual(expect.arrayContaining(['HOS', 'VC']));
  });

  it('grants CFO the same reviewer-route access as CEO', () => {
    const allowedGroups = conferencePermission.anyCondition.flatMap(
      (condition) => condition.anyOf ?? [],
    );
    expect(allowedGroups).toEqual(expect.arrayContaining(['CEO', 'CFO']));
  });
});

describe('rdigPermission', () => {
  it('allows eligible academic applicants instead of disabling the feature', () => {
    expect(rdigPermission).toEqual({
      anyOf: ['full_time', 'contract'],
      allOf: ['academic'],
      excludeGroups: ['Reviewer', 'HOS'],
    });
    expect(rdigPermission).not.toHaveProperty('denyAll', true);
  });
});

describe('enabled application permissions', () => {
  it.each([
    ['RA/GRA', ragraPermission],
    ['Partnership', partnershipPermission],
  ])('allows eligible academic applicants to access %s', (_name, permission) => {
    expect(permission).toEqual({
      anyOf: ['full_time', 'contract'],
      allOf: ['academic'],
    });
    expect(permission).not.toHaveProperty('denyAll', true);
  });

  it('allows authenticated non-admin users to access Travel Authorization', () => {
    expect(travelAuthorizationPermission).toEqual({
      excludeGroups: ['Admin'],
    });
    expect(travelAuthorizationPermission).not.toHaveProperty('denyAll', true);
  });

  it('uses the enabled permissions in the Forms sidebar menu', () => {
    const forms = NAVIGATION_DATA.flatMap(group => group.elements).find(
      element => element.label === 'Forms',
    );
    const permissionsByFormCode = Object.fromEntries(
      (forms?.children ?? []).map(item => [item.formCode, item.permission]),
    );

    expect(permissionsByFormCode['RA_GRA']).toBe(ragraPermission);
    expect(permissionsByFormCode['PARTNERSHIP']).toBe(partnershipPermission);
    expect(permissionsByFormCode['TRAVEL_AUTH']).toBe(travelAuthorizationPermission);
  });
});

describe('external project permissions', () => {
  it('allows System Admin and RMC to view detail while keeping form entry RMC-only', () => {
    expect(externalProjectDetailPermission).toEqual({
      anyOf: ['Admin', 'RMC'],
    });
    expect(externalProjectDataEntryPermission).toEqual({
      anyOf: ['RMC'],
    });
  });
});
