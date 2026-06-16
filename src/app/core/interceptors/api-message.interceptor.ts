import {
  HttpContextToken,
  HttpErrorResponse,
  HttpEvent,
  HttpInterceptorFn,
  HttpResponse,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable, catchError, tap, throwError } from 'rxjs';

import { ToastService } from '../services/toast.service';
import { isRmcApiRequest } from './auth-token.interceptor';

export const SHOW_API_SUCCESS = new HttpContextToken<boolean>(() => false);
export const SKIP_API_TOAST = new HttpContextToken<boolean>(() => false);

interface ApiMessageResponse {
  message?: unknown;
}

export const apiMessageInterceptor: HttpInterceptorFn = (
  request,
  next,
): Observable<HttpEvent<unknown>> => {
  if (
    !isRmcApiRequest(request.url) ||
    request.context.get(SKIP_API_TOAST)
  ) {
    return next(request);
  }

  const toastService = inject(ToastService);
  const showSuccess =
    request.context.get(SHOW_API_SUCCESS) ||
    !['GET', 'HEAD', 'OPTIONS'].includes(request.method);

  return next(request).pipe(
    tap(event => {
      if (!(event instanceof HttpResponse) || !showSuccess) return;

      const message = getMessage(event.body);
      if (message) {
        toastService.success(message);
      }
    }),
    catchError((error: unknown) => {
      toastService.error(getErrorMessage(error));
      return throwError(() => error);
    }),
  );
};

function getMessage(body: unknown): string | null {
  if (!body || typeof body !== 'object') return null;

  const message = (body as ApiMessageResponse).message;
  return typeof message === 'string' && message.trim()
    ? message.trim()
    : null;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof HttpErrorResponse) {
    const apiMessage = getMessage(error.error);
    if (apiMessage) return apiMessage;

    if (error.status === 0) {
      return 'The server could not be reached. Please try again.';
    }

    return `Request failed with status ${error.status}.`;
  }

  return 'Something went wrong. Please try again.';
}
