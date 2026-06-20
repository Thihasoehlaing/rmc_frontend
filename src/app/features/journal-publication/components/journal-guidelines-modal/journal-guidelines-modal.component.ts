import { Component, EventEmitter, Output, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { JournalGuidelinesService } from '../../services/journal-guidelines.service';

@Component({
  selector: 'app-journal-guidelines-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './journal-guidelines-modal.component.html',
  styleUrl: './journal-guidelines-modal.component.scss'
})
export class JournalGuidelinesModalComponent {
  @Output() closed = new EventEmitter<void>();
  isOpen = signal(false);
  private guidelinesService = inject(JournalGuidelinesService);

  journalGuidelines = computed(() => {
    return this.guidelinesService.getActiveBySection('Journal Publication Form', 'General');
  });

  open() {
    this.isOpen.set(true);
  }

  close() {
    this.isOpen.set(false);
    this.closed.emit();
  }
}
