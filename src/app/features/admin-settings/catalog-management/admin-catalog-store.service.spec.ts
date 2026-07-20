// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from 'vitest';
import { AdminCatalogStoreService } from './admin-catalog-store.service';

describe('AdminCatalogStoreService', () => {
  let service: AdminCatalogStoreService;

  beforeEach(() => {
    localStorage.clear();
    service = new AdminCatalogStoreService();
  });

  it('provides externally sourced project account code defaults', () => {
    const rows = service.getItems('project-account-code');

    expect(rows).toHaveLength(4);
    expect(rows[0].code).toBe('4100/142');
    expect(rows[0].appliesTo).toEqual(['Conference Application', 'Journal Application']);
  });

  it('creates and exposes active external grant categories', () => {
    service.create('external-grant-category', {
      name: 'Government Agency',
      status: 'Active',
    });

    expect(service.activeExternalGrantCategories().map((item) => item.name)).toContain(
      'Government Agency',
    );
  });

  it('removes deactivated project account codes from their shared form options', () => {
    const [row] = service.activeProjectAccountCodes('Conference Application');

    service.toggleStatus(row.id);

    expect(
      service
        .activeProjectAccountCodes('Conference Application')
        .some((item) => item.id === row.id),
    ).toBe(false);
  });

  it('persists edits and deletions in local storage', () => {
    const [row] = service.getItems('external-grant-category');
    service.update(row.id, { name: 'Updated Category', status: 'Inactive' });
    service.delete(row.id);

    const persisted = JSON.parse(localStorage.getItem('rmc_admin_catalogs_v1') ?? '[]');
    expect(persisted.some((item: { id: number }) => item.id === row.id)).toBe(false);
  });
});
