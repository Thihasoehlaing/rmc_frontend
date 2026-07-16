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
