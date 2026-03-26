import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

let nextId = 0;

@Component({
  selector: 'app-dialog',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dialog.component.html',
  styleUrl: './dialog.component.scss',
})
export class DialogComponent {
  readonly dialogId = ++nextId;

  /** Heading text shown in the dialog header. */
  @Input() title = '';

  /** Controls whether the dialog is visible. */
  @Input() isOpen = false;

  /**
   * Optional max-width override for the inner card.
   * Defaults to 680px. Pass e.g. "900px" for wider dialogs.
   */
  @Input() width: string | null = null;

  /** Emitted when the user clicks the ✕ button or the backdrop. */
  @Output() close = new EventEmitter<void>();

  onOverlayClick(event: MouseEvent): void {
    // Only close when clicking the overlay itself, not the dialog card
    if ((event.target as HTMLElement).classList.contains('modal-overlay')) {
      this.close.emit();
    }
  }
}
