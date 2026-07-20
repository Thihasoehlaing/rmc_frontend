import { describe, expect, it } from 'vitest';

import { User } from '../../core/interfaces/user.interface';
import { dashboardAudienceFor, dashboardConfigFor } from './dashboard.config';

function user(groups: User['groups']): User {
  return {
    id: '1',
    name: 'Test User',
    username: 'test.user',
    email: 'test@example.com',
    department: 'Research',
    groups,
  };
}

describe('dashboard configuration', () => {
  it('uses the RMC admin dashboard for RMC and admin roles', () => {
    expect(dashboardAudienceFor(user(['RMC', 'Admin', 'Reviewer']))).toBe('rmc_admin');
  });

  it('uses the academic dashboard for all non-RMC users', () => {
    expect(dashboardAudienceFor(user(['full_time', 'academic']))).toBe('academic');
    expect(dashboardAudienceFor(user(['Reviewer']))).toBe('academic');
    expect(dashboardAudienceFor(user(['HOS']))).toBe('academic');
    expect(dashboardConfigFor(null).audience).toBe('academic');
  });
});
