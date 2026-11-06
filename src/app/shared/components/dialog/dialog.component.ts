import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CdkTrapFocus } from '@angular/cdk/a11y';
import { CommonModule } from '@angular/common';

let nextId = 0;

@Component({
  selector: 'app-dialog',
  standalone: true,
  imports: [CommonModule, CdkTrapFocus],
  templateUrl: './dialog.component.html',
  styleUrl: './dialog.component.scss',
})
export class DialogComponent {
  readonly dialogId = ++nextId;

  /** Heading text shown in the dialog header. */
  @Input() title = '';
  @Input() description = '';
  @Input() density: 'comfortable' | 'compact' = 'comfortable';
  @Input() closeDisabled = false;

  /** Controls whether the dialog is visible. */
  @Input() isOpen = false;

  /**
   * Optional max-width override for the inner card.
   * Defaults to 680px. Pass e.g. "900px" for wider dialogs.
   */
  @Input() width: string | null = null;

  /** Optional max-height override for dialogs that need more vertical space. */
  @Input() maxHeight: string | null = null;

  /** Optional explicit height for dialogs with tall interactive content. */
  @Input() height: string | null = null;

  /** Standard dialog width variant. */
  @Input() size: 'small' | 'medium' | 'large' = 'medium';

  /** Emitted when the user clicks the ✕ button or the backdrop. */
  @Output() close = new EventEmitter<void>();

  onEscape(event: Event): void {
    event.stopPropagation();
    if (!this.closeDisabled) this.close.emit();
  }

  onOverlayClick(event: MouseEvent): void {
    // Only close when clicking the overlay itself, not the dialog card
    if (this.closeDisabled) return;
    if ((event.target as HTMLElement).classList.contains('modal-overlay')) {
      this.close.emit();
    }
  }
}
