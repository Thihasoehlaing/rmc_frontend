import { Injectable, signal, computed } from '@angular/core';
import { User, UserGroup } from '../interfaces/user.interface';

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

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly SESSION_KEY = 'rmc_session_user';

  /** Internal writable signal — only this service may write to it. */
  private _currentUser = signal<User | null>(null);

  constructor() {
    // Restore the session after a page refresh.
    // We store only the username; the full user object is looked up from the
    // in-memory DUMMY_USERS array so no sensitive data lives in sessionStorage.
    const storedUsername = sessionStorage.getItem(this.SESSION_KEY);
    if (storedUsername) {
      const user = DUMMY_USERS.find(u => u.username === storedUsername) ?? null;
      this._currentUser.set(user);
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
  login(usernameOrEmail: string, password: string): boolean {
    const identifier = usernameOrEmail.trim().toLowerCase();
    const user = DUMMY_USERS.find(
      u =>
        (u.username.toLowerCase() === identifier ||
          u.email.toLowerCase() === identifier) &&
        u.password === password
    ) ?? null;

    this._currentUser.set(user);
    if (user) {
      sessionStorage.setItem(this.SESSION_KEY, user.username);
    }
    return user !== null;
  }

  /** Clear the current session. */
  logout(): void {
    this._currentUser.set(null);
    sessionStorage.removeItem(this.SESSION_KEY);
  }

  /** Returns true if the current user belongs to the given group. */
  inGroup(group: UserGroup): boolean {
    return this._currentUser()?.groups.includes(group) ?? false;
  }

  /** Expose demo accounts for display on the login page. */
  getDemoAccounts(): { username: string; password: string; label: string; groups: string }[] {
    return DUMMY_USERS.map(u => ({
      username: u.username,
      password: u.password,
      label: u.name,
      groups: u.groups.join(', '),
    }));
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
}
