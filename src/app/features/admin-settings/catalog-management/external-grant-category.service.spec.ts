import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { environment } from '../../../../environments/environment';
import { ExternalGrantCategoryService } from './external-grant-category.service';

describe('ExternalGrantCategoryService', () => {
  let service: ExternalGrantCategoryService;
  let http: HttpTestingController;
  const baseUrl = `${environment.apiBaseUrl}/admin-settings/external-grant-categories`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(ExternalGrantCategoryService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('requests a paginated category list with the supplied status', () => {
    service.list({ page: 2, perPage: 10, status: 'inactive', search: 'International' }).subscribe();

    const request = http.expectOne(
      `${baseUrl}?page=2&per_page=10&status=inactive&search=International`,
    );
    expect(request.request.method).toBe('GET');
    request.flush({
      success: true,
      message: 'Categories retrieved.',
      data: {
        items: [],
        pagination: {
          current_page: 2,
          per_page: 10,
          total_items: 0,
          total_pages: 1,
          has_next: false,
          has_prev: true,
        },
      },
    });
  });

  it('creates a category using the API field names', () => {
    const payload = { code: 'INTERNATIONAL', name: 'International', is_active: true };
    service.create(payload).subscribe();

    const request = http.expectOne(baseUrl);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(payload);
    request.flush({ success: true, message: 'Created.', data: { id: 1, ...payload } });
  });

  it('updates a category by id', () => {
    const payload = {
      code: 'INTERNATIONAL',
      name: 'International Grant',
      is_active: false,
    };
    service.update(1, payload).subscribe();

    const request = http.expectOne(`${baseUrl}/1`);
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual(payload);
    request.flush({ success: true, message: 'Updated.', data: { id: 1, ...payload } });
  });

  it('deletes a category by id', () => {
    service.delete(1).subscribe();

    const request = http.expectOne(`${baseUrl}/1`);
    expect(request.request.method).toBe('DELETE');
    request.flush({
      success: true,
      message: 'Deleted.',
      data: { id: 1, code: 'INTERNATIONAL', name: 'International', is_active: false },
    });
  });
});
