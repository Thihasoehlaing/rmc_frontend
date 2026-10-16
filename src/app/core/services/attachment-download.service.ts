import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ToastService } from './toast.service';
import { attachmentViewerUrl } from './attachment-viewer-link';
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
    if (preview) {
      const viewerUrl = attachmentViewerUrl(url, filename);
      if (!viewerUrl) { this.toast.error('This attachment link cannot be previewed. Please refresh the page.'); return; }
      globalThis.open?.(viewerUrl, '_blank', 'noopener,noreferrer');
      return;
    }
    const fileUrl = new URL(url, window.location.origin);
    this.http.get(fileUrl.href, { responseType: 'blob' }).subscribe({
      next: (blob) => {
        const objectUrl = URL.createObjectURL(blob);
        this.present(objectUrl, filename, false);
        setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
      },
      error: () => {
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
