import { inject } from '@angular/core';
import { map } from 'rxjs';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Blocks unauthenticated access to any protected route.
 * Redirects to /login when no user is logged in.
 */
export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated()) {
    return authService.refreshStoredSession().pipe(
      map(valid => valid || router.createUrlTree(['/login'], { queryParams: { returnTo: state.url } })),
    );
  }

  // Not authenticated — send the user to the login page.
  return router.createUrlTree(['/login'], {
    queryParams: {
      code: route.queryParamMap.get('code'),
      returnTo:
        route.queryParamMap.get('endpoint') ??
        route.queryParamMap.get('returnTo') ??
        state.url,
    },
  });
};
