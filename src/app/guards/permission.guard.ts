import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { PermissionService } from '../services/permission.service';
import { AuthService } from '../services/auth.service';
import { NavPermission } from '../interfaces/permission.interface';

/**
 * Blocks route access when the current user does not satisfy the NavPermission
 * rule attached to `route.data.permission`.
 *
 * Route definition example:
 *   {
 *     path: 'rdig',
 *     canActivate: [permissionGuard],
 *     data: {
 *       permission: {
 *         anyOf: ['full_time', 'contract'],
 *         allOf: ['academic'],
 *         excludeGroups: ['Reviewer', 'HOS'],
 *       } satisfies NavPermission
 *     },
 *   }
 *
 * Unauthenticated users are sent to /login.
 * Authenticated users who fail the permission check are sent to /dashboard.
 */
export const permissionGuard: CanActivateFn = (route, _state) => {
  const authService  = inject(AuthService);
  const permService  = inject(PermissionService);
  const router       = inject(Router);

  if (!authService.isAuthenticated()) {
    return router.createUrlTree(['/login']);
  }

  const permission = route.data?.['permission'] as NavPermission | undefined;

  // No restriction on this route — allow all authenticated users.
  if (!permission) return true;

  if (permService.canAccess(permission)) return true;

  // Authenticated but missing required groups — redirect to dashboard.
  return router.createUrlTree(['/dashboard']);
};
