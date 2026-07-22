import { Injectable, inject } from '@angular/core';
import { AuthService } from './auth.service';
import { NavPermission, PermissionCondition } from '../interfaces/permission.interface';
import { UserGroup } from '../interfaces/user.interface';

/**
 * PermissionService — the central authority for all access-control decisions.
 *
 * Implements Attribute-Based Access Control (ABAC) on top of group membership:
 *   - anyOf:        user must belong to at least one listed group
 *   - allOf:        user must belong to ALL listed groups
 *   - excludeGroups: user must NOT belong to any listed group
 *
 * This service is intentionally stateless — it reads the current user from
 * AuthService on every call so it always reflects the live session.
 *
 * Future extensions (ACL, ownership rules, time-based access) can be added
 * here without touching consumers.
 */
@Injectable({
  providedIn: 'root',
})
export class PermissionService {
  private authService = inject(AuthService);

  // ─── Internal helpers ──────────────────────────────────────────────────────

  /** Returns the current user's group list, or [] if not authenticated. */
  private userGroups(): UserGroup[] {
    return this.authService.currentUser()?.groups ?? [];
  }

  // ─── Core evaluation ───────────────────────────────────────────────────────

  /**
   * Evaluate a NavPermission rule for the current user.
   *
   * Returns true  → user may access the item
   * Returns false → user is denied (or not authenticated when rules exist)
   *
   * If `permission` is undefined/null, always returns true (unrestricted).
   */
  canAccess(permission?: NavPermission): boolean {
    if (!permission) return true;
    if (permission.denyAll) return false;

    const groups = this.userGroups();

    // anyCondition: OR-join — pass if ANY one condition set is fully satisfied.
    if (permission.anyCondition && permission.anyCondition.length > 0) {
      return permission.anyCondition.some(cond => this.evalCondition(cond, groups));
    }

    // Flat form: all three constraints must pass (AND-join).
    return this.evalCondition(permission, groups);
  }

  /** Evaluate a single flat condition (AND-join of excludeGroups / anyOf / allOf). */
  private evalCondition(cond: PermissionCondition, groups: UserGroup[]): boolean {
    if (cond.denyAll) return false;
    if (cond.excludeGroups?.some(g => groups.includes(g))) return false;
    if (cond.anyOf?.length && !cond.anyOf.some(g => groups.includes(g))) return false;
    if (cond.allOf?.length && !cond.allOf.every(g => groups.includes(g))) return false;
    return true;
  }

  // ─── Convenience helpers ───────────────────────────────────────────────────

  /** Returns true if the current user belongs to the given group. */
  inGroup(group: UserGroup): boolean {
    return this.userGroups().includes(group);
  }

  /** Returns true if the current user belongs to at least one of the listed groups. */
  inAnyGroup(groups: UserGroup[]): boolean {
    const current = this.userGroups();
    return groups.some(g => current.includes(g));
  }

  /** Returns true if the current user belongs to ALL listed groups. */
  inAllGroups(groups: UserGroup[]): boolean {
    const current = this.userGroups();
    return groups.every(g => current.includes(g));
  }
}
