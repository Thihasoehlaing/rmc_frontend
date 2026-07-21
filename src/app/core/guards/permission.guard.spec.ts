import '@angular/compiler';

import { describe, expect, it } from 'vitest';

import { isExistingRecordDetailUrl, permissionGuard } from './permission.guard';

describe('permissionGuard', () => {
  it('should be created', () => {
    expect(permissionGuard).toBeTruthy();
  });

  it('allows Conference detail routes through the existing-record guard path', () => {
    expect(
      isExistingRecordDetailUrl(
        '/conference/detail/CONF-260008?returnTo=%2Fsubmissions%2Fadmin-history',
      ),
    ).toBe(true);
  });
});
