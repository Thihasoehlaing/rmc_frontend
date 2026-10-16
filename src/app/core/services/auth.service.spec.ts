import { DOCUMENT } from '@angular/common';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthService } from './auth.service';
import { FormCacheService } from './form-cache.service';
import { ToastService } from './toast.service';
import { apiMessageInterceptor } from '../interceptors/api-message.interceptor';
import { sessionExpiryInterceptor } from '../interceptors/session-expiry.interceptor';
import { environment } from '../../../environments/environment';

describe('AuthService logout', () => {
  let service: AuthService;
  let http: HttpTestingController;
  const replace = vi.fn();
  const clear = vi.fn();
  const toast = { error: vi.fn(), success: vi.fn() };

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.clearAllMocks();
    TestBed.configureTestingModule({ providers: [
      provideHttpClient(withInterceptors([sessionExpiryInterceptor, apiMessageInterceptor])),
      provideHttpClientTesting(),
      { provide: Router, useValue: {} },
      { provide: DOCUMENT, useValue: { location: { replace } } },
      { provide: FormCacheService, useValue: { clear } },
      { provide: ToastService, useValue: toast },
    ] });
    service = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    TestBed.resetTestingModule();
    vi.useRealTimers();
    localStorage.clear();
    sessionStorage.clear();
  });

  it('clears local state and redirects immediately without a cookie request', () => {
    localStorage.setItem('token', 'dev:test');
    localStorage.setItem('user', '{}');
    sessionStorage.setItem('rmc_session_user', '{}');
    service.logout();
    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('user')).toBeNull();
    expect(sessionStorage.getItem('rmc_session_user')).toBeNull();
    expect(service.isAuthenticated()).toBe(false);
    expect(clear).toHaveBeenCalledOnce();
    http.expectNone(() => true);
    expect(replace).toHaveBeenCalledWith('/login');
  });

  it('redirects normal sessions to APU logout without an API cleanup request', () => {
    localStorage.setItem('token', 'test-token');
    service.logout();
    http.expectNone(() => true);
    const query = new URLSearchParams({ redirect_url: environment.authRedirectUrl });
    expect(replace).toHaveBeenCalledWith(`${environment.authUrl}/logout?${query}`);
  });

  it('does not repeat logout on multiple clicks', () => {
    localStorage.setItem('token', 'dev:test');
    service.logout(); service.logout();
    expect(replace).toHaveBeenCalledOnce();
    http.expectNone(() => true);
  });

  it('does not make a forms request during testing login', () => {
    const loggedIn = vi.fn();
    service.loginAsTestingUser('test').subscribe(loggedIn);
    http.expectOne(`${environment.apiUrl}/auth/check`).flush({
      success: true,
      data: { user: { id: 1, username: 'test', name: 'Test User', role: null } },
    });
    expect(loggedIn).toHaveBeenCalledOnce();
    expect(service.isAuthenticated()).toBe(true);
    http.expectNone(`${environment.apiUrl}/forms?include_inactive=true`);
  });
});
