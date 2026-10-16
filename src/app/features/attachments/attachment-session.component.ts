import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { attachmentViewApiUrl, attachmentViewerUrl } from '../../core/services/attachment-viewer-link';
import { environment } from '../../../environments/environment';

const RETURN_KEY = 'rmc_attachment_viewer_return';

@Component({
  standalone: true,
  selector: 'app-attachment-session',
  template: '<p role="status">Checking RMC session…</p>',
})
export class AttachmentSessionComponent implements OnInit, OnDestroy {
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly resources = new URL(environment.attachmentBaseUrl, window.location.origin);

  private readonly receive = (event: MessageEvent): void => {
    if (window.parent === window || event.source !== window.parent || event.origin !== this.resources.origin ||
        event.data?.type !== 'RMC_ATTACHMENT_SESSION_REQUEST' || typeof event.data.nonce !== 'string' || event.data.nonce.length > 100) return;
    // Only the configured resources parent receives this browser's existing token.
    window.parent.postMessage({type: 'RMC_ATTACHMENT_SESSION_RESPONSE', nonce: event.data.nonce,
      token: this.auth.getAccessToken()}, this.resources.origin);
  };

  ngOnInit(): void {
    if (window.parent !== window) {
      window.addEventListener('message', this.receive);
      window.parent.postMessage({type: 'RMC_ATTACHMENT_SESSION_READY'}, this.resources.origin);
      return;
    }
    const requested = this.route.snapshot.queryParamMap.get('viewer');
    const destination = this.safeDestination(requested ?? sessionStorage.getItem(RETURN_KEY));
    if (!destination) { void this.router.navigateByUrl('/not-found'); return; }
    sessionStorage.setItem(RETURN_KEY, destination);
    if (this.route.snapshot.queryParamMap.get('reauth') === '1') {
      this.auth.startApuLogin('/attachments/session');
    } else if (!this.auth.getAccessToken() || !this.auth.isAuthenticated()) {
      void this.router.navigate(['/login'], {queryParams: {returnTo: '/attachments/session'}});
    } else {
      sessionStorage.removeItem(RETURN_KEY);
      window.location.replace(destination);
    }
  }

  private safeDestination(value: string | null): string | null {
    if (!value) return null;
    try {
      const url = new URL(value);
      const expected = this.resources.pathname.replace(/\/$/, '') + '/attachments/view';
      if (url.origin !== this.resources.origin || url.pathname !== expected) return null;
      const api = attachmentViewApiUrl(url.searchParams.get('path') || '');
      return api ? attachmentViewerUrl(api, url.searchParams.get('name') || 'Attachment') : null;
    } catch { return null; }
  }

  ngOnDestroy(): void { window.removeEventListener('message', this.receive); }
}
