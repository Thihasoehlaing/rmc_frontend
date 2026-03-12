import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-conference-guidelines-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './conference-guidelines-modal.component.html',
  styleUrl: './conference-guidelines-modal.component.scss'
})
export class ConferenceGuidelinesModalComponent {
  isOpen = signal(true);

  close() {
    this.isOpen.set(false);
  }
}
