import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { environment } from '../../../../environments/environment';
import { ProjectAccountCodeService } from './project-account-code.service';

describe('ProjectAccountCodeService', () => {
  let service: ProjectAccountCodeService;
  let http: HttpTestingController;
  const baseUrl = `${environment.apiUrl}/admin-settings/project-account-codes`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ProjectAccountCodeService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('requests the paginated list with search and status filters', () => {
    service.list({ page: 2, perPage: 10, status: 'active', search: '4100' }).subscribe();

    const request = http.expectOne(`${baseUrl}?page=2&per_page=10&status=active&search=4100`);
    expect(request.request.method).toBe('GET');
    request.flush({
      success: true,
      message: 'Project account codes retrieved successfully',
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

  it('updates a project account code and its shared forms', () => {
    const payload = {
      code: '4100/142',
      description: 'Sponsorship Enterprise',
      is_active: true,
      form_codes: ['CONFERENCE', 'JOURNAL'],
    };
    service.update(1, payload).subscribe();

    const request = http.expectOne(`${baseUrl}/1`);
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual(payload);
    request.flush({
      success: true,
      message: 'Project account code updated successfully',
      data: {
        id: 1,
        ...payload,
        created_at: '2026-06-23T22:46:14',
        updated_at: '2026-07-15T12:00:00',
      },
    });
  });

  it('deletes a project account code by id', () => {
    service.delete(5).subscribe();

    const request = http.expectOne(`${baseUrl}/5`);
    expect(request.request.method).toBe('DELETE');
    request.flush({
      success: true,
      message: 'Project account code deleted successfully',
      data: {
        id: 5,
        code: 'RMC-CONF-2026',
        description: 'Conference project account code',
        is_active: true,
        form_codes: ['CONFERENCE'],
        created_at: '2026-06-24T14:57:14',
        updated_at: '2026-06-24T14:57:14',
      },
    });
  });
});
