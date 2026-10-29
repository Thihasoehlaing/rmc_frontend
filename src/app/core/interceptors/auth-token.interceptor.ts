import { HttpInterceptorFn } from '@angular/common/http';

import { environment } from '../../../environments/environment';

const TOKEN_KEY = 'token';

export const authTokenInterceptor: HttpInterceptorFn = (request, next) => {
  const token = localStorage.getItem(TOKEN_KEY);

  if (
    !token ||
    !isRmcApiRequest(request.url)
  ) {
    return next(request);
  }

  const username = JSON.parse(localStorage.getItem('user') || '{}').username || '';
  const workspace = sessionStorage.getItem(`rmc.workspace.${username}`);
  const path = new URL(request.url, window.location.origin).pathname;
  const shared = /\/(?:auth|settings|workspaces|master-data)(?:\/|$)/.test(path) || /\/forms$/.test(path);
  return next(
    request.clone({
      setHeaders: {
        ...(!request.headers.has('Authorization') ? { Authorization: `Bearer ${token}` } : {}),
        ...(workspace && !shared && !request.headers.has('X-Workspace-Code') ? { 'X-Workspace-Code': workspace } : {}),
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
        /^\/requests\/\d+\/attachments\/\d+\/view$/.test(relativePath));

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
