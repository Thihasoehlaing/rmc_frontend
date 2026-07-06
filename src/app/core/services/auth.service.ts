import { HttpClient, HttpContext, HttpErrorResponse } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, catchError, map, switchMap, tap, throwError } from 'rxjs';

import { environment } from '../../../environments/environment';
import { SHOW_API_SUCCESS } from '../interceptors/api-message.interceptor';
import { User, UserGroup } from '../interfaces/user.interface';
import { FormCacheService } from './form-cache.service';
import { ToastService } from './toast.service';

/**
 * Dummy user registry for RBAC/ABAC testing.
 *
 * Each user has a set of `groups` that drive all permission decisions.
 * Credentials are plaintext for demo purposes ONLY — a real implementation
 * must authenticate against a secure backend endpoint.
 *
 * Test accounts:
 * ┌──────────────────┬─────────────┬─────────────────────────────────────────────────────┐
 * │ Username         │ Password    │ Groups                                              │
 * ├──────────────────┼─────────────┼─────────────────────────────────────────────────────┤
 * │ rmc_ahmad        │ rmc123      │ RMC, Admin                                          │
 * │ admin_test       │ admin123    │ Admin          ← pure Admin (sees ALL applications) │
 * │ rmc_test         │ rmc321      │ RMC            ← pure RMC  (sees RMC-stage apps)    │
 * │ reviewer_maria   │ maria123    │ Reviewer                                            │
 * │ prof_sarah       │ prof123     │ full_time, academic, HOS, VC                        │
 * │ dr_john          │ john123     │ full_time, academic                                 │
 * │ dr_ali           │ ali123      │ full_time, academic, HOS, group_ra_gra_hos_pass     │
 * │ contract_bob     │ bob123      │ contract, academic                                  │
 * │ hos_blocked      │ block123    │ full_time, academic, HOS, blocked_hos_rdig          │
 * └──────────────────┴─────────────┴─────────────────────────────────────────────────────┘
 */
const DUMMY_USERS: User[] = [
  {
    id: '1',
    name: 'Dr. Ahmad Al-Hassan',
    username: 'rmc_ahmad',
    email: 'ahmad.hassan@apu.edu.my',
    password: 'rmc123',
    department: 'Research Management Centre',
    // RMC Admin: manages settings, reviews all applications
    groups: ['RMC', 'Admin'],
  },
  {
    id: '8',
    name: 'Admin Test',
    username: 'admin_test',
    email: 'admin.test@apu.edu.my',
    password: 'admin123',
    department: 'IT Department',
    // Pure Admin: unrestricted — sees ALL applications regardless of workflow state
    groups: ['Admin'],
  },
  {
    id: '9',
    name: 'RMC Test',
    username: 'rmc_test',
    email: 'rmc.test@apu.edu.my',
    password: 'rmc321',
    department: 'Research Management Centre',
    // Pure RMC: sees only applications where workflow.nextRoles includes "RMC"
    // or they are explicitly listed in workflow.nextUsers
    groups: ['RMC'],
  },
  {
    id: '2',
    name: 'Dr. Maria Chen',
    username: 'reviewer_maria',
    email: 'maria.chen@apu.edu.my',
    password: 'maria123',
    department: 'School of Engineering',
    // Reviewer: ONLY sees applications where workflow.nextUsers includes her id ('2')
    // (explicit assignment by RMC — NOT matched by role name)
    groups: ['full_time', 'academic', 'Reviewer'],
  },
  {
    id: '3',
    name: 'Prof. Sarah Lee',
    username: 'prof_sarah',
    email: 'sarah.lee@apu.edu.my',
    password: 'prof123',
    department: 'School of Business',
    // Full-time academic with HOS + VC → can access Conference, Journal applications
    groups: ['full_time', 'academic', 'HOS'],
  },
  {
    id: '4',
    name: 'Dr. John Smith',
    username: 'dr_john',
    email: 'john.smith@apu.edu.my',
    password: 'john123',
    department: 'School of Business',
    // Basic full-time academic → can access RDIG only (no HOS/VC, not a Reviewer)
    groups: ['full_time', 'academic'],
  },
  {
    id: '5',
    name: 'Dr. Ali Hassan',
    username: 'dr_ali',
    email: 'ali.hassan@apu.edu.my',
    password: 'ali123',
    department: 'School of Computing & Technology',
    // Full-time academic with HOS + RA/GRA pass → can access RA/GRA and RDIG
    // Note: has HOS group, so RDIG excludeGroups: ['HOS'] will block RDIG submission
    groups: ['full_time', 'academic', 'HOS', 'group_ra_gra_hos_pass'],
  },
  {
    id: '6',
    name: 'Bob Tan',
    username: 'contract_bob',
    email: 'bob.tan@apu.edu.my',
    password: 'bob123',
    department: 'School of Media & Design',
    // Contract academic → can access RDIG
    groups: ['contract', 'academic'],
  },
  {
    id: '7',
    name: 'Dr. Farah Ibrahim',
    username: 'hos_blocked',
    email: 'farah.ibrahim@apu.edu.my',
    password: 'block123',
    department: 'School of Engineering',
    // HOS user on the RDIG block list — 'blocked_hos_rdig' prevents RDIG submission
    groups: ['full_time', 'academic', 'HOS', 'blocked_hos_rdig'],
  },
  {
    id: '10',
    name: 'Dr. Chair Test',
    username: 'rdig_chair',
    email: 'chair.test@apu.edu.my',
    password: 'chair123',
    department: 'Research',
    groups: ['RDIG_Chair'],
  },
  {
    id: '11',
    name: 'Prof. VC Test',
    username: 'vc_test',
    email: 'vc.test@apu.edu.my',
    password: 'vc123',
    department: 'University',
    groups: ['VC'],
  },
  {
    id: '12',
    name: 'Mr. CEO Test',
    username: 'ceo_test',
    email: 'ceo.test@apu.edu.my',
    password: 'ceo123',
    department: 'University',
    groups: ['CEO'],
  },
];

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

interface DevAuthUsersResponse {
  data: {
    users: {
      username: string;
      name: string;
      email: string;
      department: string;
      job_title: string | null;
      role: {
        code: string;
        id: number;
        name: string;
      } | null;
    }[];
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
          this.formCache.refresh().subscribe({ error: () => undefined });
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
    const apiUrl = environment.apiUrl.replace(/\/$/, '');

    return this.http
      .get<AuthCheckResponse>(`${apiUrl}/rmc/auth/profile`, {
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
          this.formCache.refresh().subscribe({ error: () => undefined });
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
    if (environment.production) {
      return throwError(() => new Error('Testing login is not available in production.'));
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
        this.formCache.refresh().subscribe({ error: () => undefined });
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
    this._currentUser.set(null);
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    this.removeLegacyAuthCache();
    sessionStorage.removeItem(this.LEGACY_SESSION_KEY);
    this.formCache.clear();

    const query = new URLSearchParams({ redirect_url: this.getRedirectUrl() });
    window.location.replace(`${environment.authUrl}/logout?${query.toString()}`);
  }

  /** Returns true if the current user belongs to the given group. */
  inGroup(group: UserGroup): boolean {
    return this._currentUser()?.groups.includes(group) ?? false;
  }

  /** Expose backend dev-auth accounts for display on the login page. */
  getDemoAccounts(): Observable<{ username: string; label: string; groups: string }[]> {
    const apiUrl = environment.apiUrl.replace(/\/$/, '');

    if (environment.production) {
      return throwError(() => new Error('Testing login is not available in production.'));
    }

    return this.http.get<DevAuthUsersResponse>(`${apiUrl}/rmc/auth/dev-users`).pipe(
      map(response =>
        response.data.users.map(user => ({
          username: user.username,
          label: user.name || user.username,
          groups: [
            user.role?.name || 'No role assigned',
            user.department,
            user.job_title,
          ].filter(Boolean).join(' / '),
        })),
      ),
    );
  }

  /** Returns all users as potential reviewers for assignment dropdowns. */
  getPotentialReviewers(): { id: string; name: string }[] {
    return DUMMY_USERS.map(u => ({ id: u.id, name: u.name }));
  }

  /**
   * Returns eligible internal co-researchers for RDIG applications:
   * (full_time OR contract) AND academic, NOT Reviewer, NOT blocked_hos_rdig.
   * Excludes the currently logged-in user (the project leader).
   */
  getEligibleCoResearchers(): { id: string; name: string; department: string }[] {
    const currentId = this._currentUser()?.id;
    return DUMMY_USERS
      .filter(u =>
        u.id !== currentId &&
        (u.groups.includes('full_time') || u.groups.includes('contract')) &&
        u.groups.includes('academic') &&
        !u.groups.includes('Reviewer') &&
        !u.groups.includes('blocked_hos_rdig')
      )
      .map(u => ({ id: u.id, name: u.name, department: u.department }));
  }

  private storeToken(response: ApuTokenResponse): void {
    if (!response?.token) {
      throw new Error('APU authentication did not return an access token.');
    }

    localStorage.setItem(this.TOKEN_KEY, response.token);
  }

  private checkAuthentication(): Observable<AuthCheckResponse> {
    const apiUrl = environment.apiUrl.replace(/\/$/, '');

    return this.http
      .get<AuthCheckResponse>(`${apiUrl}/rmc/auth/check`)
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
