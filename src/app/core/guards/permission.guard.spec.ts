import '@angular/compiler';

import { describe, expect, it } from 'vitest';

import { permissionGuard } from './permission.guard';

describe('permissionGuard', () => {
  it('should be created', () => {
    expect(permissionGuard).toBeTruthy();
  });
});
