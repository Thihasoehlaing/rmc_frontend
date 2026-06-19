import { Component, EventEmitter, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-conference-guidelines-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './conference-guidelines-modal.component.html',
  styleUrl: './conference-guidelines-modal.component.scss'
})
export class ConferenceGuidelinesModalComponent {
  @Output() closed = new EventEmitter<void>();
  isOpen = signal(false);

  open() {
    this.isOpen.set(true);
  }

  close() {
    this.isOpen.set(false);
    this.closed.emit();
  }
}
