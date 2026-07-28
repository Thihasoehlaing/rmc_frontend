import { describe, expect, it } from 'vitest';

import {
  conferencePermission,
  externalProjectDataEntryPermission,
  externalProjectDetailPermission,
  rdigPermission,
} from './app-route-permissions';

describe('conferencePermission', () => {
  it('allows every special group shown the Conference Application navigation item', () => {
    const allowedGroups = conferencePermission.anyCondition.flatMap(
      (condition) => condition.anyOf ?? [],
    );

    expect(allowedGroups).toEqual(expect.arrayContaining(['HOS', 'VC']));
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
