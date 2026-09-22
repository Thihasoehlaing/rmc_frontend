import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { environment } from '../../../../environments/environment';
import { RdigApiService } from './rdig-api.service';

describe('RdigApiService', () => {
  let service: RdigApiService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(RdigApiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('loads internal co-researchers from the RDIG-specific options endpoint', () => {
    service.listCoResearcherOptions('nur').subscribe();

    const request = http.expectOne(
      (candidate) =>
        candidate.url === `${environment.apiUrl}/rdig/co-researcher-options` &&
        candidate.params.get('search') === 'nur',
    );
    expect(request.request.method).toBe('GET');
    request.flush({ success: true, message: 'ok', data: [] });
  });
});
