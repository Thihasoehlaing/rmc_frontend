import { HttpInterceptorFn } from '@angular/common/http';

import { environment } from '../../../environments/environment';

const TOKEN_KEY = 'token';

export const authTokenInterceptor: HttpInterceptorFn = (request, next) => {
  const token = localStorage.getItem(TOKEN_KEY);

  if (
    !token ||
    request.headers.has('Authorization') ||
    !isRmcApiRequest(request.url)
  ) {
    return next(request);
  }

  return next(
    request.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`,
      },
    }),
  );
};

export function isRmcApiRequest(url: string): boolean {
  if (/^\/?rmc\//.test(url)) {
    return true;
  }

  const apiUrl = environment.apiUrl.trim();
  if (!apiUrl) {
    return false;
  }

  try {
    const requestUrl = new URL(url, window.location.origin);
    const configuredApiUrl = new URL(apiUrl, window.location.origin);
    const configuredPath = configuredApiUrl.pathname.replace(/\/$/, '');

    return (
      requestUrl.origin === configuredApiUrl.origin &&
      (!configuredPath ||
        requestUrl.pathname === configuredPath ||
        requestUrl.pathname.startsWith(`${configuredPath}/`))
    );
  } catch {
    return false;
  }
}
