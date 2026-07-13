import {
  HttpErrorResponse,
  HttpEvent,
  HttpInterceptorFn,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable, catchError, throwError } from 'rxjs';

import { AuthService } from '../services/auth.service';
import { isRmcApiRequest } from './auth-token.interceptor';

const EXPIRED_LOGIN_SESSION_ERROR_CODE = 40143;

interface ApiErrorResponse {
  error_code?: unknown;
}

export const sessionExpiryInterceptor: HttpInterceptorFn = (
  request,
  next,
): Observable<HttpEvent<unknown>> => {
  if (!isRmcApiRequest(request.url)) {
    return next(request);
  }

  const authService = inject(AuthService);

  return next(request).pipe(
    catchError((error: unknown) => {
      handleExpiredLoginSession(error, () => authService.logout());

      return throwError(() => error);
    }),
  );
};

export function handleExpiredLoginSession(
  error: unknown,
  logout: () => void,
): void {
  if (isExpiredLoginSessionError(error)) {
    logout();
  }
}

function isExpiredLoginSessionError(error: unknown): boolean {
  if (!(error instanceof HttpErrorResponse) || error.status !== 401) {
    return false;
  }

  if (!error.error || typeof error.error !== 'object') {
    return false;
  }

  return (
    (error.error as ApiErrorResponse).error_code ===
    EXPIRED_LOGIN_SESSION_ERROR_CODE
  );
}
