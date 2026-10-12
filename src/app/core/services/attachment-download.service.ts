import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ToastService } from './toast.service';
import { isRmcApiRequest } from '../interceptors/auth-token.interceptor';
import { environment } from '../../../environments/environment';

/** Fetch protected files with the current account, never a shareable storage URL. */
@Injectable({ providedIn: 'root' })
export class AttachmentDownloadService {
  private readonly http = inject(HttpClient);
  private readonly toast = inject(ToastService);

  open(url: string, filename = 'attachment', preview = false): void {
    if (url.startsWith('blob:') || url.startsWith('data:')) {
      this.present(url, filename, preview);
      return;
    }
    if (!isRmcApiRequest(url)) {
      this.toast.error('Please refresh the page to obtain a secure attachment link.');
      return;
    }
    const extension = filename.includes('.') ? filename.split('.').pop()?.toLowerCase() : null;
    if (preview && extension && !['pdf', 'png', 'jpg', 'jpeg', 'gif', 'webp', 'txt'].includes(extension)) {
      this.toast.error('This file cannot be viewed in the browser. Please use Download to open it.');
      return;
    }
    // Open during the click event so browser popup blocking does not prevent viewing.
    const viewer = preview ? globalThis.open?.('about:blank', '_blank') : null;
    if (viewer) {
      viewer.opener = null;
      viewer.document.title = 'Loading attachment';
      viewer.document.body.textContent = 'Loading attachment…';
    }
    if (preview) {
      const viewUrl = new URL(url, window.location.origin);
      viewUrl.pathname = viewUrl.pathname.replace(/\/(?:files|uploads)\//, '/view-files/');
      this.http.post(`${environment.attachmentBaseUrl}/auth/attachment-view-session`, {}, { withCredentials: true }).subscribe({
        next: () => {
          if (viewer && !viewer.closed) viewer.location.href = viewUrl.href;
          else globalThis.open?.(viewUrl.href, '_blank', 'noopener,noreferrer');
        },
        error: () => {
          viewer?.close();
          this.toast.error('Unable to authenticate the attachment viewer. Please sign in again.');
        },
      });
      return;
    }
    this.http.get(url, { responseType: 'blob' }).subscribe({
      next: (blob) => {
        const objectUrl = URL.createObjectURL(blob);
        this.present(objectUrl, filename, false);
        setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
      },
      error: () => {
        viewer?.close();
        this.toast.error('Unable to open this attachment. You may not have access, or the file is unavailable.');
      },
    });
  }

  private present(url: string, filename: string, preview: boolean): void {
    if (preview) {
      globalThis.open?.(url, '_blank', 'noopener,noreferrer');
      return;
    }
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
  }
}
