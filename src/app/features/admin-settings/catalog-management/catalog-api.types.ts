export interface CatalogApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface CatalogPagination {
  current_page: number;
  per_page: number;
  total_items: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
}

export type CatalogStatus = 'all' | 'active' | 'inactive';

export type AdminCatalogKind =
  | 'project-account-code'
  | 'external-grant-category'
  | 'country'
  | 'currency';
export type AdminCatalogStatus = 'Active' | 'Inactive';

export interface AdminCatalogItem {
  id: number;
  kind: AdminCatalogKind;
  code?: string;
  symbol?: string;
  name: string;
  status: AdminCatalogStatus;
  appliesTo: string[];
  updatedAt: string;
  countryId?: number | null;
  countryName?: string | null;
}
