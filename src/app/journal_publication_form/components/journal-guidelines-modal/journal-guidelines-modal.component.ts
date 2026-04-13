import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-journal-guidelines-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './journal-guidelines-modal.component.html',
  styleUrl: './journal-guidelines-modal.component.scss'
})
export class JournalGuidelinesModalComponent {
  isOpen = signal(true);

  open() {
    this.isOpen.set(true);
  }

  close() {
    this.isOpen.set(false);
  }
}
