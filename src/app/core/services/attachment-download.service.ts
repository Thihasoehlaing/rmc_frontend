import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ToastService } from './toast.service';
import { isRmcApiRequest } from '../interceptors/auth-token.interceptor';

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
    if (preview && !viewer) {
      this.toast.error('Please allow pop-ups for RMC to preview attachments.');
      return;
    }
    const fileUrl = new URL(url, window.location.origin);
    if (preview) fileUrl.pathname = fileUrl.pathname.replace(/\/(?:files|uploads)\//, '/view-files/');
    // The auth interceptor adds the existing bearer token to this protected GET.
    this.http.get(fileUrl.href, { responseType: 'blob' }).subscribe({
      next: (blob) => {
        const objectUrl = URL.createObjectURL(blob);
        if (preview && viewer) {
          if (viewer.closed) { URL.revokeObjectURL(objectUrl); return; }
          viewer.location.href = objectUrl;
          this.releaseWhenClosed(objectUrl, viewer);
        } else {
          this.present(objectUrl, filename, false);
          setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
        }
      },
      error: () => {
        viewer?.close();
        this.toast.error('Unable to open this attachment. You may not have access, or the file is unavailable.');
      },
    });
  }

  private releaseWhenClosed(url: string, viewer: Window): void {
    const release = () => {
      clearInterval(timer);
      URL.revokeObjectURL(url);
      window.removeEventListener('pagehide', release);
    };
    const timer = setInterval(() => { if (viewer.closed) release(); }, 30_000);
    window.addEventListener('pagehide', release, { once: true });
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
