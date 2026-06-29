import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { inject } from '@angular/core';
import { GuidelinesResponse } from '../../../core/interfaces/components.interface';

@Component({
  selector: 'app-guidelines-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './guidelines-modal.component.html',
  styleUrls: ['./guidelines-modal.component.scss'],
})
export class GuidelinesModalComponent implements OnChanges {
  private http = inject(HttpClient);

  @Input() title = 'Guidelines for Applicants';
  @Input() endpoint = '';
  @Input() contentOverride: string | null = null;
  @Input() buttonText = 'Close';
  @Output() closed = new EventEmitter<void>();

  isOpen = signal(false);
  isLoading = signal(false);
  content = signal('');
  private hasFetched = false;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['contentOverride'] && this.contentOverride !== null) {
      this.content.set(this.contentOverride || '<p>No guidelines available at this time.</p>');
      this.isLoading.set(false);
    }
  }

  open(): void {
    this.isOpen.set(true);
    if (this.contentOverride !== null) {
      this.content.set(this.contentOverride || '<p>No guidelines available at this time.</p>');
      this.isLoading.set(false);
      return;
    }

    if (!this.hasFetched) {
      this.fetchGuidelines();
    }
  }

  close(): void {
    this.isOpen.set(false);
    this.closed.emit();
  }

  private async fetchGuidelines(): Promise<void> {
    if (!this.endpoint) {
      this.content.set('<p>No guidelines endpoint provided.</p>');
      return;
    }

    this.isLoading.set(true);
    try {
      const res = await this.http.get<GuidelinesResponse>(this.endpoint).toPromise();
      const html =
        res?.data?.[0]?.rdig_guidelines_content || '<p>No guidelines available at this time.</p>';
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
