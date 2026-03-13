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
 * │ rmc_ahmad        │ rmc123      │ RMC, Admin                                                     │
 * │ reviewer_maria   │ maria123    │ RMC, Reviewer                                                  │
 * │ prof_sarah       │ prof123     │ full_time, academic, HOS, VC                                   │
 * │ dr_john          │ john123     │ full_time, academic                                            │
 * │ dr_ali           │ ali123      │ full_time, academic, HOS, group_ra_gra_hos_pass                │
 * │ contract_bob     │ bob123      │ contract, academic                                             │
 * │ hos_blocked      │ block123    │ full_time, academic, HOS, blocked_hos_rdig (RDIG blocked)      │
 * └──────────────────┴─────────────┴────────────────────────────────────────────────────────────────┘
 */
const DUMMY_USERS: User[] = [
  {
    id: '1',
    name: 'Dr. Ahmad Al-Hassan',
    username: 'rmc_ahmad',
    email: 'ahmad.hassan@apu.edu.my',
    password: 'rmc123',
    // RMC Admin: manages settings, reviews all applications
    groups: ['RMC', 'Admin'],
  },
  {
    id: '2',
    name: 'Dr. Maria Chen',
    username: 'reviewer_maria',
    email: 'maria.chen@apu.edu.my',
    password: 'maria123',
    // Reviewer: has RMC access but explicitly excluded from RDIG submissions
    groups: ['full_time', 'academic', 'Reviewer'],
  },
  {
    id: '3',
    name: 'Prof. Sarah Lee',
    username: 'prof_sarah',
    email: 'sarah.lee@apu.edu.my',
    password: 'prof123',
    // Full-time academic with HOS + VC → can access Conference, Journal applications
    groups: ['full_time', 'academic', 'HOS', 'VC'],
  },
  {
    id: '4',
    name: 'Dr. John Smith',
    username: 'dr_john',
    email: 'john.smith@apu.edu.my',
    password: 'john123',
    // Basic full-time academic → can access RDIG only (no HOS/VC, not a Reviewer)
    groups: ['full_time', 'academic'],
  },
  {
    id: '5',
    name: 'Dr. Ali Hassan',
    username: 'dr_ali',
    email: 'ali.hassan@apu.edu.my',
    password: 'ali123',
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
    // Contract academic → can access RDIG
    groups: ['contract', 'academic'],
  },
  {
    id: '7',
    name: 'Dr. Farah Ibrahim',
    username: 'hos_blocked',
    email: 'farah.ibrahim@apu.edu.my',
    password: 'block123',
    // HOS user on the RDIG block list — 'blocked_hos_rdig' prevents RDIG submission
    groups: ['full_time', 'academic', 'HOS', 'blocked_hos_rdig'],
  },
];

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  /** Internal writable signal — only this service may write to it. */
  private _currentUser = signal<User | null>(null);

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
    return user !== null;
  }

  /** Clear the current session and remove the user signal. */
  logout(): void {
    this._currentUser.set(null);
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
}
