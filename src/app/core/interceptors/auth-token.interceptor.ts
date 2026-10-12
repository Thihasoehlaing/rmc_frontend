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
  const apiUrl = environment.apiUrl.trim();
  if (!apiUrl) {
    return false;
  }

  try {
    const requestUrl = new URL(url, window.location.origin);
    const configuredApiUrl = new URL(apiUrl, window.location.origin);
    const configuredPath = configuredApiUrl.pathname.replace(/\/$/, '');

    const attachmentBase = new URL(environment.attachmentBaseUrl, window.location.origin);
    const attachmentPath = attachmentBase.pathname.replace(/\/$/, '');
    const relativePath = requestUrl.pathname.slice(attachmentPath.length);
    const isAttachmentRequest = requestUrl.origin === attachmentBase.origin &&
      requestUrl.pathname.startsWith(`${attachmentPath}/`) &&
      (/^\/(?:files|view-files|uploads)\//.test(relativePath) ||
        /^\/requests\/\d+\/attachments\/\d+\/view$/.test(relativePath) ||
        relativePath === '/auth/attachment-view-session');

    return (
      isAttachmentRequest || (requestUrl.origin === configuredApiUrl.origin &&
      (!configuredPath ||
        requestUrl.pathname === configuredPath ||
        requestUrl.pathname.startsWith(`${configuredPath}/`)))
    );
  } catch {
    return false;
  }
}
