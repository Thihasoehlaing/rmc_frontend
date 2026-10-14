import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { ActionLoadingService } from '../services/action-loading.service';
import { documentLoadingInterceptor } from './document-loading.interceptor';

describe('documentLoadingInterceptor', () => {
  let http: HttpClient;
  let requests: HttpTestingController;
  let loading: ActionLoadingService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [
      provideHttpClient(withInterceptors([documentLoadingInterceptor])),
      provideHttpClientTesting(),
    ] });
    http = TestBed.inject(HttpClient);
    requests = TestBed.inject(HttpTestingController);
    loading = TestBed.inject(ActionLoadingService);
  });

  afterEach(() => requests.verify());

  it('covers reads and writes and waits for concurrent responses', () => {
    http.get('/forms').subscribe();
    http.put('/draft', {}).subscribe();
    expect(loading.state()).not.toBeNull();
    requests.expectOne('/draft').flush({});
    expect(loading.state()).not.toBeNull();
    requests.expectOne('/forms').flush({});
    expect(loading.state()).toBeNull();
  });

  it('releases the loader after an API error', () => {
    http.post('/submit', {}).subscribe({ error: () => {} });
    requests.expectOne('/submit').flush({}, { status: 500, statusText: 'Error' });
    expect(loading.state()).toBeNull();
  });

  it('releases the loader when a request is cancelled', () => {
    const subscription = http.delete('/item').subscribe();
    const request = requests.expectOne('/item');
    subscription.unsubscribe();
    expect(request.cancelled).toBe(true);
    expect(loading.state()).toBeNull();
  });

  it('does not block document assets', () => {
    http.get('/assets/example.json').subscribe();
    expect(loading.state()).toBeNull();
    requests.expectOne('/assets/example.json').flush({});
  });
});
