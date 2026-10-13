import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { environment } from '../../../environments/environment';
import { FormCacheService } from './form-cache.service';

describe('FormCacheService shared requests', () => {
  let service: FormCacheService;
  let http: HttpTestingController;
  const url = `${environment.apiUrl}/forms?include_inactive=true`;
  const forms = [
    { id: 1, form_code: 'RDIG', form_name: 'RDIG', is_active: true },
    { id: 2, form_code: 'JOURNAL', form_name: 'Journal', is_active: false },
  ];
  const response = { success: true, message: 'Forms retrieved', data: forms };

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(FormCacheService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    localStorage.clear();
  });

  it('shares one request between sidebar and concurrent refresh consumers', () => {
    const sidebar = vi.fn();
    const refresh = vi.fn();
    service.getActiveForms().subscribe(sidebar);
    service.refresh().subscribe(refresh);
    service.getForms(true).subscribe();
    http.expectOne(url).flush(response);
    expect(sidebar.mock.calls[0][0].data).toEqual([forms[0]]);
    expect(refresh.mock.calls[0][0].data).toEqual(forms);
    expect(service.forms()).toEqual(forms);
  });

  it('reuses the completed cache without another sidebar request', () => {
    service.refresh().subscribe();
    http.expectOne(url).flush(response);
    const subscriber = vi.fn();
    service.getActiveForms().subscribe(subscriber);
    http.expectNone(url);
    expect(subscriber.mock.calls[0][0].data).toEqual([forms[0]]);
  });

  it('permits a fresh request after an error', () => {
    service.getForms().subscribe({ error: () => undefined });
    http.expectOne(url).flush({}, { status: 500, statusText: 'Server error' });
    service.getForms().subscribe();
    http.expectOne(url).flush(response);
    expect(service.forms()).toEqual(forms);
  });

  it('allows an explicit refresh after settings change', () => {
    service.getForms().subscribe();
    http.expectOne(url).flush(response);
    service.refresh().subscribe();
    http.expectOne(url).flush({ ...response, data: [] });
    expect(service.forms()).toEqual([]);
  });

  it('cancels old-session requests when the cache is cleared', () => {
    service.getForms().subscribe();
    const oldRequest = http.expectOne(url);
    service.clear();
    expect(oldRequest.cancelled).toBe(true);
    expect(service.forms()).toEqual([]);
    service.getForms().subscribe();
    http.expectOne(url).flush(response);
    expect(service.forms()).toEqual(forms);
  });

  it('recovers from malformed stored cache during service initialization', () => {
    localStorage.setItem('rmc.forms.cache.v2', 'invalid-json');
    const fresh = TestBed.runInInjectionContext(() => new FormCacheService());
    expect(fresh.forms()).toEqual([]);
    expect(localStorage.getItem('rmc.forms.cache.v2')).toBeNull();
    fresh.getForms().subscribe();
    http.expectOne(url).flush(response);
  });
});
