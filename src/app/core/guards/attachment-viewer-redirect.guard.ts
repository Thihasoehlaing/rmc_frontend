import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { attachmentViewApiUrl, attachmentViewerUrl } from '../services/attachment-viewer-link';

/** Preserve old portal viewer bookmarks; authentication now happens on the resources domain. */
export const attachmentViewerRedirectGuard: CanActivateFn = route => {
  const api = attachmentViewApiUrl(route.queryParamMap.get('path') || '');
  const link = api && attachmentViewerUrl(api, route.queryParamMap.get('name') || 'Attachment');
  if (!link) return inject(Router).createUrlTree(['/not-found']);
  window.location.replace(link);
  return false;
};
