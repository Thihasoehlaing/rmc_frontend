import { environment } from '../../../environments/environment';
import { isRmcApiRequest } from '../interceptors/auth-token.interceptor';

/** Only these existing protected file routes may be fetched by a shared viewer. */
export function attachmentViewPath(url: string): string | null {
  if (!isRmcApiRequest(url)) return null;
  const target = new URL(url, window.location.origin);
  for (const base of [environment.attachmentBaseUrl, environment.apiUrl]) {
    const configured = new URL(base, window.location.origin);
    const prefix = configured.pathname.replace(/\/$/, '');
    if (target.origin !== configured.origin || !target.pathname.startsWith(prefix + '/')) continue;
    const path = target.pathname.slice(prefix.length).replace(/^\/(files|uploads)\//, '/view-files/');
    if (/^\/view-files\/.+/.test(path) || /^\/requests\/\d+\/attachments\/\d+\/view$/.test(path)) return path;
  }
  return null;
}

export function attachmentViewerUrl(url: string, filename: string): string | null {
  const path = attachmentViewPath(url);
  if (!path) return null;
  const viewer = new URL('/attachments/view', window.location.origin);
  viewer.searchParams.set('path', path);
  viewer.searchParams.set('name', filename);
  return viewer.href;
}

export function attachmentViewApiUrl(path: string): string | null {
  if (!/^\/view-files\/.+/.test(path) && !/^\/requests\/\d+\/attachments\/\d+\/view$/.test(path)) return null;
  // Fix the origin to configured infrastructure; never accept an arbitrary query URL.
  const base = environment.attachmentBaseUrl.replace(/\/$/, '');
  const target = base + path;
  return attachmentViewPath(target) === path ? target : null;
}
