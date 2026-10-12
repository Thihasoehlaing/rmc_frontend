import { describe, expect, it } from 'vitest';

import { reportPermission } from '../routing/app-route-permissions';
import { RESTRICTED_WORKFLOW_SIDEBAR_ROUTES } from './restricted-sidebar-routes';

describe('restricted workflow sidebar routes', () => {
  it('keeps Reports visible for HR and Finance workflow users', () => {
    expect(RESTRICTED_WORKFLOW_SIDEBAR_ROUTES).toContain('/reports');
    expect(reportPermission.anyOf).toEqual(expect.arrayContaining(['HR', 'Finance']));
  });
});
