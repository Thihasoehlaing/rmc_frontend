import { Component, EventEmitter, Input, OnDestroy, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-file-upload',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './file-upload.component.html',
  styleUrl: './file-upload.component.scss',
})
export class FileUploadComponent implements OnDestroy {
  /** Label shown above the upload zone. */
  @Input() label = '';

  /** Accepted MIME / extension string passed to <input accept>. e.g. ".pdf,.docx" */
  @Input() accept = '*';

  /** Maximum file size in megabytes. */
  @Input() maxSizeMB = 4;

  /** Instruction text shown inside the zone. */
  @Input() placeholder = '';

  /** Whether file upload is disabled. */
  @Input() disabled = false;

  /** Existing uploaded filename supplied by a parent form/API hydration. */
  @Input() uploadedFileName: string | null = null;

  /** Existing uploaded file URL supplied by a parent form/API hydration. */
  @Input() uploadedFileUrl: string | null = null;

  /** Emits the valid File object after type + size checks pass, or null if invalid/cleared. */
  @Output() fileSelected = new EventEmitter<any>();

  // ── Internal reactive state ────────────────────────────────────
  selectedFileName = signal<string | null>(null);
  selectedFileUrl  = signal<string | null>(null);
  errorMsg        = signal<string | null>(null);
  isDragOver      = signal(false);

  displayFileName(): string | null {
    return this.selectedFileName() || this.uploadedFileName;
  }

  hasSelectedFile(): boolean {
    return !!this.selectedFileName();
  }

  previewUrl(): string | null {
    return this.selectedFileUrl() || this.uploadedFileUrl;
  }

  canPreviewFile(): boolean {
    return !!this.previewUrl();
  }

  openFilePreview(event?: Event): void {
    event?.preventDefault();
    event?.stopPropagation();
    const url = this.previewUrl();
    if (!url) return;
    globalThis.open?.(url, '_blank', 'noopener,noreferrer');
  }

  removeSelectedFile(event?: Event): void {
    event?.preventDefault();
    event?.stopPropagation();
    this.revokeSelectedFileUrl();
    this.selectedFileName.set(null);
    this.errorMsg.set(null);
    this.fileSelected.emit(null);
  }

  // ── Drag events ───────────────────────────────────────────────
  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.isDragOver.set(true);
  }

  onDragLeave(): void {
    this.isDragOver.set(false);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDragOver.set(false);
    const file = event.dataTransfer?.files?.[0];
    if (file) this.processFile(file);
  }

  // ── Input change ──────────────────────────────────────────────
  onChange(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) this.processFile(file);
    // Reset input so re-selecting same file triggers change again
    (event.target as HTMLInputElement).value = '';
  }

  // ── Validation + emit ─────────────────────────────────────────
  private processFile(file: File): void {
    this.errorMsg.set(null);

    // Type check — only when accept is not wildcard
    if (this.accept && this.accept !== '*') {
      const accepted = this.accept
        .split(',')
        .map(a => a.trim().toLowerCase());

      const ext = '.' + file.name.split('.').pop()?.toLowerCase();
      const mime = file.type.toLowerCase();

      const ok = accepted.some(a =>
        a.startsWith('.') ? a === ext : mime.startsWith(a.replace('*', ''))
      );

      if (!ok) {
        this.errorMsg.set(`Invalid file type. Accepted: ${this.accept}`);
        this.revokeSelectedFileUrl();
        this.selectedFileName.set(null);
        this.fileSelected.emit(null);
        return;
      }
    }

    // Size check
    if (file.size > this.maxSizeMB * 1024 * 1024) {
      this.errorMsg.set(`File exceeds ${this.maxSizeMB} MB limit.`);
      this.revokeSelectedFileUrl();
      this.selectedFileName.set(null);
      this.fileSelected.emit(null);
      return;
    }

    this.revokeSelectedFileUrl();
    this.selectedFileName.set(file.name);
    this.selectedFileUrl.set(this.createPreviewUrl(file));
    this.fileSelected.emit(file);
  }

  /** Allow parent to reset the field. */
  reset(): void {
    this.removeSelectedFile();
  }

  ngOnDestroy(): void {
    this.revokeSelectedFileUrl();
  }

  private createPreviewUrl(file: File): string | null {
    if (typeof URL === 'undefined' || typeof URL.createObjectURL !== 'function') {
      return null;
    }
    try {
      return URL.createObjectURL(file);
    } catch {
      return null;
    }
  }

  private revokeSelectedFileUrl(): void {
    const url = this.selectedFileUrl();
    if (!url) return;
    if (typeof URL !== 'undefined' && typeof URL.revokeObjectURL === 'function') {
      try {
        URL.revokeObjectURL(url);
      } catch {
        // Ignore browser cleanup failures; the UI state should still be cleared.
      }
    }
    this.selectedFileUrl.set(null);
  }
}
