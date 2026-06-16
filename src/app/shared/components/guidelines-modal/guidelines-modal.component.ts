import { Component, Input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { inject } from '@angular/core';
import { GuidelinesResponse } from '../../../core/interfaces/components.interface';

@Component({
  selector: 'app-guidelines-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './guidelines-modal.component.html',
  styleUrls: ['./guidelines-modal.component.scss']
})
export class GuidelinesModalComponent {
  private http = inject(HttpClient);

  @Input() title = 'Guidelines for Applicants';
  @Input() endpoint = '';

  isOpen = signal(false);
  isLoading = signal(false);
  content = signal('');
  private hasFetched = false;

  open() {
    this.isOpen.set(true);
    if (!this.hasFetched) {
      this.fetchGuidelines();
    }
  }

  close() {
    this.isOpen.set(false);
  }

  private async fetchGuidelines() {
    if (!this.endpoint) {
      this.content.set('<p>No guidelines endpoint provided.</p>');
      return;
    }

    this.isLoading.set(true);
    try {
      // Basic caching logic integrated here
      const res = await this.http.get<GuidelinesResponse>(this.endpoint).toPromise();
      const html = res?.data?.[0]?.rdig_guidelines_content || '<p>No guidelines available at this time.</p>';
      this.content.set(html);
      this.hasFetched = true;
    } catch (err) {
      console.error('Failed to fetch guidelines:', err);
      this.content.set('<p>Error loading guidelines. Please try again later.</p>');
    } finally {
      this.isLoading.set(false);
    }
  }
}
