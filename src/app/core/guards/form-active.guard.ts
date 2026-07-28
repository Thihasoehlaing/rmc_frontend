import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';

import { CachedFormOption, FormCacheService } from '../services/form-cache.service';

export function isConfiguredFormActive(
  forms: CachedFormOption[],
  formCode: string,
): boolean {
  const normalizedCode = formCode.trim().toUpperCase();

  return forms.some(
    form =>
      form.form_code.toUpperCase() === normalizedCode &&
      form.is_active !== false,
  );
}

/**
 * Allows a form route only while its configured form is active.
 *
 * The form code comes from route.data.formCode. A forced refresh keeps direct
 * navigation in sync with status changes instead of relying on the sidebar's
 * short-lived cache.
 */
export const formActiveGuard: CanActivateFn = route => {
  const formCache = inject(FormCacheService);
  const router = inject(Router);
  const formCode = String(route.data?.['formCode'] ?? '').trim().toUpperCase();
  const noAccess = router.createUrlTree(['/no-access']);

  if (!formCode) {
    return noAccess;
  }

  return formCache.getForms(true).pipe(
    map(response =>
      isConfiguredFormActive(response.data ?? [], formCode) ? true : noAccess,
    ),
    catchError(() => of(noAccess)),
  );
};
