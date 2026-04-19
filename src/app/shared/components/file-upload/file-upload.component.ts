import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-file-upload',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './file-upload.component.html',
  styleUrl: './file-upload.component.scss',
})
export class FileUploadComponent {
  /** Label shown above the upload zone. */
  @Input() label = '';

  /** Accepted MIME / extension string passed to <input accept>. e.g. ".pdf,.docx" */
  @Input() accept = '*';

  /** Maximum file size in megabytes. */
  @Input() maxSizeMB = 10;

  /** Instruction text shown inside the zone. */
  @Input() placeholder = '';

  /** Whether file upload is disabled. */
  @Input() disabled = false;

  /** Emits the valid File object after type + size checks pass, or null if invalid/cleared. */
  @Output() fileSelected = new EventEmitter<File | null>();

  // ── Internal reactive state ────────────────────────────────────
  selectedFileName = signal<string | null>(null);
  errorMsg        = signal<string | null>(null);
  isDragOver      = signal(false);

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
        this.selectedFileName.set(null);
        this.fileSelected.emit(null);
        return;
      }
    }

    // Size check
    if (file.size > this.maxSizeMB * 1024 * 1024) {
      this.errorMsg.set(`File exceeds ${this.maxSizeMB} MB limit.`);
      this.selectedFileName.set(null);
        this.fileSelected.emit(null);
        return;
      }

    this.selectedFileName.set(file.name);
    this.fileSelected.emit(file);
  }

  /** Allow parent to reset the field. */
  reset(): void {
    this.selectedFileName.set(null);
    this.errorMsg.set(null);
    this.fileSelected.emit(null);
  }
}
