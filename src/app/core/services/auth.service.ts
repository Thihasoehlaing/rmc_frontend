import { HttpClient, HttpContext, HttpErrorResponse } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, catchError, map, switchMap, tap, throwError } from 'rxjs';

import { environment } from '../../../environments/environment';
import { SHOW_API_SUCCESS } from '../interceptors/api-message.interceptor';
import { User, UserGroup } from '../interfaces/user.interface';
import { FormCacheService } from './form-cache.service';
import { ToastService } from './toast.service';

interface ApuTokenResponse {
  data: {
    groups: string[];
    onPremisesDistinguishedName: string;
  };
  token: string;
  user_id: string;
}

interface AuthCheckResponse {
  data: {
    user: {
      department: string;
      distinguished_name: string;
      email: string;
      id: number;
      name: string;
      photo_url: string | null;
      role: {
        code: string;
        id: number;
        name: string;
      } | null;
      username: string;
    };
  };
  message: string;
  success: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly toastService = inject(ToastService);
  private readonly formCache = inject(FormCacheService);
  private readonly TOKEN_KEY = 'token';
  private readonly USER_KEY = 'user';
  private readonly LEGACY_SESSION_KEY = 'rmc_session_user';

  /** Internal writable signal — only this service may write to it. */
  private _currentUser = signal<User | null>(null);

  constructor() {
    this.removeLegacyAuthCache();

    const storedUser = this.readStoredUser();
    if (storedUser && this.getAccessToken()) {
      this._currentUser.set(this.mapCheckedUser(storedUser));
    }
  }

  /** Read-only view of the currently authenticated user. */
  currentUser = this._currentUser.asReadonly();

  /** Reactive flag — true when a user session is active. */
  isAuthenticated = computed(() => this._currentUser() !== null);

  /**
   * Authenticate using username or email + password.
   * Returns true on success, false when credentials do not match.
   *
   * DEMO ONLY — replace with a real HTTP call in production.
   */
  startApuLogin(returnTo = this.getCurrentRoute()): void {
    this._currentUser.set(null);
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    this.formCache.clear();

    const query = new URLSearchParams({
      endpoint: this.getSafeLoginEndpoint(returnTo),
      redirect_url: this.getRedirectUrl(),
      app_name: environment.authAppName,
    });

    window.location.replace(`${environment.authUrl}/login?${query.toString()}`);
  }

  getCurrentRoute(): string {
    return this.router.url || '/login';
  }

  completeApuLogin(code: string): Observable<User> {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    this.formCache.clear();

    return this.http
      .post<ApuTokenResponse>(`${environment.authUrl}/token`, { code })
      .pipe(
        catchError(error =>
          throwError(() =>
            this.createAuthError('APU token exchange failed', error),
          ),
        ),
        tap(response => this.storeToken(response)),
        switchMap(() =>
          this.checkAuthentication().pipe(
            catchError(error =>
              throwError(() =>
                this.createAuthError('RMC authorization check failed', error),
              ),
            ),
          ),
        ),
        tap(response => {
          localStorage.setItem(
            this.USER_KEY,
            JSON.stringify(response.data.user),
          );
          if (!response.data.user.role) {
            this.toastService.info(
              'Your APU account is authenticated, but no RMC role has been assigned yet.',
            );
          }
        }),
        map(response => this.mapCheckedUser(response.data.user)),
        tap(user => {
          this._currentUser.set(user);
          sessionStorage.removeItem(this.LEGACY_SESSION_KEY);
        }),
        catchError(error => {
          localStorage.removeItem(this.USER_KEY);
          return throwError(() => error);
        }),
      );
  }

  loadProfile(): Observable<User> {
    const apiUrl = environment.apiUrl;

    return this.http
      .get<AuthCheckResponse>(`${apiUrl}/auth/profile`, {
        context: new HttpContext().set(SHOW_API_SUCCESS, true),
      })
      .pipe(
        tap(response => {
          if (!response.success || !response.data?.user) {
            throw new Error(response.message || 'Profile could not be loaded.');
          }

          this.toastService.success(response.message);
        }),
        tap(response => {
          localStorage.setItem(
            this.USER_KEY,
            JSON.stringify(response.data.user),
          );
        }),
        map(response => this.mapCheckedUser(response.data.user)),
        tap(user => this._currentUser.set(user)),
      );
  }

  getAccessToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  getSafeReturnRoute(value: string | null | undefined): string {
    if (!value || !value.startsWith('/') || value.startsWith('//')) {
      return '/dashboard';
    }

    const [route, query = ''] = value.split('?', 2);
    if (route === '/login') {
      return '/dashboard';
    }

    const params = new URLSearchParams(query);
    const endpoint = params.get('endpoint');
    if (endpoint) {
      return this.getSafeReturnRoute(endpoint);
    }

    if (params.has('code')) {
      return route === '/' ? '/dashboard' : route;
    }

    return value;
  }

  login(usernameOrEmail: string, password: string): boolean {
    return false;
  }

  /**
   * Development-only shortcut for local workflow testing.
   * This still goes through the backend auth middleware by using a dev token.
   */
  loginAsTestingUser(username = 'thiha.hlaing'): Observable<User> {
    if (environment.enableTestingLogin !== true) {
      return throwError(() => new Error('Testing login is not available in this environment.'));
    }

    localStorage.setItem(this.TOKEN_KEY, `dev:${username}`);
    localStorage.removeItem(this.USER_KEY);
    this.formCache.clear();
    sessionStorage.removeItem(this.LEGACY_SESSION_KEY);

    return this.checkAuthentication().pipe(
      tap(response => {
        localStorage.setItem(
          this.USER_KEY,
          JSON.stringify(response.data.user),
        );
      }),
      map(response => this.mapCheckedUser(response.data.user)),
      tap(user => this._currentUser.set(user)),
      catchError(error => {
        localStorage.removeItem(this.TOKEN_KEY);
        localStorage.removeItem(this.USER_KEY);
        return throwError(() => this.createAuthError('Testing login failed', error));
      }),
    );
  }

  /** Clear the current session. */
  logout(): void {
    const isTestingSession = this.isTestingAccessToken(this.getAccessToken());
    this.clearStoredSession();

    if (isTestingSession) {
      window.location.replace('/login');
      return;
    }

    const query = new URLSearchParams({ redirect_url: this.getRedirectUrl() });
    window.location.replace(`${environment.authUrl}/logout?${query.toString()}`);
  }

  /** Returns true if the current user belongs to the given group. */
  inGroup(group: UserGroup): boolean {
    return this._currentUser()?.groups.includes(group) ?? false;
  }

  private storeToken(response: ApuTokenResponse): void {
    if (!response?.token) {
      throw new Error('APU authentication did not return an access token.');
    }

    localStorage.setItem(this.TOKEN_KEY, response.token);
  }

  private checkAuthentication(): Observable<AuthCheckResponse> {
    const apiUrl = environment.apiUrl;

    return this.http
      .get<AuthCheckResponse>(`${apiUrl}/auth/check`)
      .pipe(
        tap(response => {
          if (!response.success || !response.data?.user) {
            throw new Error(response.message || 'Authentication check failed.');
          }
        }),
      );
  }

  private mapCheckedUser(
    checkedUser: AuthCheckResponse['data']['user'],
  ): User {
    const role = checkedUser.role ?? undefined;

    return {
      id: String(checkedUser.id),
      name: checkedUser.name || checkedUser.username,
      username: checkedUser.username,
      email: checkedUser.email || '',
      department: checkedUser.department || '',
      distinguishedName: checkedUser.distinguished_name,
      photoUrl: checkedUser.photo_url ?? undefined,
      role,
      groups: this.mapRoleToGroups(role?.code),
    };
  }

  private mapRoleToGroups(roleCode: string | null | undefined): UserGroup[] {
    if (!roleCode) return [];

    const roleGroups: Record<string, UserGroup[]> = {
      SYSTEM_ADMIN: ['Admin', 'SystemAdmin'],
      RMC_ADMIN: ['RMC', 'Admin'],
      RMC_STAFF: ['RMC'],
      RMC: ['RMC'],
      REVIEWER: ['Reviewer'],
      ACADEMIC: ['full_time', 'academic'],
      LECTURER: ['full_time', 'academic'],
      HEAD_OF_SCHOOL: ['full_time', 'academic', 'HOS'],
      HEAD_OF_DEPARTMENT: ['full_time', 'academic', 'HOS'],
      HOS: ['HOS'],
      HOD: ['HOS'],
      VICE_CHANCELLOR: ['VC'],
      VC: ['VC'],
      HUMAN_RESOURCE: ['HR'],
      CEO: ['CEO'],
      FINANCE: ['Finance'],
      CHANCELLORY: ['Chancellory'],
      RDIG_CHAIR: ['RDIG_Chair'],
    };

    return roleGroups[roleCode.trim().toUpperCase()] ?? [];
  }

  private readStoredUser(): AuthCheckResponse['data']['user'] | null {
    const stored = localStorage.getItem(this.USER_KEY);
    if (!stored) return null;

    try {
      return JSON.parse(stored) as AuthCheckResponse['data']['user'];
    } catch {
      localStorage.removeItem(this.USER_KEY);
      return null;
    }
  }

  private removeLegacyAuthCache(): void {
    localStorage.removeItem('u_id');
    localStorage.removeItem('rmc_auth');
    localStorage.removeItem('rmc_auth_profile');
    localStorage.removeItem('rmc_apu_identity');
  }

  private clearStoredSession(): void {
    this._currentUser.set(null);
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    this.removeLegacyAuthCache();
    sessionStorage.removeItem(this.LEGACY_SESSION_KEY);
    this.formCache.clear();
  }

  private isTestingAccessToken(token: string | null): boolean {
    return token?.startsWith('dev:') ?? false;
  }

  private createAuthError(stage: string, error: unknown): Error {
    if (error instanceof HttpErrorResponse) {
      const apiMessage = error.error?.message ?? error.error?.error;
      if (typeof apiMessage === 'string' && apiMessage.trim()) {
        return new Error(`${stage}: ${apiMessage}`);
      }

      if (error.status === 0) {
        return new Error(
          `${stage}: the service could not be reached from the browser.`,
        );
      }

      return new Error(`${stage}: HTTP ${error.status}.`);
    }

    if (error instanceof Error && error.message) {
      return new Error(`${stage}: ${error.message}`);
    }

    return new Error(`${stage}.`);
  }

  private getRedirectUrl(): string {
    return environment.authRedirectUrl || window.location.origin;
  }

  private getSafeLoginEndpoint(value: string | null | undefined): string {
    if (!value || !value.startsWith('/') || value.startsWith('//')) {
      return '/login';
    }

    return value.split('?', 1)[0] || '/login';
  }
}
