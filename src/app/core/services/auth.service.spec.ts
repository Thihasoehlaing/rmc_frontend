import { DOCUMENT } from '@angular/common';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthService } from './auth.service';
import { FormCacheService } from './form-cache.service';
import { ToastService } from './toast.service';
import { apiMessageInterceptor, SKIP_API_TOAST } from '../interceptors/api-message.interceptor';
import { sessionExpiryInterceptor } from '../interceptors/session-expiry.interceptor';
import { environment } from '../../../environments/environment';

describe('AuthService logout', () => {
  let service: AuthService;
  let http: HttpTestingController;
  const replace = vi.fn();
  const clear = vi.fn();
  const toast = { error: vi.fn(), success: vi.fn() };
  const cleanupUrl = `${environment.attachmentBaseUrl}/auth/attachment-view-session`;

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
    vi.useRealTimers();
    localStorage.clear();
    sessionStorage.clear();
  });

  it('clears the local session immediately and redirects after successful cleanup', () => {
    localStorage.setItem('token', 'dev:test');
    localStorage.setItem('user', '{}');
    sessionStorage.setItem('rmc_session_user', '{}');
    service.logout();
    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('user')).toBeNull();
    expect(sessionStorage.getItem('rmc_session_user')).toBeNull();
    expect(service.isAuthenticated()).toBe(false);
    expect(clear).toHaveBeenCalledOnce();
    const request = http.expectOne(cleanupUrl);
    expect(request.request.withCredentials).toBe(true);
    expect(request.request.context.get(SKIP_API_TOAST)).toBe(true);
    request.flush({ message: 'Attachment viewer session cleared' });
    expect(replace).toHaveBeenCalledWith('/login');
    expect(toast.success).not.toHaveBeenCalled();
  });

  it('still redirects to APU logout without an error toast when cleanup cannot reach the server', () => {
    localStorage.setItem('token', 'test-token');
    service.logout();
    http.expectOne(cleanupUrl).error(new ProgressEvent('error'));
    const query = new URLSearchParams({ redirect_url: environment.authRedirectUrl });
    expect(replace).toHaveBeenCalledWith(`${environment.authUrl}/logout?${query}`);
    expect(toast.error).not.toHaveBeenCalled();
  });

  it('redirects after five seconds if cookie cleanup hangs', () => {
    vi.useFakeTimers();
    localStorage.setItem('token', 'dev:test');
    service.logout();
    const request = http.expectOne(cleanupUrl);
    vi.advanceTimersByTime(5000);
    expect(request.cancelled).toBe(true);
    expect(replace).toHaveBeenCalledWith('/login');
    expect(toast.error).not.toHaveBeenCalled();
  });

  it('does not repeat logout for multiple clicks or an expired-session cleanup response', () => {
    localStorage.setItem('token', 'dev:test');
    service.logout();
    service.logout();
    http.expectOne(cleanupUrl).flush({ error_code: 40143 }, { status: 401, statusText: 'Unauthorized' });
    http.expectNone(cleanupUrl);
    expect(replace).toHaveBeenCalledOnce();
    expect(toast.error).not.toHaveBeenCalled();
  });
});
