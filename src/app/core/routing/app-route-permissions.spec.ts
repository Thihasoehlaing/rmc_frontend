import { describe, expect, it } from 'vitest';

import { conferencePermission } from './app-route-permissions';

describe('conferencePermission', () => {
  it('allows every special group shown the Conference Application navigation item', () => {
    const allowedGroups = conferencePermission.anyCondition.flatMap(
      (condition) => condition.anyOf ?? [],
    );

    expect(allowedGroups).toEqual(expect.arrayContaining(['HOS', 'VC']));
  });
});