import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { PermissionService } from '../services/permission.service';
import { NavPermission } from '../interfaces/permission.interface';

/**
 * Blocks route access when the current user does not satisfy the NavPermission
 * rule attached to route.data.permission.
 *
 * Unauthenticated users are sent to /login.
 * Authenticated users who fail the permission check are sent to /no-access.
 */
export const permissionGuard: CanActivateFn = route => {
  const authService = inject(AuthService);
  const permService = inject(PermissionService);
  const router = inject(Router);

  if (!authService.isAuthenticated()) {
    return router.createUrlTree(['/login']);
  }

  const permission = route.data?.['permission'] as NavPermission | undefined;

  // No restriction on this route: allow all authenticated users.
  if (!permission) return true;

  if (permService.canAccess(permission)) return true;

  const isAdminDraftView =
    route.queryParamMap.get('admin_view')?.toLowerCase() === 'true' &&
    (route.queryParamMap.has('request_id') || route.queryParamMap.has('id')) &&
    authService.inGroup('SystemAdmin');
  if (isAdminDraftView) return true;

  // Authenticated but missing required groups: show a clear forbidden page.
  return router.createUrlTree(['/no-access']);
};
