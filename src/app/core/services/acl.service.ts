import { Injectable, inject } from '@angular/core';
import { PermissionService } from './permission.service';
import { NavPermission } from '../interfaces/permission.interface';
import { UserGroup } from '../interfaces/user.interface';

/**
 * AclService — thin facade over PermissionService.
 *
 * Kept for backward compatibility and as a stable injection token.
 * All real permission logic lives in PermissionService; this service
 * simply delegates to it so existing consumers continue to work without
 * modification.
 */
@Injectable({
  providedIn: 'root',
})
export class AclService {
  private permissionService = inject(PermissionService);

  /** Evaluate a NavPermission rule for the current user. */
  canAccess(permission?: NavPermission): boolean {
    return this.permissionService.canAccess(permission);
  }

  /** True if the current user belongs to the given group. */
  inGroup(group: UserGroup): boolean {
    return this.permissionService.inGroup(group);
  }

  /** True if the current user belongs to at least one of the listed groups. */
  inAnyGroup(groups: UserGroup[]): boolean {
    return this.permissionService.inAnyGroup(groups);
  }

  /** True if the current user belongs to all listed groups. */
  inAllGroups(groups: UserGroup[]): boolean {
    return this.permissionService.inAllGroups(groups);
  }
}
