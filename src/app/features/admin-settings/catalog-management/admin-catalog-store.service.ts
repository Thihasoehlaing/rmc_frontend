import { Injectable, computed, signal } from '@angular/core';

export type AdminCatalogKind = 'project-account-code' | 'external-grant-category';
export type AdminCatalogStatus = 'Active' | 'Inactive';

export interface AdminCatalogItem {
  id: number;
  kind: AdminCatalogKind;
  code?: string;
  name: string;
  status: AdminCatalogStatus;
  appliesTo: string[];
  updatedAt: string;
}

export interface AdminCatalogItemInput {
  code?: string;
  name: string;
  status: AdminCatalogStatus;
  appliesTo?: string[];
}

const STORAGE_KEY = 'rmc_admin_catalogs_v1';

const DEFAULT_ITEMS: AdminCatalogItem[] = [
  {
    id: 1,
    kind: 'project-account-code',
    code: '4100/142',
    name: 'SPONSORSHIP ENTERPRISE',
    status: 'Active',
    appliesTo: ['Conference Application', 'Journal Application'],
    updatedAt: '2026-07-10T10:59:01+08:00',
  },
  {
    id: 2,
    kind: 'project-account-code',
    code: '4100/143',
    name: 'ICIE CONFERENCE LIABILITY',
    status: 'Active',
    appliesTo: ['Conference Application', 'Journal Application'],
    updatedAt: '2026-07-10T10:59:01+08:00',
  },
  {
    id: 3,
    kind: 'project-account-code',
    code: '4100/144',
    name: 'GCMT CONFERENCE',
    status: 'Active',
    appliesTo: ['Conference Application', 'Journal Application'],
    updatedAt: '2026-07-10T10:59:01+08:00',
  },
  {
    id: 4,
    kind: 'project-account-code',
    code: '4100/863',
    name: 'GRANT CONTROL ACCOUNT',
    status: 'Active',
    appliesTo: ['Conference Application', 'Journal Application'],
    updatedAt: '2026-07-10T10:59:01+08:00',
  },
  ...['National', 'International', 'Private (Industry)', 'Consultancy'].map(
    (name, index): AdminCatalogItem => ({
      id: index + 5,
      kind: 'external-grant-category',
      name,
      status: 'Active',
      appliesTo: [],
      updatedAt: '2026-07-10T10:59:01+08:00',
    }),
  ),
];

/**
 * Frontend repository for the two new admin catalog screens.
 * Replace the persistence methods here with API calls when the backend endpoints are available.
 */
@Injectable({ providedIn: 'root' })
export class AdminCatalogStoreService {
  private readonly itemsSignal = signal<AdminCatalogItem[]>(this.readItems());

  readonly items = this.itemsSignal.asReadonly();
  readonly activeExternalGrantCategories = computed(() =>
    this.itemsSignal().filter(
      (item) => item.kind === 'external-grant-category' && item.status === 'Active',
    ),
  );

  getItems(kind: AdminCatalogKind): AdminCatalogItem[] {
    return this.itemsSignal().filter((item) => item.kind === kind);
  }

  activeProjectAccountCodes(formName: string): AdminCatalogItem[] {
    return this.itemsSignal().filter(
      (item) =>
        item.kind === 'project-account-code' &&
        item.status === 'Active' &&
        item.appliesTo.includes(formName),
    );
  }

  create(kind: AdminCatalogKind, input: AdminCatalogItemInput): void {
    const nextId = this.itemsSignal().reduce((maximum, item) => Math.max(maximum, item.id), 0) + 1;
    this.commit([
      ...this.itemsSignal(),
      {
        id: nextId,
        kind,
        code: input.code?.trim() || undefined,
        name: input.name.trim(),
        status: input.status,
        appliesTo: [...(input.appliesTo ?? [])],
        updatedAt: new Date().toISOString(),
      },
    ]);
  }

  update(id: number, input: AdminCatalogItemInput): void {
    this.commit(
      this.itemsSignal().map((item) =>
        item.id === id
          ? {
              ...item,
              code: input.code?.trim() || undefined,
              name: input.name.trim(),
              status: input.status,
              appliesTo: [...(input.appliesTo ?? [])],
              updatedAt: new Date().toISOString(),
            }
          : item,
      ),
    );
  }

  toggleStatus(id: number): void {
    this.commit(
      this.itemsSignal().map((item) =>
        item.id === id
          ? {
              ...item,
              status: item.status === 'Active' ? 'Inactive' : 'Active',
              updatedAt: new Date().toISOString(),
            }
          : item,
      ),
    );
  }

  delete(id: number): void {
    this.commit(this.itemsSignal().filter((item) => item.id !== id));
  }

  private commit(items: AdminCatalogItem[]): void {
    this.itemsSignal.set(items);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    }
  }

  private readItems(): AdminCatalogItem[] {
    if (typeof localStorage === 'undefined') {
      return DEFAULT_ITEMS;
    }

    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_ITEMS));
      return DEFAULT_ITEMS;
    }

    try {
      const parsed = JSON.parse(stored) as AdminCatalogItem[];
      return Array.isArray(parsed) ? parsed : DEFAULT_ITEMS;
    } catch {
      return DEFAULT_ITEMS;
    }
  }
}
